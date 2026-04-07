# Ledgerium Design System

Design tokens, components, and rules governing all generated artifact output.

## Typography Scale

| Token | Size | Line Height | Use |
|-------|------|-------------|-----|
| `ds-2xl` | 22px | 28px | Document titles |
| `ds-xl` | 18px | 26px | — reserved — |
| `ds-lg` | 16px | 24px | Metric values, emphasis |
| `ds-base` | 14px | 22px | Body text, step titles |
| `ds-sm` | 13px | 20px | Descriptions, instructions |
| `ds-xs` | 11px | 16px | Labels, tags, metadata |

**Font stack:** System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui`)
**Font features:** `cv02, cv03, cv04, cv11` for refined character shapes.

### Rules
- Section labels: `ds-xs`, semibold, uppercase, tracking-widest, gray-400
- Body text: `ds-sm`, regular, gray-600
- Step titles: `ds-base`, semibold, gray-900
- Metric values: `ds-lg`, semibold, gray-900, tabular-nums
- Never use sizes below 11px

## Spacing Scale

4px base unit. Named tokens for consistency.

| Token | Value | Use |
|-------|-------|-----|
| `ds-1` | 4px | Tight gaps (dot + text) |
| `ds-2` | 8px | Tag gaps, inline spacing |
| `ds-3` | 12px | List item gaps, inner padding |
| `ds-4` | 16px | Card inner padding, grid gaps |
| `ds-5` | 20px | Primary card padding |
| `ds-6` | 24px | Section internal spacing |
| `ds-8` | 32px | Section-to-section spacing |
| `ds-10` | 40px | Document padding |
| `ds-12` | 48px | Large spacers |

### Rules
- Between sections: `ds-8` (32px)
- Between items within a section: `ds-3` (12px)
- Card padding: `ds-5` horizontal, `ds-4` vertical
- Step cards: `ds-3` between steps

## Color System

### Brand
| Token | Hex | Use |
|-------|-----|-----|
| `brand-50` | #f0f7ff | Tag backgrounds |
| `brand-100` | #e0effe | Step ordinal background |
| `brand-400` | #36a7f8 | Bullets, accents |
| `brand-500` | #0c8de9 | Primary interactive |
| `brand-600` | #006fc7 | Buttons, links |
| `brand-700` | #0059a1 | Step ordinal text, emphasis |

### Neutrals
| Token | Hex | Use |
|-------|-----|-----|
| `gray-50` | #f9fafb | Page background |
| `gray-100` | #f3f4f6 | Progress bars, subtle fills |
| `gray-200` | #e5e7eb | Borders, dividers |
| `gray-400` | #9ca3af | Section labels, metadata |
| `gray-500` | #6b7280 | Placeholder text |
| `gray-600` | #4b5563 | Body text |
| `gray-700` | #374151 | Emphasis text |
| `gray-800` | #1f2937 | Strong text |
| `gray-900` | #111827 | Headings, titles |

### Semantic
| Use | Border | Background |
|-----|--------|------------|
| Info | `brand-400` | `brand-50/40` |
| Success | `green-400` | `green-50/40` |
| Warning | `amber-400` | `amber-50/40` |
| Error | `red-400` | `red-50/40` |

### Category Step Colors (left border only)
| Category | Border Color |
|----------|-------------|
| Navigation | `teal-500` |
| Form Submit | `blue-500` |
| Data Entry | `violet-500` |
| Submit/Send | `emerald-500` |
| File Action | `amber-500` |
| Error Handling | `red-500` |
| Annotation | `purple-500` |
| Repeated Action | `orange-500` |
| Single Action | `gray-400` |

### Rules
- Color conveys meaning, not decoration
- Category color applied only as left border on step cards
- Semantic callouts use 3px left border + 40% opacity background
- Never use saturated colors for large surfaces

## Component Library

### `ds-document`
Max-width content column (768px) with 32px section spacing.

### `ds-header`
Document title block with bottom border. Contains title, subtitle, and quick stats.

### `ds-section`
Labeled content group. Label uses `ds-section-label` (uppercase, tracking-wide, gray-400).

### `ds-step`
Procedure step card with:
- Left color border by category (3px)
- Header: ordinal badge + title + category tag
- Body: instruction detail in gray-50 box
- Footer: system, duration, confidence, expected outcome
- Optional: decision callout, friction indicator, warnings

### `ds-callout`
Left-bordered callout block. Four variants: info, warning, success, danger.

### `ds-tag` / `ds-tag-brand` / `ds-tag-neutral`
Small pill labels for systems, roles, categories.

### `ds-metric`
Stat block: small uppercase label + large value. Used in grids.

### `ds-attribution`
Footer block with generation source note. Centered, subtle gray.

## Layout Rules

1. All artifact content lives inside `ds-document` (max-width 768px)
2. Sections use `ds-section` with `ds-section-label` headings
3. Steps are `ds-step` cards, never paragraphs
4. Metrics use `ds-metric` in grid layouts (2 or 4 columns)
5. Callouts for warnings/tips/decisions use `ds-callout` variants
6. Tags for systems/roles use `ds-tag` variants

## Print / Export Rules

1. `ds-step` and `ds-section` have `break-inside: avoid`
2. `ds-header` has `break-after: avoid`
3. Navigation and buttons hidden in print
4. `ds-attribution` gets top border in print mode
5. Background colors print safely (40% opacity fills)

## Do / Don't

| Do | Don't |
|----|-------|
| Use `ds-section-label` for all section headings | Use random text sizes for labels |
| Apply category color via left border only | Color entire step card backgrounds |
| Use `ds-tag` for system/role labels | Inline system names in prose |
| Use `ds-callout` for warnings/notes | Put warnings in plain text |
| Use `ds-metric` for stats | Use inconsistent stat layouts |
| Keep content within `ds-document` width | Let content span full page width |
| Use spacing tokens (`ds-3`, `ds-5`, etc.) | Use arbitrary pixel values |
