// =============================================================================
// SIMS Library Exports
// Storage only. The supabase/services/context re-exports that used to live
// here had no importers — every consumer imports those from their homes
// directly — and dragged the whole service layer into any chunk that only
// needed storage helpers. Trimmed in the 2026-08-14 dead-export sweep.
// =============================================================================

export { storageService, isStorageUrl, getStoragePathFromUrl, getThumbnailUrl } from './storage.js';
