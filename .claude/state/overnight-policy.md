# Overnight Policy

## Objective
Advance the product safely while I am away.

## Allowed work
- Fix failing tests
- Add tests for existing functionality
- Small bug fixes
- Refactors with tests
- Documentation updates
- Backlog grooming
- UX copy improvements
- Performance cleanup with measurable validation

## Not allowed without explicit daytime approval
- Deleting large subsystems
- Schema migrations in production
- Secrets changes
- Billing logic changes
- Auth/security model changes
- Live deploys to production
- Vendor lock-in changes
- Changes to pricing page claims without evidence
- Destructive data scripts

## Every run must
- Read CLAUDE.md
- Read backlog.md, decisions.md, memory.md, metrics.md
- Create a run plan
- Bound scope to one mission
- Run verification
- Write summary to run-history.md
- Stop if confidence is low

## Stop conditions
- More than 3 failed verification attempts
- More than 25 files changed for one mission
- Test failures increase
- Security-sensitive files touched unexpectedly
- Build time exceeds threshold
- Same error repeated twice without progress
