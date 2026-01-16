# Deterministic Process Map + SOP Generation (v1)

## Outputs
1) Process diagram (SVG)
2) SOP (Markdown)

Both are generated from a deterministic intermediate representation (IR).

## Pipeline
Events → Segmentation → Step Extraction → Canonicalization → Graph Build → Variant Merge → Outputs

### Segmentation rules
New segment when:
- hostname changes, OR
- navigation crosses to a different "work object" (heuristic), OR
- idle gap > 45s, OR
- explicit artifact boundary

### Step extraction (reducer)
Examples:
- click + nav within 2500ms => "Navigate"
- multiple inputs then submit => "Fill + Submit"
- repeated clicks within 1000ms => dedupe
- errors => explicit "Handle error"

### Canonical step signature
`Verb|Object|app_id|page_kind`

### Graph build
Nodes: unique signatures
Edges: observed transitions
Stable ordering by topological rank then signature.

### SOP
Use dominant path (highest edge counts; tie-break stable signature sort).

