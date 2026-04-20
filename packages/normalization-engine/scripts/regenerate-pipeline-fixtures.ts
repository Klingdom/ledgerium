/**
 * Fixture regeneration script for full-pipeline golden tests.
 *
 * Run from the repo root:
 *   npx tsx packages/normalization-engine/scripts/regenerate-pipeline-fixtures.ts
 *
 * What it does:
 *   1. Reads raw .ndjson files from fixtures/golden/raw/
 *   2. Runs normalizeSession() on each
 *   3. Writes normalized CanonicalEvent[] to fixtures/golden/normalized/ (with
 *      event_id replaced by sourceEventId for determinism)
 *   4. Projects normalized events to SegmentableEvent[] and runs segmentEvents()
 *   5. Writes DerivedStep[] to fixtures/golden/pipeline-segmentation/
 *
 * When to run:
 *   - After a change to NORMALIZATION_RULE_VERSION or normalizer logic
 *   - After a change to SEGMENTATION_RULE_VERSION or segmenter rules
 *   - When adding a new fixture (create the raw .ndjson file first, then run this)
 *
 * After running, commit the updated fixture files alongside the rule change.
 * Never regenerate to suppress a test failure without understanding why the
 * output changed — escalate to the coordinator if unexpected.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import { normalizeSession } from '../src/normalizer.js'
import type { RawEvent, CanonicalEvent } from '../src/normalizer.js'
import { segmentEvents } from '../../segmentation-engine/src/batch-segmenter.js'
import type { SegmentableEvent } from '../../segmentation-engine/src/types.js'

const ROOT = process.cwd()
const FIXTURES_ROOT = join(ROOT, 'packages/normalization-engine/fixtures/golden')
const RAW_DIR = join(FIXTURES_ROOT, 'raw')
const NORM_DIR = join(FIXTURES_ROOT, 'normalized')
const SEG_DIR = join(FIXTURES_ROOT, 'pipeline-segmentation')
const SESSION = 'test-pipeline-golden'

mkdirSync(NORM_DIR, { recursive: true })
mkdirSync(SEG_DIR, { recursive: true })

const rawFiles = readdirSync(RAW_DIR).filter((f) => f.endsWith('.ndjson'))

for (const file of rawFiles) {
  const name = basename(file, '.ndjson')
  const raw = readFileSync(join(RAW_DIR, file), 'utf-8')
  const rawEvents: RawEvent[] = raw.trim().split('\n').map((line) => JSON.parse(line))

  const normResult = normalizeSession(rawEvents)
  const normalized: CanonicalEvent[] = normResult.events.map((e) => ({
    ...e,
    event_id: e.normalization_meta.sourceEventId,
  }))

  const segmentable: SegmentableEvent[] = normalized.map((e) => {
    const se: SegmentableEvent = {
      event_id: e.event_id,
      session_id: e.session_id,
      t_ms: e.t_ms,
      event_type: e.event_type,
      normalization_meta: { sourceEventType: e.normalization_meta.sourceEventType },
    }
    if (e.page_context !== undefined) {
      se.page_context = {
        domain: e.page_context.domain,
        routeTemplate: e.page_context.routeTemplate,
        applicationLabel: e.page_context.applicationLabel,
        pageTitle: e.page_context.pageTitle,
      }
    }
    if (e.target_summary !== undefined) {
      se.target_summary = {}
      if (e.target_summary.label !== undefined) se.target_summary.label = e.target_summary.label
      if (e.target_summary.role !== undefined) se.target_summary.role = e.target_summary.role
      if (e.target_summary.elementType !== undefined) se.target_summary.elementType = e.target_summary.elementType
      if (e.target_summary.selector !== undefined) se.target_summary.selector = e.target_summary.selector
    }
    if (e.annotation_text !== undefined) se.annotation_text = e.annotation_text
    return se
  })

  const { steps } = segmentEvents(segmentable, SESSION)

  writeFileSync(join(NORM_DIR, `${name}.json`), JSON.stringify(normalized))
  writeFileSync(join(SEG_DIR, `${name}.json`), JSON.stringify(steps))

  const warnings = normResult.warnings.length > 0 ? ` (${normResult.warnings.length} warnings)` : ''
  console.log(`${name}: ${normalized.length} normalized events → ${steps.length} steps${warnings}`)
}

console.log('\nDone. Commit the updated fixture files alongside your rule change.')
