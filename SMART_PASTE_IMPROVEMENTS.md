# Smart Paste — Improvement Plan

This document tracks planned enhancements for the Smart Paste feature, which imports product specifications from pasted text, PDF files, and TXT files into inventory item forms.

**Current implementation:** `lib/smartPasteParser.js` (parser engine) + `modals/SmartPasteModal.jsx` (UI)

---

## Current Capabilities (v2)

- **Text input**: Paste text tab with monospace textarea
- **File import**: Drag-and-drop zone for PDF, TXT, CSV, TSV, Markdown, RTF
- **Extraction patterns**: `Key: Value`, `Key\tValue`, `Key | Value`, `Key = Value`, `Key → Value`, `Key – Value`, consecutive-line detection
- **HTML cleaning**: Table-to-tab conversion, definition list handling, non-text element stripping (images, SVGs, scripts, nav, footer, buttons, comments)
- **PDF parsing**: pdf.js (CDN-loaded) with line grouping by Y-position and gap-based tab insertion
- **Matching strategies**: Direct alias map lookup → abbreviation expansion → Levenshtein fuzzy matching → token overlap scoring
- **Result display**: Category-aware field ordering, confidence badges (Direct/Likely/Fuzzy), alternative selection dropdowns, required field indicators, matched-from source hints
- **Brand/category/price detection**: 120+ known brands, 11 category keyword sets, regex price extraction

---

## Planned Improvements

### Phase 1 — Matching Quality

**1.1 Manual mapping for unmatched pairs**
Currently, extracted pairs that don't match any spec field are displayed in a read-only "unmatched" list. Add a dropdown on each unmatched pair allowing the user to manually assign it to any spec field. This captures data the fuzzy matcher missed.

- Add a Select dropdown per unmatched pair with all spec field names as options
- When an unmatched pair is assigned, move it from the unmatched list to the matched results
- Store manual assignments in selectedValues state so they flow through buildApplyPayload

**1.2 Multi-value field merging**
Some specs appear multiple times with different values (e.g., "Video Resolution: 4K 60p" and "Video Resolution: 1080p 120p"). The parser should detect these and concatenate rather than picking just one.

- In Pass 3, when multiple candidates share the same sourceKey pattern, merge their values with a comma separator
- Only merge when confidence levels are similar (within 10 points)
- Present merged values with a badge indicating "Combined from N sources"

**1.3 Improved price detection**
Current regex only catches `$X,XXX.XX` format. Extend to handle:
- Non-USD currencies (€, £, ¥) with conversion note
- Price ranges ("$2,498.00 - $2,798.00" → use lower value)
- "MSRP", "List Price", "Sale Price" labels — prefer sale price
- Prices in key-value pairs (e.g., "Price: 2498") without dollar sign

**1.4 Serial number / model number extraction**
Detect common patterns like "Model: XYZ-123", "SKU: ABC456", "Part #: 12345" and map them to the item's serial number or model fields if present, rather than filtering these as noise.

---

### Phase 2 — Input Handling

**2.1 URL paste + fetch**
Add a third tab "Import from URL" that accepts a product page URL and fetches the page content.

- Use a Supabase Edge Function as a proxy to avoid CORS
- Edge Function fetches the URL, extracts text content (or returns raw HTML for client-side cleaning)
- Auto-parse after fetch completes
- Show the source URL in the results for reference

**2.2 Clipboard paste with HTML preservation**
When pasting from a browser, the clipboard often contains rich HTML. Intercept the paste event and prefer `text/html` from the clipboard over `text/plain`, then run it through cleanInputText for better table structure preservation.

- Add `onPaste` handler to the textarea
- Check `clipboardData.types` for `text/html`
- If present, use the HTML version through cleanInputText
- Fall back to plain text if no HTML available

**2.3 Image-to-text (OCR) for spec sheet photos**
For photographed spec sheets or screenshots, add basic OCR capability.

- Use Tesseract.js (WASM-based, client-side)
- Add a fourth input tab or integrate into the file import tab for image files
- Pre-process images (grayscale, contrast enhancement) before OCR
- Lower confidence scores for OCR-derived pairs (inherently noisier)

---

### Phase 3 — UI/UX Refinements

**3.1 Confidence threshold control**
Add a slider or toggle for "Strict" (only ≥85 confidence) vs "Balanced" (≥60) vs "Aggressive" (≥50) matching modes. Users with clean input (retailer spec tables) can use strict; users with messy PDF text can use aggressive.

- Add a mode selector above the results
- Filter displayed results by the selected threshold
- Default to "Balanced" (≥60)
- Remember preference in localStorage

**3.2 Editable brand/category override**
If the user manually corrects the detected brand or category in the results panel, the UI should re-filter which spec fields are shown and potentially re-run category-aware matching.

- Make Brand and Category fields in the Basic Information section editable (click to edit)
- On category change, rebuild the ordered field list with the new category's specs
- Optionally re-run Pass 2 fuzzy matching with the corrected category for better cross-category penalty scoring

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

**4.2 Value validation against known ranges**
For well-known spec fields, validate that extracted values fall within reasonable ranges.

- Weight: flag if > 100kg for most categories (likely parsing error)
- Focal length: flag if non-numeric or > 2000mm
- Aperture: flag if not in f/X.X format
- Show a warning badge on suspicious values rather than rejecting them

**4.3 Duplicate field detection**
When the same spec field gets matched by multiple source keys with different values, surface this as a conflict rather than silently picking the highest-confidence match.

- Show a "⚠ Conflict" badge instead of a confidence badge
- Display all conflicting values with their sources
- Let the user pick which one to use

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

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | 1.1 Manual mapping for unmatched | Low | High |
| 2 | 2.2 Clipboard HTML preservation | Low | High |
| 3 | 3.1 Confidence threshold control | Low | Medium |
| 4 | 3.2 Editable brand/category | Medium | High |
| 5 | 1.2 Multi-value merging | Medium | Medium |
| 6 | 1.3 Improved price detection | Low | Medium |
| 7 | 4.3 Duplicate field detection | Medium | Medium |
| 8 | 1.4 Serial/model extraction | Low | Medium |
| 9 | 3.3 Side-by-side source view | Medium | Medium |
| 10 | 4.1 Unit normalization | Medium | Medium |
| 11 | 4.4 Smart field type coercion | Medium | Medium |
| 12 | 2.1 URL paste + fetch | High | High |
| 13 | 4.2 Value range validation | Low | Low |
| 14 | 3.4 Paste history | Low | Low |
| 15 | 2.3 Image OCR | High | Medium |
| 16 | 5.1 Batch import | High | Medium |
| 17 | 5.2 Re-import workflow | High | Medium |
| 18 | 5.3 Community alias database | High | Low |
