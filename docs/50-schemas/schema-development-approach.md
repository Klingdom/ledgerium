You are a senior software engineer and technical reviewer working on the Ledgerium AI codebase.

Your task is to review, update, validate, and harden the CURRENT Event Data Schema implementation so it fully aligns with the CURRENT documentation in the GitHub /docs folder.

You are not starting from scratch.
You must treat the existing codebase as the implementation baseline and the documentation as the source of truth.

PRIMARY OBJECTIVE

Audit the existing Event Data Schema code and all related usage across the Ledgerium AI codebase, identify all gaps, inconsistencies, missing fields, malformed structures, privacy violations, validation weaknesses, type drift, schema drift, and architectural mismatches, then update the codebase so the Event Data Schema is fully aligned with the documented requirements.

After making changes, you must test the final code for:
- schema completeness
- privacy compliance
- deterministic structure
- compatibility with current recorder behavior
- compatibility with downstream deterministic processing
- export integrity
- validation correctness
- type safety
- feature completeness relative to the docs

SOURCE OF TRUTH

You must use the markdown files in the GitHub /docs folder as the governing specification.
Treat them as authoritative in the following general order unless a more explicit authority model exists in the repo:

1. /docs/00-foundation/foundation_overview.md
2. trust and privacy related docs in /docs/00-foundation or /docs/60-rules
3. schema docs in /docs/50-schemas
4. recorder docs in /docs/20-recorder
5. engine docs in /docs/30-engine
6. intelligence docs in /docs/40-intelligence
7. engineering rules in /docs/60-rules
8. architecture decisions in /docs/70-decisions
9. task or work docs in /docs/80-work

If a doc-authority-model.md exists, use that instead and follow it strictly.

PRIMARY DOCUMENTS TO REVIEW CAREFULLY

At minimum, review all docs relevant to schema design and usage, especially:
- /docs/50-schemas/event-schema-overview.md
- /docs/00-foundation/foundation_overview.md
- /docs/10-product/product-overview.md
- /docs/20-recorder/recorder-overview.md
- any event-capture-spec.md if present
- /docs/30-engine/deterministic-process-engine.md
- /docs/40-intelligence/process-intelligence-layer.md
- /docs/60-rules/engineering-rules.md
- /docs/70-decisions/architecture-decisions.md

NON-NEGOTIABLE RULES

You must not invent schema behavior that conflicts with the docs.
You must not add surveillance-style fields.
You must not permit fields that store typed values, document content, clipboard contents, email bodies, chat content, or screenshots.
You must preserve privacy-first architecture.
You must preserve deterministic structure and semantics.
You must preserve schema discipline across all producers and consumers.
You must not quietly ignore gaps between docs and code.
You must explicitly surface mismatches and then resolve them through code updates or clearly documented findings.

OPERATING MODE

Work in this sequence:

PHASE 1 — DOCUMENT REVIEW
1. Read the relevant docs in /docs.
2. Build a schema requirements map from the docs.
3. Extract:
   - top-level event requirements
   - required and optional fields
   - allowed event categories
   - allowed event types if documented
   - application/context/target/outcome/timing/privacy object requirements
   - normalization rules
   - privacy constraints
   - validation requirements
   - versioning or extensibility expectations
   - downstream compatibility constraints from recorder, engine, and intelligence layer docs
4. Identify requirement IDs if present.
5. If no requirement IDs exist, create a temporary internal requirement map using doc path + heading references.

PHASE 2 — CODEBASE AUDIT
Review the current codebase and determine:
- where the Event Data Schema is defined
- whether there are multiple conflicting schema definitions
- whether TypeScript interfaces, runtime validators, JSON schemas, serializers, exporters, and tests are aligned
- how recorder code emits events
- how downstream code consumes events
- whether validation is compile-time only or also runtime
- whether privacy constraints are enforced in schema-producing paths
- whether schema drift exists between modules
- whether deprecated or stale fields are still being emitted
- whether optional fields are being overused or inconsistently handled
- whether event ordering and timestamps are enforced consistently
- whether sanitization-related fields are present and meaningful
- whether exported JSON matches docs
- whether schema names align with docs

