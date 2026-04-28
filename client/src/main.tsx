import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './pages/router';
import { useAuthStore } from './store/authStore';
import './index.css';

const queryClient = new QueryClient();

function AppBootstrap() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <AppRouter />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppBootstrap />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
