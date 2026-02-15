// ============================================================================
// Smart Paste — Public API
// Re-exports all public functions for backward-compatible imports
// ============================================================================

// Constants
export { KNOWN_BRANDS, CATEGORY_KEYWORDS, COMMON_ALIASES, CONFIDENCE } from './constants.js';

// Text preprocessing
export { cleanInputText } from './textCleaner.js';

// File I/O
export { readTextFile, readPdfFile } from './fileReaders.js';

// Fuzzy matching (exported for testability)
export { normalize, expandAbbreviations, levenshtein, similarityScore } from './fuzzyMatch.js';

// Alias map
export { buildSpecAliasMap } from './aliasMap.js';

// Core parser
export { parseProductText } from './parser.js';

// Unit normalization & type coercion
export { normalizeUnits, coerceFieldValue } from './unitNormalizer.js';

// Apply payload
export { buildApplyPayload } from './applyPayload.js';

// Batch parsing
export { detectProductBoundaries, parseBatchProducts } from './batchParser.js';

// URL fetching
export { fetchProductPage } from './urlFetcher.js';

// Diff engine
export { diffSpecs } from './diffEngine.js';

// Community aliases
export { recordAlias, fetchCommunityAliases } from './communityAliases.js';

// OCR
export { ocrImage, terminateOCR } from './ocr.js';
