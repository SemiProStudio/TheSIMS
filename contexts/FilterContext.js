// =============================================================================
// FilterContext - Context object and hook (non-component exports)
// Separated from FilterContext.jsx to enable React Fast Refresh
// =============================================================================

import { createContext, useContext } from 'react';

const FilterContext = createContext(null);

export function useFilterContext() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilterContext must be used within FilterProvider');
  return ctx;
}

export default FilterContext;
