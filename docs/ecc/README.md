# everything-claude-code — imported slice

Source: `https://github.com/Klingdom/everything-claude-code` (your fork), cloned 2026-09-22.

## What was imported, and what was not

The fork carries **72 agents, 228 skills** and configuration for a dozen other
tools (Cursor, Codex, Gemini, Kiro, OpenCode…). It was **not** copied wholesale.
Three reasons:

1. **Context cost.** Every skill's name and description is surfaced to the model.
   228 of them would bury the 25 project agents the improvement loop actually
   dispatches to.
2. **Duplicate identities.** The 12 `trading-*` agents already exist at user
   scope. Importing them would shadow working definitions with a second copy.
3. **Relevance.** Most of the catalogue targets stacks this repo does not run —
   Django, Laravel, Kotlin, Spring, Perl, homelab networking, healthcare, DeFi.

What was imported maps to work actually in flight: accessibility (#222/#223),
E2E and verification (#200/#214), extension privacy, CI, and the autonomous loop.

| Destination | Count | Notes |
|---|---|---|
| `.claude/agents/` | 26 | see the correction below — the "zero collisions" claim did not survive |
| `.claude/skills/` | 39 | first skills in this repo — the directory did not exist |
| `.claude/commands/` | 3 | `add-language-rules`, `database-migration`, `feature-development` |
| `docs/ecc/` | 9 | reference docs, this file aside |

Full inventory of what landed: see `.claude/agents/`, `.claude/skills/` and the
iteration-log entry for 2026-09-22.

## Deliberately NOT imported

- **`hooks/` (3 files incl. `hooks.json`) and `.mcp.json`.** These are executable
  configuration: hooks run shell commands on tool events, MCP servers add tools.
  Wiring third-party executables into an agent that runs autonomously is a
  different risk class from adding a markdown prompt, and `.claude/settings.json`
  is this agent's own permission surface. **Not wired — awaiting an explicit
  decision.** The upstream files are readable in the clone if you want to review
  them.
- **`rules/`** — per-language rule packs for stacks this repo does not use.
- **Other tool configs** (`.cursor/`, `.codex/`, `.gemini/`, `.kiro/`,
  `.opencode/`, `.trae/`, `.qwen/`) — not Claude Code.
- **Translations** (`docs/zh-CN`, `ja-JP`, `ko-KR`, `tr`, `pt-BR`, `zh-TW`) —
  ~800 files mirroring the English originals.
- **`tradingagents/`, `examples/`, `tests/`, `src/`** — upstream's own product
  code, not configuration for this one.

## Correction (2026-09-23, MR-029)

The table above was accurate when written and is not any more. Two things:

1. **"Zero name collisions" is now false.** It was true against the user scope as
   it stood at import time (26 agents). User scope now holds **53**, and **25
   names exist in both scopes**. Project wins, so the project copy is what runs.
   **24 of those 25 are byte-identical** — harmless today, but two copies of the
   same file is a drift risk, and only one of them is version-controlled.
2. **`product-manager` differs and is shadowed**: the project's 134-line version
   (tailored to this repo's PRD/acceptance-criteria workflow) wins over a
   941-line one at user scope.

   **This shadowing predates the import.** Agents register by the `name:` in
   frontmatter, not the filename — proven by `product-manager` appearing in the
   session's agent list while the project file was still misspelled
   `product-manger.md`. Renaming that file at import time fixed the typo; it did
   not create the shadowing, and it did not change which definition runs.

   Keeping the project version is deliberate: it is the one written for this
   repo's artifact flow. Recorded here so nobody wonders why the longer
   definition appears unused.

## Trust posture

These files are instructions that run inside an autonomous loop, sourced from an
upstream project. They were scanned for destructive or network operations before
import; 17 **markdown** files across the full catalogue mention `git push`,
`--force` or recursive deletes, and none of those are in the imported set. Each
imported agent additionally carries its own prompt-defence preamble.

Two **shell scripts** did come along, in `skills/rules-distill/scripts/`
(`scan-rules.sh`, `scan-skills.sh`). Both contain `rm -rf` — inspected line by
line: each removes only its own `mktemp` directory in a cleanup trap, which is
the standard pattern. They are the only executable files in the imported set,
and nothing runs them unless that skill is invoked.

Treat any future import the same way: read it before wiring it, and prefer
markdown prompts over executable hooks.

## Known limitation

Agents, skills and commands are registered **when a session starts**. The session
that performed this import could not dispatch the new agents — verified, not
assumed: `subagent_type: a11y-architect` returned "Agent type not found" with a
list that excluded every import. They become available in the next session.
