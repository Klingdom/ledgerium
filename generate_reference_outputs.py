"""Reference deterministic generator.

Given session.json + events.ndjson, produce:
- process_graph.svg
- sop.md

This is intentionally conservative and exists to prove determinism.
"""

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Tuple

@dataclass(frozen=True)
class Step:
    signature: str
    label: str

VERB_OBJECT = {
    'nav': ('Navigate', 'Invoice Create'),
    'submit': ('Submit', 'Invoice'),
    'artifact_created': ('Confirm', 'Invoice Created')
}

def load_events(ndjson_path: Path) -> List[dict]:
    events = []
    for line in ndjson_path.read_text().splitlines():
        line = line.strip()
        if line:
            events.append(json.loads(line))
    return events

def build_steps(events: List[dict]) -> List[Step]:
    # Deterministic reducer for this fixture:
    steps: List[Step] = []
    for e in events:
        t = e['type']
        if t in ('session_start','session_stop','input_focus','input_blur','click','view','pause','resume','system_wait','select_change','error'):
            continue
        if t in VERB_OBJECT:
            verb, obj = VERB_OBJECT[t]
            app_id = e['app']['app_id']
            page_kind = 'invoice_create' if t in ('nav','submit') else 'invoice_view'
            signature = f"{verb}|{obj}|{app_id}|{page_kind}"
            label = f"{verb} {obj}"
            steps.append(Step(signature=signature, label=label))
    return steps

def build_graph(steps: List[Step]) -> Tuple[List[Step], List[Tuple[int,int,int]]]:
    # Unique nodes by signature (stable order)
    sig_to_idx: Dict[str,int] = {}
    nodes: List[Step] = []
    for s in steps:
        if s.signature not in sig_to_idx:
            sig_to_idx[s.signature] = len(nodes)
            nodes.append(s)
    # Edges with counts
    edge_counts: Dict[Tuple[int,int], int] = {}
    for a,b in zip(steps, steps[1:]):
        ia = sig_to_idx[a.signature]
        ib = sig_to_idx[b.signature]
        edge_counts[(ia,ib)] = edge_counts.get((ia,ib),0) + 1
    edges = [(i,j,c) for (i,j),c in edge_counts.items()]
    edges.sort(key=lambda x: (x[0], x[1]))
    return nodes, edges

def render_svg(nodes: List[Step], edges: List[Tuple[int,int,int]]) -> str:
    # Deterministic simple vertical layout
    W = 860
    P = 40
    node_w = 260
    node_h = 44
    gap = 26

    x = P
    y0 = P

    height = y0 + len(nodes)*(node_h+gap) + P

    def esc(s: str) -> str:
        return (s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'))

    out = []
    out.append(f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{height}' viewBox='0 0 {W} {height}'>")
    out.append("<rect x='0' y='0' width='100%' height='100%' fill='#0B0C10'/>")

    # Nodes
    positions = []
    for i,n in enumerate(nodes):
        y = y0 + i*(node_h+gap)
        positions.append((x,y))
        out.append(f"<rect x='{x}' y='{y}' rx='10' ry='10' width='{node_w}' height='{node_h}' fill='#0E0F12' stroke='rgba(255,255,255,0.08)'/>")
        out.append(f"<text x='{x+14}' y='{y+27}' font-family='Inter, system-ui, -apple-system, Segoe UI, Arial' font-size='13' fill='#E5E7EB'>{esc(n.label)}</text>")

    # Edges as straight lines with arrow
    for i,j,c in edges:
        x1, y1 = positions[i]
        x2, y2 = positions[j]
        sx = x1 + node_w
        sy = y1 + node_h/2
        tx = x2 + node_w
        ty = y2 + node_h/2
        # route line to the right gutter then down/up then back
        midx = W - P
        out.append(f"<path d='M {sx} {sy} L {midx} {sy} L {midx} {ty} L {x2+node_w} {ty}' fill='none' stroke='rgba(255,255,255,0.14)' stroke-width='2'/>")
        # edge count label
        lx = midx - 28
        ly = (sy+ty)/2 - 6
        out.append(f"<text x='{lx}' y='{ly}' font-family='Inter, system-ui, -apple-system, Segoe UI, Arial' font-size='11' fill='#9CA3AF'>×{c}</text>")

    out.append("</svg>")
    return "\n".join(out)

def render_sop(nodes: List[Step], edges: List[Tuple[int,int,int]]) -> str:
    # Dominant path for this single-session fixture is just node order
    lines = []
    lines.append("# Observed SOP — Create Invoice (Demo)\n")
    lines.append("## Scope\n")
    lines.append("Observed workflow execution in NetSuite based on recorded events.\n")
    lines.append("## Preconditions\n")
    lines.append("- User is authenticated in NetSuite\n")
    lines.append("## Steps\n")
    for idx, n in enumerate(nodes, start=1):
        lines.append(f"{idx}. **{n.label}**")
        if idx == 1:
            lines.append("   - In NetSuite, navigate to Invoice Create.")
            lines.append("   - Evidence: observed in 1/1 sessions.")
        elif 'Submit' in n.label:
            lines.append("   - Complete required invoice fields and save.")
            lines.append("   - Evidence: observed in 1/1 sessions.")
        else:
            lines.append("   - Confirm the invoice was created and accessible.")
            lines.append("   - Evidence: observed in 1/1 sessions.")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--session', required=True)
    ap.add_argument('--events', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    events = load_events(Path(args.events))
    steps = build_steps(events)
    nodes, edges = build_graph(steps)

    (out_dir / 'process_graph.svg').write_text(render_svg(nodes, edges), encoding='utf-8')
    (out_dir / 'sop.md').write_text(render_sop(nodes, edges), encoding='utf-8')

    print('OK: generated reference outputs')

if __name__ == '__main__':
    main()
