# Workflow-map contrast measurement — backlog row #268

Generated from the ledger in this loop; every ratio is computed with the same WCAG 2.x relative-luminance arithmetic as `apps/web-app/src/app/theme-contrast.test.ts`, reading `globals.css` for token values. Floors: **4.5:1** text (SC 1.4.3), **3:1** meaningful non-text (SC 1.4.11). "Before" = `git HEAD`; "after" = working tree. Pairs on the React Flow canvas are measured against `#ffffff` in both themes (`colorMode="light"`). Pairs on the page are measured against the worst of the three theme surfaces per theme.

Site = one source occurrence of a colour literal (hex, `rgb(a)`, Tailwind palette/white/black utility) or a dynamic colour expression. `var(--token)` references are counted separately (below) and measured at token level.

| File | Lines (before) | Sites | Mark | Backing | Floor | Before L / D | After L / D | Status | Fix |
|---|---|---|---|---|---|---|---|---|---|
| DfgFrequencyMap | 79 | 1 | perf neutral fill `#9ca3af` (insufficient data) | canvas (white both themes) | 3 | 2.54 / 2.54 | 4.83 / 4.83 | FAIL→fixed | `#6b7280`; lowData edges dashed instead of faded |
| DfgFrequencyMap | 76 | 1 | perf fast fill `#10b981` | canvas | 3 | 2.54 / 2.54 | 3.77 / 3.77 | FAIL→fixed | `PERF_FAST_COLOR #059669` |
| DfgFrequencyMap | 77 | 1 | perf medium fill `#f59e0b` | canvas | 3 | 2.15 / 2.15 | 3.19 / 3.19 | FAIL→fixed | `PERF_MEDIUM_COLOR #d97706` (min across interpolation 3.19) |
| DfgFrequencyMap | 78 | 1 | perf slow fill `#ef4444` | canvas | 3 | 3.76 / 3.76 | 4.83 / 4.83 | pass | kept darker for text parity |
| DfgFrequencyMap | 212 | 2 | perf node text (`#ffffff`, lowData `#374151`) on interpolated fill; worst endpoint shown | perf fill | 4.5 | 2.15 / 2.15 | 6.59 / 6.59 | FAIL→fixed | `readableTextOn(fill)`: black/white by luminance, >= 4.58 anywhere on the scale |
| DfgFrequencyMap | 205 | 1 | perf node hairline `rgba(0,0,0,0.08)` (the only boundary of a 2.15:1 fill) | canvas | 3 | 2.15 / 2.15 | 3.19 / 3.19 | FAIL→fixed | boundary is now the >=3:1 fill itself |
| DfgFrequencyMap | 188,199 | 2 | start terminal: white glyph on `#22c55e` | start fill | 4.5 | 2.28 / 2.28 | 5.02 / 5.02 | FAIL→fixed | `TERMINAL_START #15803d` |
| DfgFrequencyMap | 188,199 | 1 | end terminal: white glyph on `#ef4444` | end fill | 4.5 | 3.76 / 3.76 | 6.47 / 6.47 | FAIL→fixed | `TERMINAL_END #b91c1c` |
| DfgFrequencyMap | 190 | 2 | terminal borders `#16a34a` / `#dc2626` | canvas | 3 | 3.30 / 3.30 | 9.11 / 9.11 | pass | darker borders (still pass; centralised) |
| DfgFrequencyMap | 54,312 | 1 | frequency edge stroke `#6366f1` at the old opacity floor 0.20 | canvas | 3 | 1.29 / 1.29 | 3.47 / 3.47 | FAIL→fixed | `EDGE_MIN_OPACITY 0.85` (faintest edge 3.47:1); width remains the primary frequency channel |
| DfgFrequencyMap | 219 | 1 | selected-node border `#6366f1` (unreachable: elementsSelectable=false) | canvas | 3 | 4.47 / 4.47 | 6.29 / 6.29 | pass | `HAPPY_COLOR` |
| DfgFrequencyMap | 55,205 | 2 | `#4f46e5` selected-path edge + selected perf ring | canvas | 3 | 6.29 / 6.29 | 6.29 / 6.29 | pass | unchanged; centralised |
| DfgFrequencyMap | 259,263 | 4 | visit badge text `#4c1d95` on `#f5f3ff` (x2 sites: node + legend sample) | badge fill | 4.5 | 9.99 / 9.99 | 9.99 / 9.99 | pass | unchanged; centralised in `mapColors.BADGE` |
| DfgFrequencyMap | 260,400 | 2 | visit badge border `#ddd6fe` | - | 3 | - | - | exempt | **Why:** decorative: the badge is identified by its text and fill (SC 1.4.11 does not require a border that identifies nothing) |
| DfgFrequencyMap | 213,227 | 4 | drop-shadow / selection-halo `rgba(...)` | - | 3 | - | - | exempt | kept; allowlisted + counted. **Why:** decorative elevation/halo; selection is carried by the 2px border |
| DfgFrequencyMap | 367,508 | 2 | legend-bar fill `rgba(255,255,255,0.97)` under `--content-secondary` / `--content-tertiary` text | near-white strip, both themes | 4.5 | 4.48 / 2.41 | 4.76 / 6.75 | FAIL→fixed | strip follows the theme (`var(--surface-secondary)`) |
| DfgFrequencyMap | 384,411,418,498,526,535 | 6 | legend text tokens (`--content-secondary` x4, `--content-tertiary` x2) that sat on that white strip; worst token shown | near-white strip | 4.5 | 4.48 / 2.41 | 4.76 / 6.75 | FAIL→fixed | follows from the strip fix |
| DfgFrequencyMap | 369,444,454,510 | 4 | hairlines `#e5e7eb` (bar dividers, toggle-group outline) | - | 3 | - | - | exempt | `var(--border-subtle)` / `--border-default`. **Why:** decorative dividers; the toggle is identified by its text and `aria-pressed` fill, not by its outline |
| DfgFrequencyMap | 470 | 1 | inactive toggle fill `#fff` under `--content-secondary` text | white fill on dark page | 4.5 | 4.76 / 2.56 | 4.76 / 6.75 | FAIL→fixed | `var(--surface-secondary)` |
| DfgFrequencyMap | 470-471 | 2 | active toggle: `#fff` on `#6366f1` | fixed fill | 4.5 | 4.47 / 4.47 | 6.29 / 6.29 | FAIL→fixed | `HAPPY_COLOR` |
| DfgFrequencyMap | 590 | 1 | range input `accent-violet-600` (`#7c3aed`) as non-text control colour | theme surface | 3 | 5.45 / 2.84 | 6.79 / 8.77 | FAIL→fixed | `accent-[var(--map-violet-fg)]` |
| DfgFrequencyMap | 725 | 1 | de-emphasised (unselected) edge `#9ca3af` @0.08 | - | 3 | - | - | exempt | `var(--content-secondary)`. **Why:** selection de-emphasis, not content: clearing the selection restores the full-contrast edge; the same information is in the undimmed state |
| WorkflowSystemsMap | 54-57,50 | 5 | overview icons `#0891b2`/`#7c3aed`/`#d97706`/`#64748b` + header `text-cyan-600`; worst of the five shown (violet) | surface-elevated | 3 | 5.70 / 2.84 | 7.10 / 8.77 | FAIL→fixed | tokens: `--map-cyan-fg` `--map-violet-fg` `--status-warning` `--content-secondary` |
| WorkflowSystemsMap | 149,167,171,172,185 | 5 | card fill `#ffffff` under `--content-primary` (1), `--content-secondary` (2), `--content-tertiary` (1) text; worst shown (primary) | white card on page theme | 4.5 | 17.85 / 1.23 | 17.85 / 13.13 | FAIL→fixed | `var(--surface-elevated)` |
| WorkflowSystemsMap | 149 | 1 | selected-card fill `#ecfeff` under the same text | cyan tint on page theme | 4.5 | 7.28 / 3.30 | 7.58 / 4.72 | FAIL→fixed | selection = cyan border; no tint under body text (a tint put tertiary text at 3.87:1 in dark) |
| WorkflowSystemsMap | 148 | 1 | selected-card border `#0891b2` | card | 3 | 3.52 / 4.40 | 5.12 / 11.17 | pass | `--map-cyan-fg` |
| WorkflowSystemsMap | 148,160,160 | 3 | unselected card/tile borders `#e2e8f0`, tile border `rgba(8,145,178,0.2)` | - | 3 | - | - | exempt | `var(--border-default)` / cyan border when selected. **Why:** decorative card edges; the card is identified by fill + text |
| WorkflowSystemsMap | 151,152,151 | 3 | halo/elevation `rgba(...)` | - | 3 | - | - | exempt | kept; allowlisted + counted. **Why:** decorative |
| WorkflowSystemsMap | 159,159 | 2 | icon tile fill `rgba(8,145,178,0.1)` / `#f1f5f9` | tile | 3 | 5.15 / 9.15 | 5.15 / 9.15 | pass | tokens (previously a light island on the dark card) |
| WorkflowSystemsMap | 163 | 2 | tile icon `#0891b2` / `#64748b` | tile | 3 | 4.34 / 4.34 | 4.76 / 6.75 | pass | tokens |
| WorkflowSystemsMap | 181 | 1 | share-bar fill `#94a3b8` (unselected) on `--surface-secondary` track | surface-secondary | 3 | 2.56 / 6.75 | 4.76 / 6.75 | FAIL→fixed | `--content-secondary` |
| WorkflowSystemsMap | 181 | 1 | share-bar fill `#0891b2` (selected) | surface-secondary | 3 | 3.68 / 4.70 | 5.36 / 11.93 | pass | `--map-cyan-fg` |
| WorkflowSystemsMap | 458 | 1 | detail bar `bg-cyan-500` on `--surface-secondary` track | surface-secondary | 3 | 2.43 / 7.12 | 5.36 / 11.93 | FAIL→fixed | `bg-[var(--map-cyan-fg)]` |
| WorkflowSystemsMap | 202,258 | 4 | count pills: `text-violet-600` on `bg-violet-50` (x2 pills, 2 sites each) | fixed light pill | 4.5 | 5.20 / 5.20 | 6.48 / 8.12 | pass | token pair (was a light island in dark) |
| WorkflowSystemsMap | 477,485 | 2 | `text-violet-600 font-bold` count on `--surface-secondary` rows | surface-secondary | 4.5 | 5.70 / 3.04 | 7.10 / 9.37 | FAIL→fixed | `--map-violet-fg` |
| WorkflowSystemsMap | 248 | 1 | handoff header icon `text-violet-600` | surface-elevated | 3 | 5.70 / 2.84 | 7.10 / 8.77 | FAIL→fixed | `--map-violet-fg` |
| WorkflowSystemsMap | 273 | 1 | handoff connector `bg-violet-300` (1px line) | surface-secondary | 3 | 1.85 / 9.37 | 7.10 / 9.37 | FAIL→fixed | `--map-violet-fg` |
| WorkflowSystemsMap | 274 | 1 | handoff arrow `text-violet-400` | surface-secondary | 3 | 2.72 / 6.36 | 7.10 / 9.37 | FAIL→fixed | `--map-violet-fg` |
| WorkflowSystemsMap | 324-325,389,397 | 2 | signal "High Context Switching": `#dc2626` on `#fef2f2` (badge text, 8px) | fixed pair | 4.5 | 4.41 / 4.41 | 5.66 / 5.07 | FAIL→fixed | `--status-danger-*` pair |
| WorkflowSystemsMap | 333-334 | 2 | signal "Moderate": `#d97706` on `#fffbeb` | fixed pair | 4.5 | 3.07 / 3.07 | 6.61 / 5.67 | FAIL→fixed | `--status-warning-*` pair |
| WorkflowSystemsMap | 346-347 | 2 | signal "Repeated": `#7c3aed` on `#f5f3ff` | fixed pair | 4.5 | 5.20 / 5.20 | 6.48 / 8.12 | pass | `--map-violet-*` pair |
| WorkflowSystemsMap | 359-360 | 2 | signal "Fragmented": `#0891b2` on `#ecfeff` | fixed pair | 4.5 | 3.54 / 3.54 | 5.15 / 9.15 | FAIL→fixed | `--map-cyan-*` pair |
| WorkflowSystemsMap | 371-372 | 2 | signal "Integration": `#059669` on `#ecfdf5` | fixed pair | 4.5 | 3.58 / 3.58 | 4.73 / 5.52 | FAIL→fixed | `--status-success-*` pair |
| WorkflowSystemsMap | 474 | 1 | inbound arrow `text-emerald-500` on `--surface-secondary` | surface-secondary | 3 | 2.54 / 6.82 | 5.02 / 9.93 | FAIL→fixed | `--status-success` |
| WorkflowSystemsMap | 482 | 1 | outbound arrow `text-blue-500` on `--surface-secondary` | surface-secondary | 3 | 3.68 / 4.70 | 6.70 / 6.80 | pass | `--status-info` |
| WorkflowSystemsMap | 541-545 | 3 | single-system box: `text-blue-500` icon, `text-blue-800` title, `text-blue-600` body on `bg-blue-50`; body (10px) shown | fixed light tint | 4.5 | 4.75 / 4.75 | 6.16 / 7.94 | pass | `--map-blue-*` pair |
| WorkflowSystemsMap | 541 | 2 | `bg-blue-50` fill + `border-blue-200` | - | 3 | 4.75 / 4.75 | 6.16 / 7.94 | pass | `--map-blue-tint`; border `--border-default` |
| WorkflowSystemsMap | 557-558 | 3 | empty-state tile `bg-cyan-50` + `border-cyan-200` + `text-cyan-600` icon | cyan tint | 3 | 3.54 / 3.54 | 5.15 / 9.15 | pass | `--map-cyan-*` pair |
| WorkflowSystemsMap | 508 | 1 | step ordinal text = raw category accent `style.color` on `${color}12` tint | accent @7% over surface | 4.5 | 2.70 (data_entry dark) | 4.64 | FAIL→fixed | `categoryTextVar(cat)` = `--wf-cat-*` (loop 91 tokens) |
| WorkflowVariantsMap | 683,697,922,929 | 4 | category ordinal/label text = raw accent on its 6-7% tint (worst category: file_action amber) | accent @7% over surface | 4.5 | 2.70 (data_entry dark) | 4.64 | FAIL→fixed | `categoryTextVar(cat)` = `--wf-cat-*` (loop 91 tokens) |
| WorkflowVariantsMap | 83-85,136-138 | 6 | role "standard/observed": `#059669` on `#ecfdf5`, border `#6ee7b7` | fixed pill, both themes | 4.5 | 3.58 / 3.58 | 4.73 / 5.52 | FAIL→fixed | `--status-success-*` pair |
| WorkflowVariantsMap | 129-131 | 3 | role "variant": `#6366f1` on `#eef2ff`, border `#a5b4fc` | fixed pill | 4.5 | 3.99 / 3.99 | 7.07 / 7.72 | FAIL→fixed | `--map-indigo-*` pair |
| WorkflowVariantsMap | 142-144 | 3 | role "fastest": `#2563eb` on `#eff6ff`, border `#93c5fd` | fixed pill | 4.5 | 4.75 / 4.75 | 6.16 / 7.94 | pass | `--map-blue-*` pair |
| WorkflowVariantsMap | 148-150 | 3 | role "longest": `#d97706` on `#fffbeb`, border `#fcd34d` | fixed pill | 4.5 | 3.07 / 3.07 | 6.61 / 5.67 | FAIL→fixed | `--status-warning-*` pair |
| WorkflowVariantsMap | 158-160 | 3 | role "exception": `#dc2626` on `#fef2f2`, border `#fca5a5` | fixed pill | 4.5 | 4.41 / 4.41 | 5.66 / 5.07 | FAIL→fixed | `--status-danger-*` pair |
| WorkflowVariantsMap | 513 | 1 | role colour as frequency-bar fill on `--surface-secondary` track (via roleColor; worst role shown: longest `#d97706`) | surface-secondary | 3 | 3.19 / 5.43 | 7.09 / 10.36 | pass | role tokens clear 3:1 (4.5:1 in tests) on every surface |
| WorkflowVariantsMap | 407 | 1 | Quick Compare dot `#059669` | surface-elevated | 3 | 3.77 / 4.29 | 5.02 / 9.29 | pass | `ROLE_STYLES.success.fg` |
| WorkflowVariantsMap | 289,302,315,328 | 8 | view toggles: `bg-violet-600` + `text-white` | fixed fill | 4.5 | 5.70 / 5.70 | 5.70 / 5.70 | pass | unchanged (5.70:1); allowlisted PAIR |
| WorkflowVariantsMap | 837 | 3 | CTA: `bg-violet-600` + `text-white`, hover `bg-violet-700` | fixed fill | 4.5 | 5.70 / 5.70 | 5.70 / 5.70 | pass | unchanged (5.70 / 7.10:1); allowlisted PAIR |
| WorkflowVariantsMap | 372,834 | 2 | `text-violet-600` icons (header GitBranch, Zap) on surface / `bg-violet-50` tile | surface-elevated | 3 | 5.70 / 2.84 | 7.10 / 8.77 | FAIL→fixed | `--map-violet-fg` |
| WorkflowVariantsMap | 827,834 | 2 | spinner `border-t-violet-600`, tile `bg-violet-50` | surface | 3 | 5.70 / 2.84 | 7.10 / 8.77 | FAIL→fixed | `--map-violet-fg` / `--map-violet-tint` |
| WorkflowVariantsMap | 471,525 | 4 | compare state: `border-indigo-200`, `bg-indigo-50/30` under `--content-secondary` text; `text-indigo-700` on `bg-indigo-100` | indigo wash over dark card | 4.5 | 1.33 / 2.47 | 4.76 / 6.31 | FAIL→fixed | border = `--map-indigo-fg`; fill stays the card surface; chip = token pair |
| WorkflowVariantsMap | 582-586 | 5 | comparison card: `border-indigo-200/100`, `bg-indigo-50/50`, `text-indigo-600/700` header | indigo tint | 4.5 | 7.07 / 7.07 | 7.07 / 7.72 | pass | `--map-indigo-*` pair |
| WorkflowVariantsMap | 608,613 | 3 | `text-amber-600` / `text-emerald-600` 9px deltas on `--surface-elevated` | surface-elevated | 4.5 | 3.19 / 5.08 | 5.02 / 9.69 | FAIL→fixed | `--status-warning` / `--status-success` |
| WorkflowVariantsMap | 676 | 1 | divergence row `bg-amber-50/30` under `--content-tertiary` text | amber wash | 4.5 | 1.24 / 1.79 | 7.31 / 4.62 | FAIL→fixed | `--map-row-warn` (kept near-surface on purpose) |
| WorkflowVariantsMap | 712 | 2 | "DIVERGES" `text-amber-600` on `bg-amber-100` (8px) | fixed pill | 4.5 | 2.86 / 2.86 | 6.61 / 5.67 | FAIL→fixed | `--status-warning-*` pair |
| WorkflowVariantsMap | 749,758,767,776,785 | 5 | insight icons `#d97706`/`#2563eb`/`#dc2626`/`#d97706`/`#ea580c` on `${color}10` tint; worst (amber) shown | tint over card | 3 | 2.97 / 2.97 | 6.61 / 5.67 | FAIL→fixed | explicit `{color, tint}` token pairs |
| WorkflowVariantsMap | 842,850 | 4 | state tiles `bg-blue-50`/`text-blue-500`, `bg-red-50`/`text-red-500`; worst (red-500 on red-50) shown | fixed tint | 3 | 3.44 / 3.44 | 5.66 / 5.07 | pass | token pairs |
| WorkflowVariantsMap | 882-896 | 10 | banners: emerald-50/800/700/500 and blue-50/800/600/500 text on tint; worst body text (emerald-700 10px) shown | fixed tint | 4.5 | 5.21 / 5.21 | 4.73 / 5.52 | pass | token pairs; border `--border-default` (decorative) |
| WorkflowVariantsMap | 989 | 1 | legend-bar fill `rgba(255,255,255,0.97)` | near-white strip | 4.5 | 4.48 / 2.41 | 4.76 / 6.75 | FAIL→fixed | `var(--surface-secondary)` |
| WorkflowVariantsMap | 1001-1004 | 4 | legend text `#374151`, `#111827` x3 (on the white strip) | white strip | 4.5 | 9.71 / 9.71 | 4.76 / 6.75 | pass | tokens (strip is theme-aware now) |
| WorkflowVariantsMap | 1010,1017,1024 | 3 | legend labels `#4b5563` x3 | white strip | 4.5 | 7.12 / 7.12 | 4.76 / 6.75 | pass | tokens |
| WorkflowVariantsMap | 1039 | 1 | **legend note `#9ca3af` 9px italic** (the row's named failure: 2.54:1 on white) | white strip | 4.5 | 2.39 / 2.39 | 7.58 / 5.04 | FAIL→fixed | `var(--content-tertiary)` |
| WorkflowVariantsMap | 1012 | 1 | **legend swatch stroke `#9ca3af`** (named failure) | white strip | 3 | 2.39 / 2.39 | 4.76 / 6.75 | FAIL→fixed | `--content-secondary` |
| WorkflowVariantsMap | 1019,1030 | 2 | legend swatch/diamond `#d97706` | white strip | 3 | 3.00 / 3.00 | 5.02 / 10.36 | FAIL→fixed | `--status-warning` |
| WorkflowVariantsMap | 1000 | 1 | legend icon `#059669` | white strip | 3 | 3.55 / 3.55 | 5.02 / 9.93 | pass | `--status-success` |
| WorkflowVariantsMap | 991 | 1 | legend-bar divider `#e5e7eb` | - | 3 | - | - | exempt | `var(--border-subtle)`. **Why:** decorative divider |
| WorkflowHeader | 66,73,83,84 | 8 | status chips: -700 text on -50 fill (amber x2, red, emerald; 2 sites each) | fixed pair | 4.5 | 5.21 / 5.21 | 5.21 / 5.21 | pass | unchanged; pairs asserted in the guard (worst: emerald-700 on emerald-50 5.21) |
| WorkflowHeader | 66,73,83,84 | 4 | chip outlines border-amber-200 x2 / red-200 / emerald-200 | - | 3 | - | - | exempt | kept. **Why:** decorative: the chip is identified by its text and fill |
| WorkflowInsightsStrip | 12-14 | 6 | insight chips: bg-X-50 + text-X-700 for red/amber/blue (pair measured: blue-700 on blue-50) | fixed pair | 4.5 | 6.16 / 6.16 | 6.16 / 6.16 | pass | unchanged; pairs asserted in the guard |
| WorkflowInsightsStrip | 12-14 | 3 | chip outlines border-X-200 | - | 3 | - | - | exempt | kept. **Why:** decorative chip outline |
| WorkflowInsightsStrip | 12-14 | 3 | status dots bg-X-500 (4px) | - | 3 | - | - | exempt | kept. **Why:** decorative: severity is carried by the chip text and icon; the dot repeats it |
| WorkflowInspectorPanel | 210,211 | 3 | privacy-note box: bg-amber-50 fill, text-amber-800 body, **text-amber-500 icon (the row's ~2:1 failure)** | amber-50 | 3 | 2.07 / 2.07 | 6.61 / 5.67 | FAIL→fixed | `--status-warning-*` pair; box becomes theme-aware |
| WorkflowInspectorPanel | 210 | 1 | privacy-note outline border-amber-200 | - | 3 | - | - | exempt | `--border-default`. **Why:** decorative outline |
| WorkflowInspectorPanel | 241 | 2 | edge-type chip text-red-700 on bg-red-50 | fixed pair | 4.5 | 5.91 / 5.91 | 5.91 / 5.91 | pass | unchanged; pair asserted in the guard |
| WorkflowEmptyState | 22 | 2 | error tile: bg-red-50 fill under `--status-danger` icon (dark: #F87171 on light pink) | fixed light tint | 3 | 4.41 / 2.53 | 5.66 / 5.07 | FAIL→fixed | `--status-danger-*` pair |
| WorkflowEmptyState | 22 | 1 | error tile outline border-red-200 | - | 3 | - | - | exempt | `--border-default`. **Why:** decorative outline |
| WorkflowEmptyState | 65 | 2 | loading-skeleton placeholder bg-emerald-50/60 + border-emerald-100 | - | 3 | - | - | exempt | kept. **Why:** placeholder shape under animate-pulse; carries no information |
| WorkflowVariantStoryMap | 56 (category label) | 1 | node category label = raw accent `style.color` on `#ecfdf5`/`#fffbeb` (8px) | accent @7% over surface | 4.5 | 2.70 (data_entry dark) | 4.64 | FAIL→fixed | `categoryTextVar(cat)` = `--wf-cat-*` (loop 91 tokens) |
| WorkflowVariantStoryMap | 33,44,56,69-71,126-127 | 9 | story-map fixed hex: node fills #ecfdf5/#fffbeb, edge strokes #059669/#64748b/#d97706 on canvas, label #92400e on #fffbeb, decision borders | light canvas (colorMode now explicit) | 3 | 3.07 / 3.07 | 3.07 / 3.07 | pass | unchanged; every pair asserted in the guard (min 3.07:1 non-text, 6.9:1 label text) |
| WorkflowVariantStoryMap | 56 | 1 | "diverges" text-amber-700 on #fffbeb | fixed pair | 4.5 | 4.84 / 4.84 | 4.84 / 4.84 | pass | unchanged; asserted |
| WorkflowVariantStoryMap | 151,166 | 2 | header icon text-emerald-600 / range accent-emerald-600 (#059669) on the page theme | surface | 3 | 3.60 / 4.29 | 3.60 / 4.29 | pass | unchanged; >= 3:1 on every surface in both themes (min 3.77) |

**DFG edge encoding trade-off (row #268):** raising `EDGE_MIN_OPACITY` 0.20 -> 0.85 reduces the opacity dynamic range to [0.85, 1.0]; stroke width (1.5-10 px) is now the primary frequency channel.


## Totals (literal + dynamic sites in this ledger)

| File | Sites | Passing before | Failing before (all fixed) | Exempt |
|---|---|---|---|---|
| DfgFrequencyMap | 43 | 10 | 22 | 11 |
| WorkflowSystemsMap | 55 | 21 | 28 | 6 |
| WorkflowVariantsMap | 87 | 43 | 43 | 1 |
| WorkflowHeader | 12 | 8 | 0 | 4 |
| WorkflowInsightsStrip | 12 | 6 | 0 | 6 |
| WorkflowInspectorPanel | 6 | 2 | 3 | 1 |
| WorkflowEmptyState | 5 | 0 | 2 | 3 |
| WorkflowVariantStoryMap | 13 | 12 | 1 | 0 |
| **all** | **233** | **102** | **99** | **32** |
Ledger sites include the token-referenced marks that sit on a literal (for example the `--status-danger` icon on a hard-coded `bg-red-50`), so a file's total can exceed its literal count: DfgFrequencyMap 37 literal + 6 token text sites; WorkflowSystemsMap 50 + 1 dynamic + 4 token; WorkflowVariantsMap 82 + 5 dynamic.

## Token-reference sites (`var(--content|surface|border|status|brand|map|wf|accent…)`)

Counted by the same scanner, before -> after: DfgFrequencyMap 16 -> 25, WorkflowSystemsMap 72 -> 118, WorkflowVariantsMap 100 -> 167 (the increase is literals converted to tokens). Token-on-surface pairs are measured at token level in both themes (`status-*`, `content-secondary/tertiary`, `map-*`, `wf-cat-*`); the only token sites that failed before were those sitting on a hard-coded light backing (legend strips, white card, `#fff` toggle), and they are counted in the rows above.

## Exemptions (32 sites), by reason

- Decorative drop shadows / selection halos / skeleton shapes: carry no information; selection is carried by a measured border. Allowlisted by literal and count.
- Hairline outlines and dividers (`#e5e7eb`, `-200` borders, `#ddd6fe` badge border): SC 1.4.11 covers marks needed to identify a component or state; each of these components is identified by its text and fill. Replaced by `--border-*` tokens where they sat on the theme.
- Status dots (insights strip): 4px dot repeats the chip's text and icon.
- De-emphasised (unselected) edge at 0.08 opacity and node at 0.4: a transient selection overlay, not content; clearing the selection restores full contrast.

## Tokens

Added to `globals.css` in both themes (11 per theme): `--map-{indigo,violet,blue,cyan,orange}-{fg,tint}` and `--map-row-warn`. Each `-fg` is >= 4.5:1 on its own tint and on all three surfaces. Reused, unchanged: `--status-{danger,warning,success,info}`, `--status-*-on-tint` / `-tint`, `--content-*`, `--surface-*`, `--border-*`, `--wf-cat-*`. New fixed (non-theme) colours live in `components/workflow-view/mapColors.ts` and are measured by the guard.

## Not covered (stated, not waived)

- `HandoffEdge.tsx`, the minimap colours and `SwimlaneLaneHeader.tsx` were not statically re-measured here; the row marks them as needing a browser measurement.
- The dark `--wf-*` token values are unreachable inside React Flow canvases that rely on the library default `colorMode`. This change makes `colorMode="light"` explicit on `DfgFrequencyMap` and `WorkflowVariantStoryMap`; `WorkflowCanvas` / `WorkflowSwimlaneCanvas` are outside the named scope and still inherit the default. Either set it there too or delete the unreachable dark values.
- Browser/axe verification of the dark-theme map views was not run in this pass.
