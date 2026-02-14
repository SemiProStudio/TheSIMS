// =============================================================================
// DataContext - Context object and hook (non-component exports)
// Separated from DataContext.jsx to enable React Fast Refresh
// =============================================================================

import { createContext, useContext } from 'react';

const DataContext = createContext(null);

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export default DataContext;
