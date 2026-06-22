# Session Retrospective & Operating Guardrails — 001

**Date:** 2026-06-04
**Type:** Self-improvement / meta-review. **No product code changed.**
**Trigger:** A multi-day session in which production broke twice, data was lost and recovered, and root-cause was repeatedly guessed wrong.

---

## Honest state (reality, not the governance narrative)
- **Real #1 issue:** the production "flash → unstyled client-side exception" crash is **UNSOLVED**. It is environment-level (not reproducible from the repo); it needs a live browser console error + network-404 check from a flashing instance. The site is currently safe on a restored Hostinger snapshot.
- A deploy driven from this session caused **database loss** (recovered via VPS snapshot).
- The elaborate improvement-loop narrative (iter 074+, "all release blockers closed," 2350 tests, MR-018) was **disconnected from the lived reality** — none of it caught or fixed the actual P0 production bug.

## Root causes (assistant failures — owned)
1. **Deployed to prod on an assumption, not proof.** No real-browser verification of the deployed artifact.
2. **Guessed root cause repeatedly** (theme/auth → umami → caching → "reverted your fix") — all wrong — instead of getting evidence first.
3. **Recommended a rollback with no DB backup** → silent data loss via `prisma db push --accept-data-loss`.
4. **Declared "fixed" without proof.** False confidence.
5. **Optimized ceremony over the one metric that mattered:** a working production site.

## Binding guardrails (going forward)
1. **No deploy without all three:** (a) a **real-browser runtime smoke gate passes** (the Playwright hydration smoke built this session: `apps/web-app/playwright.smoke.config.ts` + `e2e/smoke/hydration.smoke.spec.ts`); (b) a **DB backup taken and verified**; (c) **verified on a staging/throwaway instance first**. Never straight to prod.
2. **Evidence before hypothesis.** On any regression, obtain the actual error/repro FIRST (console + network tab). At most **one** unverified guess, then stop and request evidence. No "try this / try that."
3. **Revert-first on regressions.** Generalize the existing Extension Reliability "revert-first" rule to the web-app: when the user reports "worked before, broke now," `git log -p` the suspect files and revert before redesigning.
4. **Build-passing ≠ working.** typecheck / unit tests / `next build` cannot certify runtime. Hydration, static-asset, and proxy failures are runtime-only. A **browser-level gate is the validation of record** for any user-facing deploy.
5. **Honesty over confidence.** State uncertainty explicitly. Never say "fixed" without a passing gate or a reproduction. A wrong confident answer costs more than an honest "I don't know yet."
6. **Re-prioritize to reality.** The production flash is the real P0 and **outranks all parked feature design** (skill.md, SOP→HTML, custom templates, process clustering) until it is solved with evidence. Governance ceremony does not substitute for a working site.

## Action taken this cycle
Codified the guardrails above. No product code touched. The `demo/deploy-2view` candidate remains parked and will not redeploy.

## Next best step (when the user is ready)
Solve the flash properly, evidence-first: capture the live **console error + network 404 check** from a flashing **staging** instance → reproduce locally → fix → prove with the smoke gate → only then deploy (backup first).
