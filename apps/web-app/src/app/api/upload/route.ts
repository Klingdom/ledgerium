import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkBundleEvidenceIntegrity } from '@/lib/bundle-evidence-integrity';
import { validateBundle, runProcessEngine, buildWorkflowReportFromOutput, renderAllTemplates } from '@/lib/ingestion';
import { analyzeWorkflowInsights, interpretWorkflow } from '@ledgerium/process-engine';
import { trackServer } from '@/lib/analytics-server';
import { clusterWorkflows } from '@/lib/intelligence';
import { checkRecordingLimit } from '@/lib/feature-gating';
import { UPLOAD_DIR } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import { reportApiError } from '@/lib/api-error-reporting';

async function handlePOST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // ── Plan limit enforcement ──────────────────────────────────────────────
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Plan-aware recording limit (monthly reset, supports all tiers)
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
      detail: `You have used ${limitCheck.used} of ${limitCheck.limit} recordings this month. Upgrade your plan for more.`,
      used: limitCheck.used,
      limit: limitCheck.limit,
    }, { status: 403 });
  }

  try {
    // Row #262: a non-multipart or malformed body makes `formData()` throw.
    // That is the caller's mistake, not a server failure — answer 400, and
    // never echo the parser's message (it can quote the body).
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Request must be a multipart/form-data upload' }, { status: 400 });
    }
    const fileField = formData.get('file');

    // A text field named "file" is a string, not a File: `.name` would be
    // undefined and the `.endsWith` below a TypeError (a 500 for a client input).
    if (typeof fileField === 'string' || fileField === null) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const file = fileField;

    if (!file.name.endsWith('.json')) {
      return NextResponse.json({ error: 'Only JSON files are supported' }, { status: 400 });
    }

    // Enforce maximum file size to prevent memory issues during parsing
    // and process engine execution. 10 MB is generous for workflow JSON.
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large',
        detail: `Maximum file size is 10 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
      }, { status: 413 });
    }

    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'File is not valid JSON' }, { status: 400 });
    }

    // Save raw file to disk
    const uploadDir = path.join(UPLOAD_DIR, userId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const uploadId = crypto.randomUUID();
    const rawPath = path.join(uploadDir, `${uploadId}.json`);
    fs.writeFileSync(rawPath, text, 'utf-8');

    // Validate bundle structure
    const validation = validateBundle(parsed);
    // Row #10: a shape-valid bundle must also have resolvable step evidence.
    const integrity = validation.valid ? checkBundleEvidenceIntegrity(validation.bundle) : null;
    const integrityFailed = integrity !== null && !integrity.ok;

    // Create upload record
    const upload = await db.upload.create({
      data: {
        id: uploadId,
        userId,
        fileName: file.name,
        fileSizeBytes: file.size,
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

    // Failure rule (matches /api/sync): once a body has parsed and been stored,
    // validation, evidence-integrity and processing failures are `upload_failed`
    // (server source - the upload alerts read these). Unparseable/oversized/
    // wrong-type requests, auth and plan-limit refusals are not upload attempts
    // that failed; an unexpected 500 is also counted (below).
    if (!validation.valid) {
      trackServer('upload_failed', { userId, error: 'bundle_validation_failed', errorCount: validation.errors.length, via: 'web' });
      return NextResponse.json({
        error: 'Upload validation failed',
        details: validation.errors,
        uploadId,
      }, { status: 422 });
    }

    // MR-044: session-id disagreement is measured, not rejected — see
    // lib/bundle-evidence-integrity.ts. Counts only; never the ids.
    if (integrity !== null && integrity.sessionIdMismatches > 0) {
      trackServer('bundle_session_id_mismatch', {
        path: 'upload',
        sessionIdMismatches: integrity.sessionIdMismatches,
        rejectedForOtherReasons: !integrity.ok,
      });
    }

    if (integrity !== null && !integrity.ok) {
      trackServer('upload_failed', { userId, error: 'bundle_evidence_integrity_failed', uploadId, via: 'web' });
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

    // Run deterministic process engine
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

      // Row #262: the engine's message can quote recorded content (it is built
      // from the bundle's own values). Full detail goes to the server log and
      // the upload row; the response carries a fixed sentence only.
      trackServer('upload_failed', { userId, error: 'processing_failed', uploadId, via: 'web' });
      console.error('Upload processing failed:', err);
      return NextResponse.json({
        error: 'Processing failed',
        details: ['The recording could not be processed. Check that the file is an unmodified Ledgerium export.'],
        uploadId,
      }, { status: 422 });
    }

    // Build workflow report + insights + templates
    // Each wrapped in try/catch so a failure in one doesn't block the upload
    let workflowReport;
    try {
      workflowReport = buildWorkflowReportFromOutput(processOutput, bundle);
    } catch (err) {
      console.error('Workflow report generation failed (non-blocking):', err);
      workflowReport = null;
    }

    let workflowInsights;
    try {
      workflowInsights = analyzeWorkflowInsights(processOutput);
    } catch (err) {
      console.error('Workflow insights generation failed (non-blocking):', err);
      workflowInsights = null;
    }

    let templateArtifacts: { artifactType: string; contentJson: string }[];
    try {
      templateArtifacts = renderAllTemplates(processOutput);
    } catch (err) {
      console.error('Template rendering failed (non-blocking):', err);
      templateArtifacts = [];
    }

    let interpretation;
    try {
      // Row #110: one clock reading for this request. The engine no longer
      // reads the wall clock itself, so two interpretations of identical
      // evidence are now byte-identical.
      interpretation = interpretWorkflow(processOutput, Date.now());
    } catch (err) {
      console.error('Workflow interpretation failed (non-blocking):', err);
      interpretation = null;
    }

    // Extract metadata
    const { processRun, processMap, processDefinition } = processOutput;
    const toolsUsed = processRun.systemsUsed;
    const confidence = processDefinition.stepDefinitions.length > 0
      ? processDefinition.stepDefinitions.reduce((s: number, d: any) => s + d.confidence, 0) /
        processDefinition.stepDefinitions.length
      : null;

    // Create workflow with artifacts in a transaction
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
              ...(workflowInsights ? [{
                artifactType: 'workflow_insights',
                schemaVersion: '1.0.0',
                contentJson: JSON.stringify(workflowInsights),
              }] : []),
              // Workflow interpretation (Phase 2)
              ...(interpretation ? [{
                artifactType: 'workflow_interpretation',
                schemaVersion: '1.0.0',
                contentJson: JSON.stringify(interpretation),
              }] : []),
              // Template artifacts (6 templates + selection)
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

    // Increment upload count
    await db.user.update({
      where: { id: userId },
      data: { uploadCount: { increment: 1 } },
    });

    // Track server-side
    trackServer('workflow_created', {
      userId,
      workflowId: workflow.id,
      stepCount: processRun.stepCount,
      systemCount: toolsUsed.length,
      durationMs: processRun.durationMs,
      uploadNumber: (user?.uploadCount ?? 0) + 1,
    });

    // Same event + property shape as /api/sync (alerts count source:'server').
    trackServer('workflow_uploaded', {
      userId,
      workflowId: workflow.id,
      stepCount: processRun.stepCount,
      phaseCount: processMap.phases.length,
      systemCount: toolsUsed.length,
      durationMs: processRun.durationMs ?? null,
      confidence: confidence ?? null,
      uploadNumber: (user?.uploadCount ?? 0) + 1,
      via: 'web',
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

  } catch (err) {
    console.error('Upload failed:', err);
    // Row #262: never return `err.message` — it can carry recorded content.
    trackServer('upload_failed', { userId, error: 'internal_error', via: 'web' });
    reportApiError('/api/upload', 500);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiRoute('/api/upload', handlePOST);
