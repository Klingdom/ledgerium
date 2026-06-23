import { describe, it, expect } from 'vitest';
import { runProcessEngine } from '@/lib/ingestion';
import { ADDITIONAL_SAMPLE_WORKFLOWS, buildBundleFromSpec } from './sample-workflow';

/**
 * The 3 additional sample workflows (Refund / Onboard Vendor / Payroll Close)
 * must process cleanly through the real process engine — they're seeded into
 * every new account at signup, so a failure here would silently leave new users
 * with a sparser library than the product demo shows.
 */
describe('additional sample workflows seed through the process engine', () => {
  it('exposes the 3 expected workflows', () => {
    expect(ADDITIONAL_SAMPLE_WORKFLOWS.map((w) => w.title)).toEqual([
      'Process Customer Refund (Sample)',
      'Onboard New Vendor (Sample)',
      'Monthly Payroll Close (Sample)',
    ]);
  });

  for (const spec of ADDITIONAL_SAMPLE_WORKFLOWS) {
    it(`${spec.title} produces a valid process output`, () => {
      const output = runProcessEngine(buildBundleFromSpec(spec));

      // One step definition per observed step (engine consumes provided derivedSteps).
      expect(output.processDefinition.stepDefinitions.length).toBe(spec.steps.length);
      expect(output.processRun.stepCount).toBe(spec.steps.length);

      // Every distinct system in the spec is surfaced on the process map.
      const expectedSystems = [...new Set(spec.steps.map((s) => s.system))];
      for (const sys of expectedSystems) {
        expect(output.processMap.systems).toContain(sys);
      }

      // SOP artifact is generated.
      expect(output.sop).toBeDefined();
    });

    it(`${spec.title} is deterministic across runs`, () => {
      const a = runProcessEngine(buildBundleFromSpec(spec));
      const b = runProcessEngine(buildBundleFromSpec(spec));
      expect(JSON.stringify(a.processDefinition.stepDefinitions)).toBe(
        JSON.stringify(b.processDefinition.stepDefinitions),
      );
    });
  }
});
