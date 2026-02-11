import React from 'react'
import ReactDOM from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import { DataProvider } from './lib/DataContext.jsx'
import { PWAProvider } from './lib/PWAContext.jsx'
import UpdateBanner from './components/UpdateBanner.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { SidebarProvider } from './contexts/SidebarContext.jsx'
import { ModalProvider } from './contexts/ModalContext.jsx'
import { FilterProvider } from './contexts/FilterContext.jsx'
import { NavigationProviderWithData } from './contexts/NavigationContext.jsx'
import './index.css'

// Handle stale chunk errors after deployments — force one reload to get fresh assets
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Importing a module script failed') ||
    event.error?.name === 'ChunkLoadError'
  ) {
    const reloaded = sessionStorage.getItem('chunk-reload');
    if (!reloaded) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
    }
  }
});
// Clear the reload flag on successful load so future deploys can trigger it again
sessionStorage.removeItem('chunk-reload');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <PWAProvider>
          <UpdateBanner />
          <AuthProvider>
            <DataProvider>
              <SidebarProvider>
                <ModalProvider>
                  <FilterProvider>
                    <NavigationProviderWithData>
                      <App />
                      <SpeedInsights />
                    </NavigationProviderWithData>
                  </FilterProvider>
                </ModalProvider>
              </SidebarProvider>
            </DataProvider>
          </AuthProvider>
        </PWAProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
