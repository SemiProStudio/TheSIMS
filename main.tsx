import React from 'react'
import ReactDOM from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { PWAProvider } from './contexts/PWAContext'
import UpdateBanner from './components/UpdateBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './contexts/ToastContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ModalProvider } from './contexts/ModalContext'
import { FilterProvider } from './contexts/FilterContext'
import { NavigationProviderWithData } from './contexts/NavigationContext'
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
      <ToastProvider>
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
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
