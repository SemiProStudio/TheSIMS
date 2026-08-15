import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DataProvider } from './contexts/DataContext.jsx';
import { PWAProvider } from './contexts/PWAContext.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { SidebarProvider } from './contexts/SidebarContext.jsx';
import { ModalProvider } from './contexts/ModalContext.jsx';
import { FilterProvider } from './contexts/FilterContext.jsx';
import { NavigationProviderWithData } from './contexts/NavigationContext.jsx';
import { initErrorTracking } from './lib/errorTracking.js';
import './index.css';

// Error tracking boots with the app. Without VITE_SENTRY_DSN this is a
// silent no-op — the module shipped fully built but was never initialized,
// so the app had NO error reporting despite the README claiming Sentry.
initErrorTracking().catch(() => {});

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

const isDev = import.meta.env.DEV;
const Wrapper = isDev ? React.StrictMode : React.Fragment;

ReactDOM.createRoot(document.getElementById('root')).render(
  <Wrapper>
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
  </Wrapper>,
);
