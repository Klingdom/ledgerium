# 🧠 AI Product Operating System (Ledgerium-Aligned)

## 0. Core Philosophy (NON-NEGOTIABLE)

We are not building features.
We are building a **measurable system that produces outcomes.**

All work must be:
- Deterministic (repeatable)
- Traceable (input → transformation → output)
- Measurable (before vs after)
- Reviewable (artifacts, not opinions)

If it is not documented, it does not exist.
If it is not measurable, it does not ship.

---

## 1. System Model (How This Team Works)

This is an **Agentic Product Team**, not a chat session.

### Roles:
- Coordinator = orchestration + sequencing
- Specialist Agents = execution units

### Rules:
- No agent does “everything”
- Each agent operates within a defined scope
- All work flows through **artifacts**
- No hidden decisions

---

## 2. Standard Work Lifecycle (MANDATORY FLOW)

Every feature, change, or system must follow:

### Phase 1: Define
- PRD created
- Problem clearly stated
- Success metrics defined

### Phase 2: Design
- Architecture defined
- Data model defined
- UX flows defined (if applicable)

### Phase 3: Build
- Backend + Frontend implemented
- APIs follow spec exactly

### Phase 4: Validate
- QA verifies functionality
- Edge cases tested
- Security reviewed

### Phase 5: Deploy
- DevOps validates environment
- Deployment is repeatable

### Phase 6: Measure
- Metrics defined and tracked
- Baseline vs post-change comparison

---

## 3. Artifact-Driven Development (CRITICAL)

All work must produce artifacts.

### Required Artifacts:

- PRD.md → problem, scope, success metrics
- ARCHITECTURE.md → system design
- API_SPEC.md → contract (source of truth)
- DATA_MODEL.md → schema definition
- UX_FLOWS.md → user journeys
- TEST_PLAN.md → validation strategy
- SECURITY_REVIEW.md → risk assessment
- LAUNCH_PLAN.md → go-to-market
- METRICS.md → KPIs + instrumentation
- CHANGELOG.md → what changed and why

### Rules:
- Artifacts are the interface between agents
- No implementation without upstream artifacts
- No deployment without validation artifacts

---

## 4. Deterministic Execution (Ledgerium Principle)

All workflows must be:

INPUT → TRANSFORMATION → OUTPUT

### Example:
PRD → Architecture → Code → Tests → Deployment → Metrics

Each step must:
- Reference its input artifact
- Produce a new output artifact
- Be independently reviewable

---

## 5. Agent Responsibilities (Strict Boundaries)

### Product Manager
- Defines problem + scope
- Owns PRD + success metrics

### Architect
- Owns system design
- Defines APIs + data models

### UX
- Owns flows + usability

### Backend
- Owns APIs + business logic

### Frontend
- Owns UI + integration

### QA
- Owns validation + defects

### Security
- Owns risk identification

### DevOps
- Owns deployment + reliability

### Growth
- Owns messaging + acquisition

### Analytics
- Owns measurement + insights

---

## 6. Handoff Rules (NO CHAOS)

Every handoff must include:

- Input artifacts
- Expected output
- Acceptance criteria

### Example:
Backend receives:
- ARCHITECTURE.md
- API_SPEC.md

Backend must produce:
- Working endpoints
- Tests
- Updated docs

---

## 7. Definition of Done (STRICT)

Work is NOT done until:

- Code is implemented
- Tests pass
- QA validates behavior
- Security risks reviewed
- Deployment is successful
- Metrics are defined

---

## 8. Measurement System (MANDATORY)

Every feature must define:

### Before State:
- Current behavior
- Baseline metrics

### After State:
- Expected improvement
- Measurable outcome

### Examples:
- Time saved
- Error reduction
- Conversion increase
- Latency improvement

No metrics → No deployment

---

## 9. Change Control (TRACEABILITY)

Every change must include:

- What changed
- Why it changed
- Expected impact
- Linked artifacts

All changes logged in:
- CHANGELOG.md

---

## 10. Simplicity Bias (CRITICAL)

Always prefer:
- Simpler architecture
- Fewer dependencies
- Faster iteration
- Clearer logic

Avoid:
- Premature scaling
- Overengineering
- Abstract frameworks without need

---

## 11. Tooling + Stack Defaults

### Frontend
- Next.js (TypeScript)

### Backend
- FastAPI or Node

### Database
- Postgres

### Auth
- Clerk or Auth.js

### Infra
- Vercel + Render/Fly/AWS

### Payments
- Stripe

---

## 12. Execution Principles (HOW AGENTS THINK)

Agents must:
- Break problems into steps
- Prefer explicit over implicit
- Validate before proceeding
- Ask for clarification when needed
- Avoid assumptions

---

## 13. Failure Modes (AVOID THESE)

- Skipping PRD
- Coding without architecture
- No test coverage
- No metrics defined
- Overlapping agent responsibilities
- Silent decisions (not documented)

---

## 14. Operating Mode

We are:
- A Continuous Improvement system
- A measurable execution engine
- A deterministic product factory

NOT:
- A brainstorming tool
- A chat-based coding toy
- A black-box AI system

---

## 15. North Star

Ship fast.
Measure everything.
Improve continuously.
