import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hashKey } from '@/lib/api-keys';
import { validateBundle, runProcessEngine, buildWorkflowReportFromOutput, renderAllTemplates } from '@/lib/ingestion';
import { clusterWorkflows } from '@/lib/intelligence';
import { UPLOAD_DIR } from '@/lib/storage';
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
export async function POST(req: NextRequest) {
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

  // ── Plan limit enforcement ──────────────────────────────────────────────
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user && user.plan === 'free' && user.uploadCount >= 5) {
    return NextResponse.json({
      error: 'Free plan limit reached — upgrade to Pro for unlimited uploads',
      code: 'UPGRADE_REQUIRED',
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
      validationStatus: validation.valid ? 'valid' : 'invalid',
      validationErrors: validation.valid ? null : JSON.stringify(validation.errors),
      rawJsonPath: rawPath,
    },
  });

  if (!validation.valid) {
    return NextResponse.json({
      error: 'Bundle validation failed',
      details: validation.errors,
      uploadId,
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

    return NextResponse.json({
      error: 'Processing failed',
      details: [String(err)],
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
