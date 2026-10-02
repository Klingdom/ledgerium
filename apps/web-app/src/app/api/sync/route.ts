import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hashKey } from '@/lib/api-keys';
import { checkBundleEvidenceIntegrity } from '@/lib/bundle-evidence-integrity';
import { validateBundle, runProcessEngine, buildWorkflowReportFromOutput, renderAllTemplates } from '@/lib/ingestion';
import { clusterWorkflows } from '@/lib/intelligence';
import { checkRecordingLimit } from '@/lib/feature-gating';
import { UPLOAD_DIR } from '@/lib/storage';
import { trackServer } from '@/lib/analytics-server';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/sync
 *
 * Extension sync endpoint. Accepts a SessionBundle as a JSON body
 * with API key authentication via Authorization header.
 *
 * This is the counterpart to the extension's uploadBundle() function
 * which POSTs the bundle as application/json.
 */
async function handlePOST(req: NextRequest) {
  // ── Authenticate via API key ──────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header. Use: Bearer ldg_...' },
      { status: 401 },
    );
  }

  const rawKey = authHeader.slice(7); // strip "Bearer "
  if (!rawKey.startsWith('ldg_')) {
    return NextResponse.json(
      { error: 'Invalid API key format' },
      { status: 401 },
    );
  }

  const keyHash = hashKey(rawKey);
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 },
    );
  }

  const userId = apiKey.userId;

  // Update last-used timestamp (fire and forget)
  void db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  // ── Plan-aware recording limit (monthly reset, supports all tiers) ──────
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const limitCheck = await checkRecordingLimit(user);
  if (!limitCheck.allowed) {
    trackServer('plan_limit_hit', {
      userId,
      limit: 'recordings',
      currentUsage: limitCheck.used,
      maxAllowed: limitCheck.limit,
    });
    return NextResponse.json({
      error: 'Recording limit reached',
      code: 'UPGRADE_REQUIRED',
      used: limitCheck.used,
      limit: limitCheck.limit,
    }, { status: 403 });
  }

  // ── Parse and validate bundle ─────────────────────────────────────────────

  // Check Content-Length BEFORE parsing to prevent memory exhaustion.
  // Without this, a 100MB streaming JSON body would be fully loaded into
  // memory before the size check below could reject it.
  const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
  if (contentLength > MAX_PAYLOAD_SIZE) {
    return NextResponse.json({
      error: 'Payload too large',
      detail: `Maximum payload size is 10 MB. Your request declares ${(contentLength / 1024 / 1024).toFixed(1)} MB.`,
    }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body is not valid JSON' }, { status: 400 });
  }

  // Post-parse size check as a safety net (Content-Length can be spoofed or absent).
  const payloadSize = Buffer.byteLength(JSON.stringify(parsed));
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    return NextResponse.json({
      error: 'Payload too large',
      detail: `Maximum payload size is 10 MB. Your payload is ${(payloadSize / 1024 / 1024).toFixed(1)} MB.`,
    }, { status: 413 });
  }

  const validation = validateBundle(parsed);
  // Row #10: a shape-valid bundle must also have resolvable step evidence.
  const integrity = validation.valid ? checkBundleEvidenceIntegrity(validation.bundle) : null;
  const integrityFailed = integrity !== null && !integrity.ok;

  // Save raw JSON to disk
  const uploadId = crypto.randomUUID();
  const uploadDir = path.join(UPLOAD_DIR, userId);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const rawPath = path.join(uploadDir, `${uploadId}.json`);
  fs.writeFileSync(rawPath, JSON.stringify(parsed), 'utf-8');

  // Create upload record
  const sessionId = validation.valid ? validation.bundle.sessionJson.sessionId : undefined;
  await db.upload.create({
    data: {
      id: uploadId,
      userId,
      fileName: sessionId ? `${sessionId}.json` : `sync-${uploadId}.json`,
      fileSizeBytes: Buffer.byteLength(JSON.stringify(parsed)),
      schemaVersion: validation.valid ? (validation.bundle.manifest?.schemaVersion ?? '1.0.0') : null,
      validationStatus: validation.valid && !integrityFailed ? 'valid' : 'invalid',
      // Integrity failures store counts only — never ids from the bundle.
      validationErrors: !validation.valid
        ? JSON.stringify(validation.errors)
        : integrity !== null && !integrity.ok
          ? JSON.stringify({ evidenceIntegrity: { unresolvedSourceRefs: integrity.unresolvedSourceRefs, duplicateEventIds: integrity.duplicateEventIds, sessionIdMismatches: integrity.sessionIdMismatches } })
          : null,
      rawJsonPath: rawPath,
    },
  });

  if (!validation.valid) {
    trackServer('upload_failed', {
      userId,
      error: 'bundle_validation_failed',
      errorCount: validation.errors.length,
    });
    return NextResponse.json({
      error: 'Bundle validation failed',
      details: validation.errors,
      uploadId,
    }, { status: 422 });
  }

  // MR-044: session-id disagreement is measured, not rejected — see
  // lib/bundle-evidence-integrity.ts. Counts only; never the ids.
  if (integrity !== null && integrity.sessionIdMismatches > 0) {
    trackServer('bundle_session_id_mismatch', {
      path: 'sync',
      sessionIdMismatches: integrity.sessionIdMismatches,
      rejectedForOtherReasons: !integrity.ok,
    });
  }

  if (integrity !== null && !integrity.ok) {
    trackServer('upload_failed', {
      userId,
      error: 'bundle_evidence_integrity_failed',
      uploadId,
    });
    // Client input fault (4xx) — deliberately not reported as api_error.
    // Counts only: ids in the bundle are recorded content and are not echoed.
    return NextResponse.json({
      error: 'Bundle evidence integrity check failed',
      unresolvedSourceRefs: integrity.unresolvedSourceRefs,
      duplicateEventIds: integrity.duplicateEventIds,
      sessionIdMismatches: integrity.sessionIdMismatches,
      uploadId,
      // 422, matching this route's shape-validation failures: the body parsed,
      // its content is invalid. 400 is reserved here for unparseable input.
    }, { status: 422 });
  }

  const bundle = validation.bundle;

  // ── Run deterministic process engine ──────────────────────────────────────
  let processOutput;
  try {
    processOutput = runProcessEngine(bundle);
  } catch (err) {
    await db.upload.update({
      where: { id: uploadId },
      data: {
        validationStatus: 'invalid',
        validationErrors: JSON.stringify([String(err)]),
      },
    });

    trackServer('upload_failed', {
      userId,
      error: 'processing_failed',
      uploadId,
    });
    // Row #262: `String(err)` can quote recorded content; log it, don't return it.
    console.error('Sync processing failed:', err);
    return NextResponse.json({
      error: 'Processing failed',
      details: ['The recording could not be processed.'],
      uploadId,
    }, { status: 422 });
  }

  // ── Build report, templates, and store workflow ────────────────────────────
  // Each secondary artifact is wrapped in try-catch so a failure in report
  // generation or template rendering doesn't block workflow creation.
  let workflowReport: Record<string, unknown> | null = null;
  try {
    workflowReport = buildWorkflowReportFromOutput(processOutput, bundle);
  } catch (err) {
    console.warn('Workflow report generation failed (non-blocking):', err);
  }

  let templateArtifacts: Array<{ artifactType: string; contentJson: string }> = [];
  try {
    templateArtifacts = renderAllTemplates(processOutput);
  } catch (err) {
    console.warn('Template rendering failed (non-blocking):', err);
  }

  const { processRun, processMap, processDefinition } = processOutput;
  const toolsUsed = processRun.systemsUsed;
  const confidence = processDefinition.stepDefinitions.length > 0
    ? processDefinition.stepDefinitions.reduce((s: number, d: { confidence: number }) => s + d.confidence, 0) /
      processDefinition.stepDefinitions.length
    : null;

  const workflow = await db.workflow.create({
    data: {
      userId,
      sourceUploadId: uploadId,
      title: processRun.activityName,
      toolsUsed: JSON.stringify(toolsUsed),
      durationMs: processRun.durationMs ?? null,
      stepCount: processRun.stepCount,
      phaseCount: processMap.phases.length,
      confidence: confidence ? Math.round(confidence * 100) / 100 : null,
      status: 'active',
      sessionId: processRun.sessionId,
      artifacts: {
        createMany: {
          data: [
            {
              artifactType: 'process_output',
              schemaVersion: processRun.engineVersion,
              contentJson: JSON.stringify(processOutput),
            },
            // Workflow report is optional — may fail to generate
            ...(workflowReport ? [{
              artifactType: 'workflow_report',
              schemaVersion: '1.0.0',
              contentJson: JSON.stringify(workflowReport),
            }] : []),
            {
              artifactType: 'source_bundle',
              schemaVersion: bundle.manifest?.schemaVersion ?? '1.0.0',
              contentPath: rawPath,
            },
            {
              artifactType: 'sop',
              schemaVersion: processOutput.sop.version,
              contentJson: JSON.stringify(processOutput.sop),
            },
            {
              artifactType: 'process_map',
              schemaVersion: processMap.version,
              contentJson: JSON.stringify(processMap),
            },
            // Template artifacts (6 templates + selection) — may be empty if rendering failed
            ...templateArtifacts.map((ta) => ({
              artifactType: ta.artifactType,
              schemaVersion: '1.0.0',
              contentJson: ta.contentJson,
            })),
          ],
        },
      },
    },
  });

  await db.user.update({
    where: { id: userId },
    data: { uploadCount: { increment: 1 } },
  });

  trackServer('workflow_uploaded', {
    userId,
    workflowId: workflow.id,
    stepCount: processRun.stepCount,
    phaseCount: processMap.phases.length,
    systemCount: toolsUsed.length,
    durationMs: processRun.durationMs ?? null,
    confidence: confidence ?? null,
    uploadNumber: (user.uploadCount ?? 0) + 1,
    source: 'extension_sync',
  });

  // Auto-cluster into process definitions (fire-and-forget)
  void clusterWorkflows(userId).catch((err) => {
    console.error('Auto-clustering failed (non-blocking):', err);
  });

  return NextResponse.json({
    uploadId,
    workflowId: workflow.id,
    title: processRun.activityName,
    stepCount: processRun.stepCount,
    phaseCount: processMap.phases.length,
    toolsUsed,
  }, { status: 201 });
}

export const POST = withApiRoute('/api/sync', handlePOST);
