import React from 'react'
import ReactDOM from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import { DataProvider } from './lib/DataContext.jsx'
import { PWAProvider } from './lib/PWAContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { SidebarProvider } from './contexts/SidebarContext.jsx'
import { ModalProvider } from './contexts/ModalContext.jsx'
import { FilterProvider } from './contexts/FilterContext.jsx'
import { NavigationProviderWithData } from './contexts/NavigationContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <PWAProvider>
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