PHASE 3 — GAP ANALYSIS
Produce a structured gap analysis:
- what is implemented correctly
- what is partially implemented
- what is missing
- what violates docs
- what violates privacy principles
- what introduces ambiguity
- what downstream code would break if schema is corrected
- what should be refactored vs rewritten

PHASE 4 — IMPLEMENTATION PLAN
Before changing code, create a concrete engineering plan that maps:
- documented schema requirement
- affected files/modules
- implementation approach
- migration or compatibility considerations
- validation/test approach

PHASE 5 — CODE UPDATES
Update the codebase to bring the Event Data Schema into alignment with the docs.
You may refactor, replace, add, or remove code where necessary.
Favor correctness, privacy, strictness, consistency, modularity, and maintainability over preserving flawed code.

PHASE 6 — TESTING AND VALIDATION
Run and/or create tests to validate:
- schema type definitions
- runtime validation behavior
- required field enforcement
- allowed enum/category/type enforcement
- privacy field guarantees
- sanitization expectations
- deterministic event shape
- compatibility with recorder-produced events
- compatibility with exported session JSON
- compatibility with deterministic engine inputs
- rejection of forbidden or malformed payloads
- ordering/sequence assumptions
- timestamps and timing shape
- optional field handling
- backwards compatibility only if justified and documented

PHASE 7 — FINAL REPORT
Provide a final implementation report with:
- summary of changes
- files changed
- requirements satisfied
- tests executed
- remaining risks
- doc ambiguities
- recommended next steps

KEY IMPLEMENTATION EXPECTATIONS

The Event Data Schema should align with the docs and support, at minimum, these capabilities if required by the docs:

1. TOP-LEVEL EVENT CONTRACT
Events should include an appropriate normalized top-level structure such as:
- id
- sessionId
- timestamp
- sequence
- eventType
- category
- application
- context
- target
- outcome
- timing
- privacy

Do not assume these exact fields are optional or required without checking docs, but the final structure must align with documented intent.

2. PRIVACY-SAFE STRUCTURE
The schema must support structured workflow evidence while preventing storage of:
- typed input values
- textarea values
- contenteditable text
- password data
- clipboard contents
- full page text
- document content
- email content
- chat content
- raw DOM dumps
- screenshots/video references if not allowed by docs

3. CONTEXT MODEL
Context-related fields should support:
- sanitized URL or route representation
- safe page title handling
- tab/session linkage
- application/domain awareness
without leaking sensitive user content.

4. TARGET MODEL
Target-related fields should support:
- element type
- role
- sanitized label
- stable selector or selector fingerprint
- interaction type
without unsafe DOM text extraction.

5. OUTCOME MODEL
Outcome-related fields should support:
- status
- type
- object
- action
or other documented equivalents,
with deterministic semantics.

6. TIMING MODEL
Timing-related fields should support:
- sequencing
- since-previous timing
- durations where applicable
with non-negative and deterministic handling.

7. PRIVACY MODEL
Privacy-related fields should support:
- explicit indication that sanitization occurred
- redaction metadata where needed
- guarantees that user content is not stored

8. ENUMS / ALLOWED VALUES
If docs define categories or event types, enforce them consistently across:
- TypeScript types
- runtime validators
- exporters
- tests

9. RUNTIME VALIDATION
Do not rely only on TypeScript types.
Add or strengthen runtime validation so malformed events can be detected and rejected or normalized safely.

10. DOWNSTREAM COMPATIBILITY
The schema must be usable by:
- recorder output
- session export
- deterministic engine
- process intelligence layer
without ambiguity.

WHAT TO LOOK FOR SPECIFICALLY IN THE CURRENT CODEBASE

Please specifically inspect for these common problems:
- multiple conflicting Event interfaces/types
- recorder emitting fields not in docs
- docs requiring fields not emitted in code
- missing sequence handling
- missing privacy object
- malformed timing object
- inconsistent eventType/category values across modules
- target labels sourced unsafely from raw text
- context URLs stored unsanitized
- query params and hashes leaking into schema
- fields with ambiguous null vs undefined handling
- stale legacy fields from earlier recorder versions
- exporters bypassing validators
- tests validating old schema shapes
- compile-time types disagreeing with runtime validators
- missing schema versioning hooks if needed
- over-flexible types like any or open-ended records
- downstream code depending on undocumented fields

