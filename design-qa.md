**Comparison Target**

- Primary visual truth: live SL station page for Roslags Näsby (Täby), captured at `D:\Code\DinSL\sl-departures-reference.png`.
- Supporting source: `C:\Users\erik9\AppData\Local\Temp\codex-clipboard-be52cb4d-f8f4-4645-a5fb-435b0387ed25.png`.
- Implementation: `http://localhost:4173/stop/9633`.
- Desktop screenshot: `D:\Code\DinSL\dinsl-departures-after.png`.
- Mobile screenshot: `D:\Code\DinSL\dinsl-departures-mobile.png`.
- Side-by-side comparison: `D:\Code\DinSL\departures-design-compare.png`.
- Desktop CSS viewport: 1480 × 1178, device pixel ratio 1.
- Mobile CSS viewport: 390 × 844, device pixel ratio 1.

**Findings**

- No actionable P0, P1, or P2 issue remains.
- The station page now follows the SL information hierarchy: compact departure search, station title, dense chronological board, adjacent map and station information, then traffic summary.
- Departure rows expose line, destination, planned/realtime departure, and platform in one scan line. Internal API statuses such as `EXPECTED` are no longer shown to users.
- The SL photographic hero is intentionally omitted. This keeps DinSL's view substantially shorter while preserving the station-page layout and blue/white/gray visual language.
- Real data is used throughout: current departures, platform, station coordinates, lines, timestamps, favorites, and cancellation count.

**Interaction Evidence**

- Desktop `Avgångar` tab changes to `aria-selected="true"`, updates the URL to `#hallplatser`, hides the planner panel, and reveals station search/favorites/nearby tools.
- Search for `Roslags Näsby` returned four real station results; selecting `Roslags Näsby 9633` navigated to `/stop/9633`.
- Station board loaded seven current departures, an OpenStreetMap view, line badges 27/28, and the live traffic summary.
- Search and favorite controls remain keyboard-addressable.
- Mobile viewport has no horizontal overflow (`scrollWidth = clientWidth = 390`).
- Browser console errors checked: none.

**Visual Comparison History**

1. Reference review identified the key desktop composition: departure board left, station context right, traffic status below.
2. First implementation exposed raw `EXPECTED` status text in rows.
3. Final pass suppresses normal API statuses and only localizes actionable exceptions such as cancellations or delays.
4. Final desktop and mobile captures show consistent hierarchy, readable density, and responsive stacking.

**Validation**

- [x] Desktop navigation tabs perform real view changes.
- [x] SL-style station departure page implemented.
- [x] Live data and map integrated without placeholder content.
- [x] Responsive desktop and 390 px phone layouts verified.
- [x] No horizontal overflow at phone width.
- [x] TypeScript validation passes.
- [x] `git diff --check` passes.
- [x] Browser console contains no errors.

final result: passed

---

## Planner mobile overflow QA — 2026-07-30

**Comparison Target**

- Source visual truth: `C:\Users\erik9\AppData\Local\Temp\codex-clipboard-31d416c8-6249-42de-a055-19cf32e9e203.png`.
- Browser-rendered implementation: `D:\Code\DinSL\mobile-overflow-fixed.png`.
- Side-by-side evidence: `D:\Code\DinSL\mobile-overflow-comparison.png`.
- Source pixels: 1206 × 2622, normalized to 375 × 815 for comparison.
- Implementation pixels: 375 × 812 at device pixel ratio 1.
- Browser viewport override: 390 × 844; rendered document width: 375 CSS px.
- State: dark-theme mobile planner with “Var framme vid” selected and native date/time fields visible.

**Findings**

- No actionable P0, P1, or P2 issue remains.
- Date and time inputs now shrink within their field and card boundaries. Their measured right overflow is 0 px.
- Travel-mode labels remain on one line at 375 CSS px. Below 360 px, the long arrival option moves to a full-width second row.
- Shared field, input, textarea, and select primitives now use explicit shrink constraints, preventing intrinsic native-control widths from expanding mobile layouts.
- Browser-native date/time formatting and icons differ between iOS Safari and Chromium by platform design; this is expected.
- The source screenshot’s bottom `dinsl.se` pill is Safari browser chrome, not an app-owned overflow.

