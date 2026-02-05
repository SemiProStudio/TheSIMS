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

**2.1 URL paste + fetch**
Add a third tab "Import from URL" that accepts a product page URL and fetches the page content.

- Use a Supabase Edge Function as a proxy to avoid CORS
- Edge Function fetches the URL, extracts text content (or returns raw HTML for client-side cleaning)
- Auto-parse after fetch completes
- Show the source URL in the results for reference

**~~2.2 Clipboard paste with HTML preservation~~** ✅ Implemented in v3

**2.3 Image-to-text (OCR) for spec sheet photos**
For photographed spec sheets or screenshots, add basic OCR capability.

- Use Tesseract.js (WASM-based, client-side)
- Add a fourth input tab or integrate into the file import tab for image files
- Pre-process images (grayscale, contrast enhancement) before OCR
- Lower confidence scores for OCR-derived pairs (inherently noisier)

---

### Phase 3 — UI/UX Refinements

**~~3.1 Confidence threshold control~~** ✅ Implemented in v3

**~~3.2 Editable brand/category override~~** ✅ Implemented in v3.1

**3.3 Side-by-side source view**
Show the original pasted/imported text alongside the parsed results so users can visually verify matches and spot missed data.

- Split the results area: left panel = cleaned source text with matched lines highlighted, right panel = parsed field results
- Clicking a matched field in the right panel scrolls to and highlights the corresponding line in the source
- Unmatched source lines shown in a dimmed style

**3.4 Paste history / quick re-import**
Store the last 5 paste operations (text + results) in sessionStorage so users can quickly re-apply previous imports if they switch categories or make mistakes.

- Store { inputText, parseResult, timestamp } entries
- Show a "Recent imports" dropdown in the input area
- Auto-clear on session end (sessionStorage)

---

### Phase 4 — Data Quality

**4.1 Unit normalization**
Values like "6.55 in" vs "166.4 mm" should be recognized as equivalent dimension formats. Add unit detection and optional normalization.

- Detect common unit patterns: inches/mm/cm, oz/g/kg, lbs/kg, °F/°C
- Offer a toggle to normalize to preferred units (configurable per user)
- Display both original and normalized values when conversion applies

**~~4.2 Value validation against known ranges~~** ✅ Implemented in v3.1

**~~4.3 Duplicate field detection~~** ✅ Implemented in v3.1

**4.4 Smart field type coercion**
Some fields expect specific formats. Add post-processing to coerce extracted values:

- Dimensions: normalize "6.5 x 4.3 x 3.1 inches" to "165 × 109 × 79 mm" or vice versa
- Weight: normalize "1 lb 5 oz" to "595g"
- Boolean fields: normalize "Yes/No/True/False/Included/Not Included" to "Yes" / "No"
- Temperature: normalize "2700K-6500K" to standard CCT range format

---

### Phase 5 — Integration & Automation

**5.1 Batch import for multiple items**
Extend Smart Paste to handle spec sheets that contain multiple products (e.g., a brand's product lineup page).

- Detect product boundaries (repeated "Product Name:" patterns, horizontal rules, page breaks)
- Present a list of detected products and let the user select which to import
- Create multiple inventory items in one operation

**5.2 Re-import / spec update workflow**
For existing items, add a "Check for updates" flow that re-fetches the product page (if URL was stored) and highlights which specs have changed since the last import.

- Store the import source URL on the inventory item
- Compare new parse results against existing specs
- Show a diff view: unchanged / updated / new fields
- Let the user selectively apply updates

**5.3 Community alias database**
Allow the system to learn from user corrections. When a user manually maps an unmatched pair to a spec field, store that mapping for future use.

- New Supabase table: `smart_paste_aliases` with columns (source_key, spec_name, category, usage_count)
- On manual mapping, insert or increment usage_count
- In Pass 1, check community aliases before fuzzy matching
- Only use community aliases with usage_count ≥ 3 (prevent noise)

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
| 9 | 3.3 Side-by-side source view | Medium | Medium | |
| 10 | 4.1 Unit normalization | Medium | Medium | |
| 11 | 4.4 Smart field type coercion | Medium | Medium | |
| 12 | 2.1 URL paste + fetch | High | High | |
| ~~13~~ | ~~4.2 Value range validation~~ | ~~Low~~ | ~~Low~~ | ✅ v3.1 |
| 14 | 3.4 Paste history | Low | Low | |
| 15 | 2.3 Image OCR | High | Medium | |
| 16 | 5.1 Batch import | High | Medium | |
| 17 | 5.2 Re-import workflow | High | Medium | |
| 18 | 5.3 Community alias database | High | Low | |
