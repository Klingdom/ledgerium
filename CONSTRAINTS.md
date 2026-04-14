# Constraints

## Product constraints
- Optimize for clarity and maintainability over novelty.
- Do not add features without a user or business justification.
- Avoid scope creep during implementation.

## Engineering constraints
- Keep dependencies minimal and justified.
- Preserve working functionality unless a change is explicitly intended.
- Avoid hidden coupling between modules.
- Avoid magic values and undocumented assumptions.

## Security constraints
- Never expose secrets in code or docs.
- Use least-privilege principles.
- Validate inputs and sanitize outputs.
- Protect authenticated routes and sensitive operations.

## Operational constraints
- Do not claim production readiness without evidence.
- Do not mark experiments as wins without measurable validation.
- Document irreversible changes before making them.