**Required Fidelity Surfaces**

- Fonts and typography: existing font family, weights, sizes, and hierarchy remain unchanged; broken option wrapping is removed.
- Spacing and layout rhythm: existing gaps, card padding, radii, and vertical rhythm remain unchanged at normal phone widths; only sub-360 px mode layout gains a second row.
- Colors and visual tokens: unchanged.
- Image quality and assets: no image assets are involved.
- Copy and content: unchanged; all Swedish labels remain complete and readable.

**Interaction Evidence**

- Selected “Var framme vid” and confirmed date/time fields render.
- At 375 CSS px: document horizontal overflow is 0 px; no visible form control crosses viewport boundaries.
- At 305 CSS px: document horizontal overflow is 0 px; date/time input overflow is 0 px; all three travel-mode labels remain single-line.
- Search fields retain a 16 px mobile font size, preventing iOS focus zoom.
- Browser console errors checked: none.

**Comparison History**

1. Initial source showed date/time controls extending past their containing card and “Var framme vid” wrapping awkwardly.
2. Added `min-width: 0` and `max-width: 100%` constraints to shared form primitives and field wrappers.
3. Rebalanced the three-column travel-mode selector and added a two-row fallback below 360 px.
4. Post-fix browser evidence shows contained native controls, single-line labels, and zero horizontal overflow at both tested phone widths.

**Focused Comparison**

- Separate crops were unnecessary because the normalized side-by-side image renders the affected selector and date/time region at readable 1:1 CSS width.

**Validation**

- [x] TypeScript validation passes.
- [x] `git diff --check` passes.
- [x] React best-practices review finds no new structural, hook, accessibility, performance, or TypeScript issue.
- [x] Browser console contains no errors.
- [x] Final responsive result has no actionable P0/P1/P2 issue.

final result: passed

---

## Planner summary-card height QA — 2026-07-30

**Comparison Target**

- Source visual truth: `C:\Users\erik9\AppData\Local\Temp\codex-clipboard-ebbf9bdb-6459-43f8-8e52-431275fc8e06.png`.
- Browser-rendered implementation: `D:\Code\DinSL\fixed-summary-card-expanded-desktop.png`.
- Side-by-side evidence: `D:\Code\DinSL\fixed-summary-card-expanded-comparison.png`.
- Source and implementation pixels: 1536 × 1157 each.
- CSS viewport: 1536 × 1157; device pixel ratio 1.
- State: desktop planner with “Fler reseval” expanded.

**Findings**

- No actionable P0, P1, or P2 issue remains for the requested layout change.
- The blue summary card is now independently fixed at 384 px on desktop while the expanded planner grows to 856 px.
- The columns remain top-aligned. At widths below the desktop breakpoint, the summary card returns to natural content height.
- Typography, colors, icons, and copy were intentionally unchanged. Light/dark theme and populated/empty field differences in the comparison are existing runtime state, not part of this scoped fix.
- No image assets are involved in this component.

**Interaction Evidence**

- Expanded and collapsed “Fler reseval”.
- Confirmed the right column changes height without changing the blue card’s 384 px desktop height.
- Confirmed no horizontal overflow at the 1536 px desktop viewport.
- Browser console checked: no new errors during this interaction. One retained development-server entry predates this change.

**Comparison History**

1. Earlier state: both grid items stretched to the same row height, making the blue card grow with the planner.
2. Fix: top-aligned the grid and replaced the summary card’s full-height behavior with a desktop-only 24rem height.
3. Post-fix evidence: blue card remains 384 px while the expanded planner reaches 856 px.

**Implementation Checklist**

- [x] Desktop summary card has a fixed height.
- [x] Planner column can grow independently.
- [x] Mobile layout remains content-sized and stacked.
- [x] TypeScript validation passes.

final result: passed
