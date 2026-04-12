#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
import os
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List

REQUIRED_ARTIFACTS = {
    "PRD.md": ["problem", "scope", "success"],
    "ARCHITECTURE.md": ["architecture", "component", "data"],
    "API_SPEC.md": ["endpoint", "request", "response"],
    "UX_FLOWS.md": ["flow", "user", "screen"],
    "TEST_PLAN.md": ["test", "happy path", "edge"],
    "METRICS.md": ["metric", "baseline", "target"],
    "LAUNCH_PLAN.md": ["launch", "audience", "channel"],
    "RELEASE_READINESS.md": ["risk", "blocker", "status"],
}

@dataclass
class ScoreCard:
    artifact: str
    completeness: int
    clarity: int
    alignment: int
    actionability: int
    confidence: int
    known_gaps: List[str]
    notes: List[str]

    @property
    def average(self) -> float:
        return round((self.completeness + self.clarity + self.alignment + self.actionability) / 4, 2)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def markdown_headings(text: str) -> List[str]:
    return [line.strip("# ").strip().lower() for line in text.splitlines() if line.lstrip().startswith("#")]


def compute_score(path: Path, text: str) -> ScoreCard:
    artifact = path.name
    body = normalize(text)
    headings = markdown_headings(text)
    gaps: List[str] = []
    notes: List[str] = []

    reqs = REQUIRED_ARTIFACTS.get(artifact, [])
    found = 0
    for token in reqs:
        if token in body or any(token in h for h in headings):
            found += 1
        else:
            gaps.append(f"Missing expected section or concept: {token}")

    completeness = 5 if reqs and found == len(reqs) else max(1, min(5, found + 2 if reqs else 3))

    word_count = len(re.findall(r"\w+", text))
    clarity = 5 if 150 <= word_count <= 2000 else 4 if 80 <= word_count <= 2600 else 2
    if len(headings) < 2:
        clarity = max(1, clarity - 1)
        gaps.append("Artifact has too little structure; add headings.")

    alignment = 3
    if artifact == "METRICS.md" and all(x in body for x in ["baseline", "target"]):
        alignment = 5
    elif artifact == "TEST_PLAN.md" and "happy path" in body:
        alignment = 4
    elif reqs and found >= max(1, len(reqs) - 1):
        alignment = 4
    elif found == 0 and reqs:
        alignment = 1
        gaps.append("Artifact appears misaligned with expected purpose.")

    actionability = 4 if any(tok in body for tok in ["next", "owner", "status", "checklist", "step"]) else 2
    if actionability <= 2:
        gaps.append("Artifact lacks explicit next steps, owners, status, or checklist language.")

    confidence = max(1, min(5, round((completeness + clarity + alignment + actionability) / 4)))

    if word_count < 80:
        notes.append("Artifact is very short; may be a stub.")
    if word_count > 2600:
        notes.append("Artifact is long; consider splitting for clarity.")
    if not headings:
        notes.append("No markdown headings detected.")

    return ScoreCard(
        artifact=artifact,
        completeness=completeness,
        clarity=clarity,
        alignment=alignment,
        actionability=actionability,
        confidence=confidence,
        known_gaps=gaps,
        notes=notes,
    )


def write_scorecard(project_root: Path, scorecard: ScoreCard) -> None:
    score_dir = project_root / ".claude" / "scorecards"
    score_dir.mkdir(parents=True, exist_ok=True)
    json_path = score_dir / f"{scorecard.artifact}.score.json"
    md_path = score_dir / f"{scorecard.artifact}.score.md"
    json_path.write_text(json.dumps({**asdict(scorecard), "average": scorecard.average}, indent=2), encoding="utf-8")
    md = f"""# Scorecard: {scorecard.artifact}

## Quality Score
- Completeness: {scorecard.completeness}/5
- Clarity: {scorecard.clarity}/5
- Alignment: {scorecard.alignment}/5
- Actionability: {scorecard.actionability}/5
- Average: {scorecard.average}/5
- Confidence: {scorecard.confidence}/5

## Known Gaps
"""
    if scorecard.known_gaps:
        md += "\n".join(f"- {g}" for g in scorecard.known_gaps)
    else:
        md += "- None detected"
    md += "\n\n## Notes\n"
    if scorecard.notes:
        md += "\n".join(f"- {n}" for n in scorecard.notes)
    else:
        md += "- None"
    md_path.write_text(md + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--changed-file", required=False)
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    candidates = [project_root / args.changed_file] if args.changed_file else []
    if not candidates or not candidates[0].exists() or candidates[0].suffix not in {".md", ".markdown"}:
        candidates = [project_root / name for name in REQUIRED_ARTIFACTS if (project_root / name).exists()]

    for path in candidates:
        if path.exists() and path.is_file() and path.suffix in {".md", ".markdown"}:
            scorecard = compute_score(path, path.read_text(encoding="utf-8", errors="ignore"))
            write_scorecard(project_root, scorecard)


if __name__ == "__main__":
    main()
