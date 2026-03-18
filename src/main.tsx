import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// App lifecycle handler
function AppLifecycle({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('[App] Initializing app lifecycle handlers');

    // Handle page visibility changes (when app returns from background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App] App became visible, checking for updates');

        // Check if we need to reload due to long background time
        const lastActiveTime = localStorage.getItem('last_active_time');
        if (lastActiveTime) {
          const timeDiff = Date.now() - parseInt(lastActiveTime, 10);
          const hoursSinceActive = timeDiff / (1000 * 60 * 60);

          // If app was backgrounded for more than 2 hours, reload
          if (hoursSinceActive > 2) {
            console.log('[App] App was inactive for', hoursSinceActive.toFixed(1), 'hours, reloading');
            window.location.reload();
            return;
          }
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries();
      } else {
        // Store the time when app goes to background
        localStorage.setItem('last_active_time', Date.now().toString());
        console.log('[App] App went to background');
      }
    };

    // Handle app resume from background (iOS specific)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('[App] Page restored from cache, reloading');
        window.location.reload();
      }
    };

    // Handle errors globally
    const handleError = (event: ErrorEvent) => {
      console.error('[App] Global error:', event.error);
      // Don't prevent default - let ErrorBoundary catch it
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[App] Unhandled promise rejection:', event.reason);
    };

    // Service worker update handler
    const handleServiceWorkerUpdate = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[App] New service worker available, will reload on next visit');
                  }
                });
              }
            });
          }
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    handleServiceWorkerUpdate();

    // Set initial active time
    localStorage.setItem('last_active_time', Date.now().toString());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppLifecycle>
          <App />
        </AppLifecycle>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
