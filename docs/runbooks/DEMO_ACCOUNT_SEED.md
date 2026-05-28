# DEMO_ACCOUNT_SEED.md

Operational runbook for the Ledgerium AI demo account seed script.

Generated at iter 089 — OP-3 demo account seed (Mode 2, directed, 2026-05-25).

---

## Purpose

`apps/web-app/scripts/seed-demo-account.ts` creates a fully-populated,
deterministic demo environment in the configured database. It is designed to
be run before any product demo and is **safe to re-run** — each invocation
deletes the previous demo data and recreates it from scratch, producing
byte-identical results every time.

---

## Prerequisites

| Requirement | Check |
|---|---|
| Node 20+ | `node --version` |
| pnpm installed | `pnpm --version` |
| Dependencies installed | `pnpm install` (run once from repo root) |
| `DATABASE_URL` set | present in `apps/web-app/.env` |
| Database schema current | run `pnpm --filter @ledgerium/web-app db:push` if in doubt |

The script uses the same `DATABASE_URL` as the running application. For
production demos run against the production database, confirm `DATABASE_URL`
points to the correct target before running.

---

## Running the Script

From the repository root:

```bash
pnpm --filter @ledgerium/web-app seed:demo
```

Or from inside `apps/web-app/`:

```bash
pnpm seed:demo
```

The script logs each step to stdout and exits with code 0 on success, non-zero
on any error.

---

## Environment Variables

All variables are optional. Default values match the demo account credentials
used in product walkthroughs.

| Variable | Default | Purpose |
|---|---|---|
| `DEMO_EMAIL` | `demo@ledgerium.ai` | Login email for the demo user |
| `DEMO_PASSWORD` | `Demo2026!Workspace` | Login password for the demo user |
| `DEMO_WORKSPACE_NAME` | `Acme Operations` | Display name of the demo team workspace |
| `DATABASE_URL` | _(from `.env`)_ | Prisma connection string — must be set |

To override for a specific run:

```bash
DEMO_EMAIL=sales@example.com pnpm --filter @ledgerium/web-app seed:demo
```

---

## Expected Output

A successful run prints lines similar to the following:

```
[demo-seed] Deleting existing demo data for demo@ledgerium.ai...
[demo-seed] No existing demo user found — skipping delete.
[demo-seed] Creating demo user demo@ledgerium.ai...
[demo-seed] Created user <uuid> with team <uuid>
[demo-seed] Seeding workflow 1/6: Invoice Approval Process...
[demo-seed] Seeding workflow 2/6: Sales Lead Qualification...
[demo-seed] Seeding workflow 3/6: Employee Onboarding Checklist...
[demo-seed] Seeding workflow 4/6: Expense Report Submission...
[demo-seed] Seeding workflow 5/6: Customer Support Escalation...
[demo-seed] Seeding workflow 6/6: Vendor Contract Review...
[demo-seed] Done. Demo account seeded in <N>ms.
```

If an existing demo account was found, the delete step will log which records
were removed before recreation.

---

## What Gets Created

| Entity | Count | Details |
|---|---|---|
| User | 1 | `plan: 'team'`, `subscriptionStatus: 'active'`, `isAdmin: false` |
| Team | 1 | `Acme Operations`, user as owner |
| TeamMember | 1 | role `owner`, status `active` |
| ProcessDefinition | 6 | One per workflow, with `intelligenceJson` populated |
| Workflow (sessions) | 6–30 | Multiple sessions per workflow (`sessionCount - 1` extras) |
| WorkflowArtifact (SOP) | 6 | One per workflow, `artifactType: 'sop'` |
| WorkflowArtifact (ProcessMap) | 6 | One per workflow, `artifactType: 'process_map'` |
| ProcessGraph | 6 | One per workflow, with nodes and edges |
| ProcessNode | varies | One per SOP step per workflow |
| ProcessEdge | varies | Sequential edges between nodes |

All timestamps derive from `REFERENCE_TIMESTAMP_MS = 1_716_595_200_000`
(2024-05-25 00:00:00 UTC). No `Date.now()` calls are made during seeding —
results are deterministic across runs and environments.

---

## Verifying the Seed

After running, log in to the application with the demo credentials and confirm:

1. Dashboard shows 6 workflows in the "Acme Operations" workspace.
2. Each workflow card displays a health score and opportunity tag.
3. Opening a workflow shows its SOP artifact.
4. The intelligence panel shows variance and variant data.
5. The column picker exposes statistical columns with data (cycle time, health
   score breakdown, etc.).

You can also query the database directly:

```sql
SELECT email, plan, "subscriptionStatus" FROM "User" WHERE email = 'demo@ledgerium.ai';
SELECT COUNT(*) FROM "Workflow" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'demo@ledgerium.ai');
```

---

## Resetting Between Demos

Re-running the script is the reset mechanism — it is fully idempotent:

```bash
pnpm --filter @ledgerium/web-app seed:demo
```

This deletes ALL demo data (team, workflows, artifacts, process graphs) linked
to the demo email and recreates everything from scratch. No manual cleanup is
required.

If the demo account email was changed via `DEMO_EMAIL`, the old account will
not be deleted automatically. Delete it manually via the admin operations
dashboard at `/admin/operations` or directly via the database.

---

## Troubleshooting

**"No such table" or Prisma schema errors**

Run the schema push before seeding:

```bash
pnpm --filter @ledgerium/web-app db:push
pnpm --filter @ledgerium/web-app seed:demo
```

**"Invalid DATABASE_URL"**

Confirm `apps/web-app/.env` contains a valid `DATABASE_URL`. For SQLite
(local dev):

```
DATABASE_URL="file:./dev.db"
```

**Script exits with a Prisma FK error**

This indicates the deletion order is being disrupted by an unexpected schema
state. Re-run `db:push` to reconcile schema, then re-run the seed script.

**"Password hash mismatch" on login**

The default password is `Demo2026!Workspace`. The hash is recomputed on every
seed run using bcrypt cost factor 12. If login fails, re-run the seed script to
regenerate the hash.

---

## Related Files

| File | Purpose |
|---|---|
| `apps/web-app/scripts/seed-demo-account.ts` | The seed script |
| `apps/web-app/scripts/seed-demo-account.test.ts` | Unit tests (39 `it()` blocks) |
| `apps/web-app/prisma/schema.prisma` | Database schema consumed by the script |
| `docs/runbooks/DEMO_MODE_ENV_VARS.md` | Environment variable reference for demo mode |
| `docs/runbooks/STRIPE_SETUP.md` | Stripe operational setup (separate from demo seed) |
