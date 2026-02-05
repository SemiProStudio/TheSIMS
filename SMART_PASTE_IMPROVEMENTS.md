# Smart Paste — Improvement Plan

This document tracks planned enhancements for the Smart Paste feature, which imports product specifications from pasted text, PDF files, and TXT files into inventory item forms.

**Current implementation:** `lib/smartPasteParser.js` (parser engine) + `modals/SmartPasteModal.jsx` (UI)

---

## Current Capabilities (v3)

- **Text input**: Paste text tab with monospace textarea + clipboard HTML interception
- **File import**: Drag-and-drop zone for PDF, TXT, CSV, TSV, Markdown, RTF
- **Extraction patterns**: `Key: Value`, `Key\tValue`, `Key | Value`, `Key = Value`, `Key → Value`, `Key – Value`, consecutive-line detection
- **HTML cleaning**: Table-to-tab conversion, definition list handling, non-text element stripping (images, SVGs, scripts, nav, footer, buttons, comments)
- **Clipboard HTML preservation** *(v3)*: Intercepts paste events to prefer `text/html` from clipboard for better table structure
- **PDF parsing**: pdf.js (CDN-loaded) with line grouping by Y-position and gap-based tab insertion
- **Matching strategies**: Direct alias map lookup → abbreviation expansion → Levenshtein fuzzy matching → token overlap scoring
- **Manual mapping** *(v3)*: Unmatched pairs can be manually assigned to any spec field via dropdown
- **Confidence threshold** *(v3)*: Three modes — Strict (≥85), Balanced (≥60), Aggressive (≥50) — filter which matches are displayed
- **Result display**: Category-aware field ordering, confidence badges (Direct/Likely/Fuzzy), alternative selection dropdowns, required field indicators, matched-from source hints
- **Brand/category/price detection**: 120+ known brands, 11 category keyword sets, multi-currency price extraction with ranges and labeled prices *(improved in v3)*
- **Serial/model extraction** *(v3)*: Detects serial number, model number, SKU, UPC, EAN, ASIN, part number patterns

---

## Implemented Improvements (v3)

### ✅ 1.1 Manual mapping for unmatched pairs
Each unmatched pair now has a dropdown allowing the user to assign it to any available spec field. Manual mappings flow through `buildApplyPayload` and are included when applying to the form.

### ✅ 1.3 Improved price detection
- Non-USD currencies (€, £, ¥) with currency note
- Price ranges ("$2,498.00 - $2,798.00") → uses lower value, shows range note
- Labeled prices: "Sale Price", "MSRP", "List Price", etc. — prefers sale/street price
- Bare numbers in key-value pairs (e.g., "Price: 2498") without dollar sign

### ✅ 1.4 Serial number / model number extraction
Detects common patterns: "Model: XYZ-123", "SKU: ABC456", "Part #: 12345", "Serial Number: ...", "UPC: ...", "ASIN: ..." and maps them to dedicated result fields displayed in the Basic Information section.

### ✅ 2.2 Clipboard paste with HTML preservation
When pasting from a browser, the `onPaste` handler checks for `text/html` in the clipboard. If HTML content has more table structure (tab-separated lines), it uses the cleaned HTML version for better spec extraction from retailer pages.

### ✅ 3.1 Confidence threshold control
Three-button mode selector (Strict/Balanced/Aggressive) filters which matches are displayed. Strict mode (≥85) shows only high-confidence direct matches; Aggressive (≥50) shows everything the fuzzy matcher found.

### ✅ 1.2 Multi-value field merging
When multiple direct-match candidates (≥85 confidence) target the same spec field with similar confidence levels (within 10 points), their values are merged with comma separation. A "Combined ×N" badge displays on merged fields.

### ✅ 3.2 Editable brand/category override
Brand is now an editable text input; Category is a dropdown populated from the specs config. Changing the category instantly re-orders the spec field list to match the new category. Overrides flow through to `buildApplyPayload`. A reset button restores the auto-detected value.

