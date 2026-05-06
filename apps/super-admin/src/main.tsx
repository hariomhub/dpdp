import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { router } from './app/routes'
import { AppProvider } from './app/context/AppContext'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              borderRadius: '10px',
              background: '#1e293b',
              color: '#f8fafc',
              padding: '12px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#f8fafc',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f8fafc',
              },
            },
          }}
        />
      </AppProvider>
    </QueryClientProvider>
  </React.StrictMode>
)