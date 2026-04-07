import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { validateBundle, runProcessEngine, buildWorkflowReportFromOutput } from '@/lib/ingestion';
import { analyzeWorkflowInsights } from '@ledgerium/process-engine';
import { clusterWorkflows } from '@/lib/intelligence';
import { UPLOAD_DIR } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.json')) {
      return NextResponse.json({ error: 'Only JSON files are supported' }, { status: 400 });
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

    // Create upload record
    const upload = await db.upload.create({
      data: {
        id: uploadId,
        userId,
        fileName: file.name,
        fileSizeBytes: file.size,
        schemaVersion: validation.valid ? (validation.bundle.manifest?.schemaVersion ?? '1.0.0') : null,
        validationStatus: validation.valid ? 'valid' : 'invalid',
        validationErrors: validation.valid ? null : JSON.stringify(validation.errors),
        rawJsonPath: rawPath,
      },
    });

    if (!validation.valid) {
      return NextResponse.json({
        error: 'Upload validation failed',
        details: validation.errors,
        uploadId,
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

      return NextResponse.json({
        error: 'Processing failed',
        details: [String(err)],
        uploadId,
      }, { status: 422 });
    }

    // Build workflow report + insights
    const workflowReport = buildWorkflowReportFromOutput(processOutput, bundle);
    const workflowInsights = analyzeWorkflowInsights(processOutput);

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
              {
                artifactType: 'workflow_report',
                schemaVersion: '1.0.0',
                contentJson: JSON.stringify(workflowReport),
              },
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
              {
                artifactType: 'workflow_insights',
                schemaVersion: '1.0.0',
                contentJson: JSON.stringify(workflowInsights),
              },
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
