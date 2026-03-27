# Ledgerium AI — Event Capture Specification (Canonical)

## Status
CRITICAL — CANONICAL SPEC

---

# 1. Purpose

Ledgerium AI depends on clean, structured, deterministic event data.

If event capture is noisy or ambiguous:
- Process segmentation fails
- SOP generation degrades
- Confidence scoring becomes meaningless

---

# 2. Core Principles

1. Capture intent, not noise
2. Deterministic over probabilistic
3. Minimize payload, maximize meaning
4. Never capture sensitive data
5. Every event must be explainable

---

# 3. Event Types

- click
- input
- navigation
- focus
- blur
- submit

---

# 4. Event Schema

```json
{
  "event_id": "uuid",
  "timestamp": "ISO-8601",
  "type": "click | input | navigation | focus | blur | submit",
  "target": {
    "selector": "string",
    "text": "string",
    "role": "string",
    "confidence": 0.0
  },
  "context": {
    "url": "string",
    "page_title": "string"
  },
  "metadata": {
    "input_type": "text | email | password | etc",
    "is_sensitive": false,
    "interaction_index": 0
  }
}
```

---

# 5. Target Resolution

Priority:
1. data-testid
2. aria-label / role
3. id
4. class
5. fallback path

Confidence scoring:
- Strong selector: 0.9+
- Medium: 0.6–0.9
- Weak: <0.6

---

# 6. DOM Simplification

- Remove dynamic classes
- Collapse wrappers
- Normalize selectors

---

# 7. Deduplication

- Same event within 300ms → drop
- Collapse input typing
- Merge focus + click

---

# 8. Throttling

- Click: 150ms min interval
- Input: 500ms debounce
- Navigation: final URL only

---

# 9. Noise Filtering

Ignore:
- mousemove
- scroll
- hover
- animations
- background events

---

# 10. Sensitive Data

Never capture:
- passwords
- credit cards
- personal identifiers

Mark sensitive fields and exclude values.

---

# 11. Ordering

- Strict timestamp ordering
- Increment interaction index

---

# 12. Session Boundaries

Start: Start Recording  
End: Stop Recording

---

# 13. Output Guarantees

All events must be:
- deterministic
- readable
- non-sensitive
- deduplicated

---

# 14. Failure Handling

- Fallback selector
- Lower confidence
- Drop invalid events

---

# 15. Testing

Validate:
- deduplication
- selector stability
- sensitive data exclusion

---

# FINAL NOTE

If this layer is clean → everything works  
If this layer is noisy → everything breaks
