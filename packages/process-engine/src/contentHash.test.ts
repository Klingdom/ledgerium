import { describe, it, expect } from 'vitest';
import {
  computeContentHash,
  serializeSOPContentForHash,
  computeSOPContentHash,
  type SOPContentForHash,
} from './contentHash.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function baseContent(): SOPContentForHash {
  return {
    title: 'Log a Sales Opportunity',
    purpose: 'Record a new opportunity in the CRM after a qualifying call.',
    scope: 'Single opportunity entry',
    steps: [
      {
        ordinal: 1,
        title: 'Open Opportunities',
        action: 'Navigate to Opportunities',
        expectedOutcome: 'Opportunities list is shown',
        instructions: [
          { instruction: 'Click the Opportunities tab' },
          { instruction: 'Wait for the list to load' },
        ],
      },
      {
        ordinal: 2,
        title: 'Save Opportunity',
        action: 'Fill fields and save',
        expectedOutcome: 'Opportunity saved and visible',
        instructions: [
          { instruction: 'Enter value in "Amount"' },
          { instruction: 'Click "Save"' },
        ],
      },
    ],
  };
}

// ─── computeContentHash (generic) ────────────────────────────────────────────

describe('computeContentHash', () => {
  it('is deterministic — same input twice produces an identical hash', () => {
    const input = 'a stable serialized string';
    expect(computeContentHash(input)).toBe(computeContentHash(input));
  });

  it('is sensitive — a single-character change produces a different hash', () => {
    expect(computeContentHash('hello')).not.toBe(computeContentHash('hellp'));
  });

  it('produces a 16-hex-char string', () => {
    const hash = computeContentHash('anything');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('hashes the empty string without throwing', () => {
    expect(computeContentHash('')).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ─── serializeSOPContentForHash ──────────────────────────────────────────────

describe('serializeSOPContentForHash', () => {
  it('is deterministic — same content produces an identical serialization', () => {
    expect(serializeSOPContentForHash(baseContent())).toBe(
      serializeSOPContentForHash(baseContent()),
    );
  });

  it('produces different output when step order or content differs', () => {
    const a = serializeSOPContentForHash(baseContent());
    const reordered = baseContent();
    reordered.steps = [reordered.steps[1]!, reordered.steps[0]!];
    expect(serializeSOPContentForHash(reordered)).not.toBe(a);
  });
});

// ─── computeSOPContentHash (integration of the two above) ───────────────────

describe('computeSOPContentHash', () => {
  it('is deterministic — same content object (by value) hashes identically', () => {
    expect(computeSOPContentHash(baseContent())).toBe(computeSOPContentHash(baseContent()));
  });

  it('changes when the title changes', () => {
    const a = computeSOPContentHash(baseContent());
    const b = computeSOPContentHash({ ...baseContent(), title: 'Different Title' });
    expect(a).not.toBe(b);
  });

  it('changes when the purpose changes', () => {
    const a = computeSOPContentHash(baseContent());
    const b = computeSOPContentHash({ ...baseContent(), purpose: 'Different purpose entirely.' });
    expect(a).not.toBe(b);
  });

  it('changes when the scope changes', () => {
    const a = computeSOPContentHash(baseContent());
    const b = computeSOPContentHash({ ...baseContent(), scope: 'Different scope.' });
    expect(a).not.toBe(b);
  });

  it('changes when a step title changes', () => {
    const a = computeSOPContentHash(baseContent());
    const mutated = baseContent();
    mutated.steps[0]!.title = 'A Different Step Title';
    expect(computeSOPContentHash(mutated)).not.toBe(a);
  });

  it('changes when a step action changes', () => {
    const a = computeSOPContentHash(baseContent());
    const mutated = baseContent();
    mutated.steps[0]!.action = 'A different action';
    expect(computeSOPContentHash(mutated)).not.toBe(a);
  });

  it('changes when a step expectedOutcome changes', () => {
    const a = computeSOPContentHash(baseContent());
    const mutated = baseContent();
    mutated.steps[1]!.expectedOutcome = 'A different expected outcome';
    expect(computeSOPContentHash(mutated)).not.toBe(a);
  });

  it('changes when an instruction changes', () => {
    const a = computeSOPContentHash(baseContent());
    const mutated = baseContent();
    mutated.steps[0]!.instructions = [{ instruction: 'Click a totally different element' }];
    expect(computeSOPContentHash(mutated)).not.toBe(a);
  });

  it('changes when the number of steps changes', () => {
    const a = computeSOPContentHash(baseContent());
    const mutated = baseContent();
    mutated.steps = [mutated.steps[0]!];
    expect(computeSOPContentHash(mutated)).not.toBe(a);
  });

  it('is stable against fields that are not part of its input (e.g. an id-like field the caller does not pass)', () => {
    // computeSOPContentHash only ever accepts the fields declared on
    // SOPContentForHash — there is no sopId/generatedAt/version channel for
    // callers to (mis)use. Two calls with identical declared content but
    // different call sites still hash identically.
    const content = baseContent();
    const hashFromCallSiteA = computeSOPContentHash(content);
    const hashFromCallSiteB = computeSOPContentHash({ ...content });
    expect(hashFromCallSiteA).toBe(hashFromCallSiteB);
  });
});
