**Comparison Target**

- Source visual truth: `C:\Users\erik9\AppData\Local\Temp\codex-clipboard-ec4df3f6-5bfb-47b9-b0b6-ab29127588b8.png`
- Supporting transit reference: SL rail network map dated 2025-04-14, `https://images.ctfassets.net/9t2ujbulz1j7/KPuTvfWiEovOdFcO8q2kQ/b37312b61e82f24a52502a05b425ec4c/SL_Spartrafikkarta_250414.png`
- Implementation: browser-rendered `http://127.0.0.1:3000/#journeys-heading`
- Implementation screenshot: in-app Browser capture emitted during this task; live implementation URL above remains available.
- State: dark theme, Roslags Näsby to Visinge, live journey results.
- Source pixels: 1307 × 624.
- Implementation pixels: 1265 × 712.
- CSS viewport: 1280 × 720 at device pixel ratio 1.
- Normalization: both captures were normalized to 1307 × 624 and composited side by side for the full-view comparison.

**Findings**

- No actionable P0, P1, or P2 mismatch remains.
- Fonts and typography: existing family, weights, sizes, and hierarchy remain unchanged. Badge type stays at the existing 12 px semibold treatment.
- Spacing and layout rhythm: card padding, gaps, borders, radii, and route alignment remain consistent with the source. Added icons increase badge width without colliding with route text or accessibility status at the tested viewport.
- Colors and visual tokens: metro, commuter rail, tram/local rail, bus, and ferry families now use line colors. All solid badge foreground/background pairs meet at least 4.5:1 contrast.
- Image quality and asset fidelity: no raster imagery is required. Supported library icons are used for metro, train, tram, bus, ferry, and walking; no custom SVG, CSS drawing, or placeholder asset is present.
- Copy and content: Swedish mode names, line numbers, station names, times, and accessibility text remain intact.

**Full-view Comparison Evidence**

- Three-card structure, time hierarchy, route placement, accessibility badge, borders, and dark-theme balance match the source.
- Earlier/later controls and the longer third live itinerary are application-state differences already present in the implementation, not regressions from this change.

**Focused Region Comparison Evidence**

- Source badge: neutral outline with `Spårvagn 27`.
- Implementation badge: same label and placement, plus a tram icon and Roslagsbanan purple fill. This is the requested intentional change.
- Badge height is 24 px; measured width for `Spårvagn 27` is 106 px. No clipping or wrapping occurred.

**Comparison History**

1. Initial pass found white text on the line 21 orange badge at 3.68:1 contrast and identical icons for metro and commuter rail.
2. Fixed line 21 to dark foreground at 5.12:1 and assigned `TrainFrontTunnel` to metro while keeping `TrainFront` for commuter rail.
3. Post-fix checks: all palette pairs pass 4.5:1; real journey cards render tram, bus, and walking badges with no console errors.

**Primary Interactions Tested**

- Search and select origin.
- Search and select destination.
- Submit journey search.
- Render live journey results containing tram, bus, and walking legs.
- Open journey details and verify the shared colored badge renders there.
- Console errors checked: none.

**Implementation Checklist**

- [x] Mode-specific icons.
- [x] Current SL rail-family colors.
- [x] Blue/red bus identities.
- [x] Neutral walking treatment.
- [x] Summary and detail views share one badge component.
- [x] Typecheck, focused tests, and production build pass.

**Follow-up Polish**

- None required for this scope.

final result: passed
