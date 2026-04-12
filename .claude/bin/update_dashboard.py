#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Dict, List

ARTIFACTS = [
    "PRD.md",
    "ARCHITECTURE.md",
    "API_SPEC.md",
    "DATA_MODEL.md",
    "UX_FLOWS.md",
    "TEST_PLAN.md",
    "RELEASE_READINESS.md",
    "DEPLOYMENT_PLAN.md",
    "RUNBOOK.md",
    "METRICS.md",
    "LAUNCH_PLAN.md",
]


def read_scorecards(score_dir: Path) -> List[Dict]:
    cards = []
    for path in sorted(score_dir.glob("*.score.json")):
        try:
            cards.append(json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            continue
    return cards


def render_dashboard(project_root: Path, cards: List[Dict]) -> str:
    present = {name: (project_root / name).exists() and (project_root / name).stat().st_size > 0 for name in ARTIFACTS}
    pct = round(sum(1 for v in present.values() if v) / len(ARTIFACTS) * 100)

    avg = round(sum(card.get("average", 0) for card in cards) / len(cards), 2) if cards else 0
    low = [c for c in cards if c.get("average", 5) < 4]
    gaps = []
    for c in cards:
        for g in c.get("known_gaps", []):
            gaps.append((c.get("artifact", "unknown"), g))
    gaps = gaps[:10]

    md = ["# SYSTEM_HEALTH", "", "## Summary", f"- Artifact completeness: {pct}%", f"- Average artifact quality: {avg}/5", f"- Low-score artifacts (<4.0): {len(low)}", f"- Total scorecards: {len(cards)}", "", "## Artifact Status", "| Artifact | Status |", "|---|---|"]
    for artifact in ARTIFACTS:
        md.append(f"| {artifact} | {'Present' if present[artifact] else 'Missing'} |")
    md.extend(["", "## Low-Score Artifacts", "| Artifact | Average | Confidence |", "|---|---:|---:|"])
    if low:
        for c in low:
            md.append(f"| {c.get('artifact')} | {c.get('average')} | {c.get('confidence')} |")
    else:
        md.append("| None | - | - |")

    md.extend(["", "## Top Known Gaps", "| Artifact | Gap |", "|---|---|"])
    if gaps:
        for artifact, gap in gaps:
            md.append(f"| {artifact} | {gap.replace('|','/')} |")
    else:
        md.append("| None | No major gaps detected |")

    md.extend([
        "",
        "## Production Gates",
        f"- Build gate: {'PASS' if present['PRD.md'] and present['ARCHITECTURE.md'] and present['API_SPEC.md'] else 'FAIL'}",
        f"- Frontend gate: {'PASS' if present['UX_FLOWS.md'] else 'FAIL'}",
        f"- Release gate: {'PASS' if present['TEST_PLAN.md'] and present['RELEASE_READINESS.md'] else 'FAIL'}",
        f"- Launch gate: {'PASS' if present['METRICS.md'] and present['LAUNCH_PLAN.md'] else 'FAIL'}",
        "",
        "## Next Actions",
    ])

    if not present["PRD.md"]:
        md.append("- Create or refine PRD.md before additional implementation.")
    if not present["ARCHITECTURE.md"]:
        md.append("- Create ARCHITECTURE.md to unblock technical sequencing.")
    if not present["API_SPEC.md"]:
        md.append("- Create API_SPEC.md before backend changes expand.")
    if low:
        md.append(f"- Rework low-score artifact first: {low[0].get('artifact')}.")
    if present["METRICS.md"] is False:
        md.append("- Define METRICS.md so outcomes can be measured after launch.")
    if len(md) and md[-1] == "## Next Actions":
        md.append("- No immediate actions detected.")
    md.append("")
    return "\n".join(md)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    args = parser.parse_args()
    project_root = Path(args.project_root).resolve()
    score_dir = project_root / ".claude" / "scorecards"
    cards = read_scorecards(score_dir)
    dashboard = render_dashboard(project_root, cards)
    (project_root / "SYSTEM_HEALTH.md").write_text(dashboard, encoding="utf-8")


if __name__ == "__main__":
    main()