REQUIRED OUTPUT FORMAT

Use this format exactly:

A. DOCUMENTS REVIEWED
List the docs reviewed and the sections most relevant to schema implementation.

B. SCHEMA REQUIREMENTS MAP
List the extracted requirements grouped by:
- top-level event shape
- privacy
- context
- target
- outcome
- timing
- validation
- downstream compatibility
- testing

C. CODEBASE AUDIT
Describe the current state of the schema implementation and major findings.

D. GAP ANALYSIS
For each major gap:
- requirement or doc reference
- current behavior
- needed change
- priority

E. IMPLEMENTATION PLAN
Map requirements to code changes and files.

F. CODE CHANGES
Show the actual code/file updates.
Prefer complete file outputs or clearly scoped diffs with file paths.

G. TEST PLAN
List all tests added or run, including unit, integration, validation, and compatibility checks.

H. TEST RESULTS
Report actual results. If something could not be tested, say so explicitly.

I. FINAL COMPLIANCE CHECK
For each key schema requirement area, state:
- compliant
- partially compliant
- non-compliant
with explanation

J. REMAINING RISKS / FOLLOW-UPS
List any unresolved issues, doc ambiguities, migration concerns, or recommended next steps.

TESTING REQUIREMENTS

You must do real validation, not just claim correctness.
At minimum, perform as many of the following as possible in the current environment:

1. Static validation
- TypeScript compile or type checking
- linting if configured
- import/path sanity checks

2. Runtime validation tests
- valid events accepted
- malformed events rejected
- missing required fields rejected
- forbidden fields rejected or ignored if that is the intended strategy
- invalid enum values rejected
- unsafe URL/context rejected or normalized
- unsafe target labels rejected or normalized

3. Compatibility tests
- recorder-produced events match schema
- exported session JSON includes compliant events
- deterministic engine can consume schema output
- downstream intelligence layer assumptions still hold

4. Privacy validation
Prove that:
- input values are not represented in schema
- long text is not accepted where forbidden
- password-related fields cannot leak into event payloads
- URLs are sanitized
- labels are safely filtered
- privacy metadata is present and meaningful if required by docs

5. Determinism validation
Given repeated equivalent event objects, normalization/validation results should remain consistent.

WHEN DOCS ARE UNCLEAR

If documentation is ambiguous:
- do not guess silently
- choose the most privacy-preserving interpretation
- document the ambiguity in the final report
- implement the safest compliant behavior unless the ambiguity blocks essential schema design

WHEN CODE CONFLICTS WITH DOCS

If code conflicts with docs:
- docs win
- update code accordingly
- explicitly note the conflict and resolution

WHEN DOCS CONFLICT WITH EACH OTHER

If docs conflict:
1. follow the explicit doc authority model if present
2. otherwise prioritize foundation, privacy, schema, recorder, engineering rules, then lower-level docs
3. document the conflict clearly in the final report

DEFINITION OF DONE

This task is only done when:
- the Event Data Schema has been reviewed against the docs
- key schema gaps are fixed
- privacy constraints are enforced in the schema and validation paths
- exported and in-memory events align with the documented contract
- final code is tested for completeness and feature requirements
- you provide a full implementation and validation report

ADDITIONAL INSTRUCTIONS

- Be concrete and implementation-focused.
- Do not give generic advice.
- Do not only summarize the codebase.
- Actually update the code.
- Remove or refactor broken/stale schema logic when necessary.
- Favor modular, production-minded TypeScript where possible.
- Add comments where privacy-sensitive schema decisions are enforced.
- Add or improve tests where there are meaningful risks.
- If build tooling is broken, fix it if reasonably possible and report what changed.
- If downstream modules must be updated to use the corrected schema, do so.
- If a migration layer is needed, add the minimum safe compatibility layer and document it clearly.

FINAL NOTE

Ledgerium AI is not building a surveillance product.
The Event Data Schema must represent structured workflow evidence: intent, context, transition, timing, and privacy-safe metadata.
Your job is to ensure the current codebase actually reflects that and that the schema is complete, validated, safe, and usable across the system.
