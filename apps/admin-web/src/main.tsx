import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import 'flag-icons/css/flag-icons.min.css';
import '@radix-ui/themes/styles.css';
import './app/admin-global.scss';
import { Theme } from '@radix-ui/themes';
import { BrowserRouter } from 'react-router';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { AdminApp } from './app/admin-app';
import { Toaster } from './app/components/toaster/toaster';
import { toast } from './app/store/toast-store';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => toast.error(error.message),
  }),
  mutationCache: new MutationCache({
    onError: (error) => toast.error(error.message),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme>
        <Toaster />
        <BrowserRouter>
          <AdminApp />
        </BrowserRouter>
      </Theme>
    </QueryClientProvider>
  </StrictMode>,
);