### ✅ 4.2 Value range validation
Known spec fields are validated against expected ranges (Weight ≤100kg, Focal Length ≤2000mm, Aperture f/0.7–f/128, Power ≤20kW, Screen ≤100", etc.). Out-of-range values show a yellow warning icon and message rather than being rejected.

### ✅ 4.3 Duplicate field detection
When multiple candidates match the same spec field with different values and similar confidence (within 15 points), a "⚠ Conflict" badge replaces the confidence badge. The alternatives dropdown shows "conflicts" instead of "options" so users can pick the correct value.

### ✅ 3.3 Side-by-side source view
Toggle button shows the cleaned source text alongside parsed results in a split panel. Source lines are color-coded: green border = matched to a spec field, yellow border = extracted but unmatched, dimmed = ignored. Clicking a spec field name in the results panel scrolls to and highlights the corresponding source line. Modal widens to 1200px when source view is active.

### ✅ 3.4 Paste history / quick re-import
Last 5 paste operations are stored in sessionStorage with product name, matched field count, and timestamp. When the textarea is empty, a "Recent Imports" panel appears above it allowing one-click restore of previous imports.

### ✅ 4.1 Unit normalization
A "Units" toggle in the toolbar enables metric conversion hints on matched fields. Supports: inches↔mm, lbs/oz→g/kg, °F→°C, compound weights ("1 lb 5 oz"→"595 g"), and dimension strings ("6.5 x 4.3 x 3.1 inches"→"165 × 109 × 79 mm"). Shows "normalized: ..." below the value without replacing it.

### ✅ 4.4 Smart field type coercion
Post-processing detects boolean fields (weather sealing, touchscreen, etc.) and normalizes "True/Included/Available" → "Yes", "False/N/A" → "No". Normalizes CCT ranges ("2700K-6500K" → "2700–6500 K"), adds f/ prefix to bare aperture numbers. Shows "suggestion: ..." below the value.

### ✅ 5.1 Batch import for multiple items
Parser auto-detects multi-product content via boundary patterns (horizontal rules, markdown headings, "Product Name:" labels, brand-name lines after blank lines). When multiple products are found, a selection UI shows each product with name, brand, category, field count, and price. Users can select/deselect products for batch import or click "Edit" to view a single product in detail. `onApply` receives an array of payloads for batch mode.

### ✅ 2.1 URL paste + fetch
A third "From URL" input tab allows entering a product page URL. The modal auto-constructs the Edge Function URL from `VITE_SUPABASE_URL`. The `fetch-product-page` Edge Function handles CORS, extracts JSON-LD structured data and Open Graph metadata before falling back to full HTML-to-text conversion. Supports domain allowlisting, timeout, and content size limits. Converts HTML tables to tab-separated values for optimal parser compatibility.

### ✅ 5.2 Re-import / spec update workflow
A `diffSpecs()` engine compares new parse results against existing item specs, categorizing each field as added/changed/removed/unchanged. When `existingItem` prop is passed to SmartPasteModal, a "Compare with existing" button appears in the action bar. The diff view uses color-coded indicators: `+` green for added, `~` yellow for changed (with strikethrough on old value), `-` red for removed.

### ✅ 5.3 Community alias database
`recordAlias()` fires automatically when a user manually maps an unmatched field, recording the source key → spec name mapping via Supabase RPC. `fetchCommunityAliases()` loads on modal mount and injects community-learned aliases into the parser's Pass 1 lookup at priority 55–75 (scaling with usage count). SQL migration includes the `smart_paste_aliases` table with upsert RPC, RLS policies, and a cleanup function for pruning stale low-usage aliases.

---

## Remaining Planned Improvements

### Phase 1 — Matching Quality

**~~1.1 Manual mapping for unmatched pairs~~** ✅ Implemented in v3

**~~1.2 Multi-value field merging~~** ✅ Implemented in v3.1
Some specs appear multiple times with different values (e.g., "Video Resolution: 4K 60p" and "Video Resolution: 1080p 120p"). The parser should detect these and concatenate rather than picking just one.

- In Pass 3, when multiple candidates share the same sourceKey pattern, merge their values with a comma separator
- Only merge when confidence levels are similar (within 10 points)
- Present merged values with a badge indicating "Combined from N sources"

**~~1.3 Improved price detection~~** ✅ Implemented in v3

**~~1.4 Serial number / model number extraction~~** ✅ Implemented in v3

---

### Phase 2 — Input Handling

**~~2.1 URL paste + fetch~~** ✅ Implemented in v3.3 (client-side ready, requires Edge Function proxy)

**~~2.2 Clipboard paste with HTML preservation~~** ✅ Implemented in v3

**~~2.3 Image-to-text (OCR) for spec sheet photos~~**
⏳ Deferred — requires Tesseract.js WASM bundle (~2MB). Client-side architecture planned but not yet integrated.

---

### Phase 3 — UI/UX Refinements

**~~3.1 Confidence threshold control~~** ✅ Implemented in v3

**~~3.2 Editable brand/category override~~** ✅ Implemented in v3.1

**~~3.3 Side-by-side source view~~** ✅ Implemented in v3.2

**~~3.4 Paste history / quick re-import~~** ✅ Implemented in v3.2

---

### Phase 4 — Data Quality

**~~4.1 Unit normalization~~** ✅ Implemented in v3.2

**~~4.2 Value validation against known ranges~~** ✅ Implemented in v3.1

**~~4.3 Duplicate field detection~~** ✅ Implemented in v3.1

**~~4.4 Smart field type coercion~~** ✅ Implemented in v3.2

---

### Phase 5 — Integration & Automation

**~~5.1 Batch import for multiple items~~** ✅ Implemented in v3.3

**~~5.2 Re-import / spec update workflow~~** ✅ Implemented in v3.3 (diff engine + UI, pass `existingItem` prop to activate)

**~~5.3 Community alias database~~** ✅ Implemented in v3.3 (client stubs ready, requires Supabase table + RPC function)

---

## Priority Order

| Priority | Item | Effort | Impact | Status |
|----------|------|--------|--------|--------|
| ~~1~~ | ~~1.1 Manual mapping for unmatched~~ | ~~Low~~ | ~~High~~ | ✅ v3 |
| ~~2~~ | ~~2.2 Clipboard HTML preservation~~ | ~~Low~~ | ~~High~~ | ✅ v3 |
| ~~3~~ | ~~3.1 Confidence threshold control~~ | ~~Low~~ | ~~Medium~~ | ✅ v3 |
| ~~4~~ | ~~3.2 Editable brand/category~~ | ~~Medium~~ | ~~High~~ | ✅ v3.1 |
| ~~5~~ | ~~1.2 Multi-value merging~~ | ~~Medium~~ | ~~Medium~~ | ✅ v3.1 |
| ~~6~~ | ~~1.3 Improved price detection~~ | ~~Low~~ | ~~Medium~~ | ✅ v3 |
| ~~7~~ | ~~4.3 Duplicate field detection~~ | ~~Medium~~ | ~~Medium~~ | ✅ v3.1 |
| ~~8~~ | ~~1.4 Serial/model extraction~~ | ~~Low~~ | ~~Medium~~ | ✅ v3 |
| ~~9~~ | ~~3.3 Side-by-side source view~~ | ~~Medium~~ | ~~Medium~~ | ✅ v3.2 |
| ~~10~~ | ~~4.1 Unit normalization~~ | ~~Medium~~ | ~~Medium~~ | ✅ v3.2 |
| ~~11~~ | ~~4.4 Smart field type coercion~~ | ~~Medium~~ | ~~Medium~~ | ✅ v3.2 |
| ~~12~~ | ~~2.1 URL paste + fetch~~ | ~~High~~ | ~~High~~ | ✅ v3.4 |
| ~~13~~ | ~~4.2 Value range validation~~ | ~~Low~~ | ~~Low~~ | ✅ v3.1 |
| ~~14~~ | ~~3.4 Paste history~~ | ~~Low~~ | ~~Low~~ | ✅ v3.2 |
| 15 | 2.3 Image OCR | High | Medium | ⏳ Deferred |
| ~~16~~ | ~~5.1 Batch import~~ | ~~High~~ | ~~Medium~~ | ✅ v3.3 |
| ~~17~~ | ~~5.2 Re-import workflow~~ | ~~High~~ | ~~Medium~~ | ✅ v3.3 |
| ~~18~~ | ~~5.3 Community alias database~~ | ~~High~~ | ~~Low~~ | ✅ v3.4 |
