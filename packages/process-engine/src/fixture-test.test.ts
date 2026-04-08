import { describe, it, expect } from 'vitest';
import { processSession, validateProcessEngineInput } from './index.js';
import type { ProcessEngineInput } from './types.js';
import fs from 'fs';
import path from 'path';

describe('fixture upload compatibility', () => {
  const fixtureDir = path.resolve(__dirname, '../../../fixtures/workflows');
  const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    it(`should process ${file}`, () => {
      const raw = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), 'utf-8'));

      const input: ProcessEngineInput = {
        sessionJson: {
          sessionId: raw.sessionJson.sessionId,
          activityName: raw.sessionJson.activityName,
          startedAt: raw.sessionJson.startedAt,
          ...(raw.sessionJson.endedAt ? { endedAt: raw.sessionJson.endedAt } : {}),
        },
        normalizedEvents: raw.normalizedEvents,
        derivedSteps: raw.derivedSteps,
      };

      const validation = validateProcessEngineInput(input);
      if (!validation.valid) {
        console.log(`${file} validation errors:`, validation.errors);
      }
      expect(validation.valid).toBe(true);

      const output = processSession(input);
      expect(output.processRun).toBeDefined();
      expect(output.processDefinition).toBeDefined();
      expect(output.processMap).toBeDefined();
      expect(output.sop).toBeDefined();
      expect(output.processDefinition.stepDefinitions.length).toBeGreaterThan(0);
    });
  }
});
