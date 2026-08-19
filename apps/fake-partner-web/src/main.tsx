import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import 'flag-icons/css/flag-icons.min.css';
import '@radix-ui/themes/styles.css';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartnerTheme } from './app/components/partner-theme/partner-theme';
import { PartnerApp } from './app/partner-app';
import './app/partner-global.scss';

const queryClient = new QueryClient({
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
      <PartnerTheme>
        <BrowserRouter>
          <PartnerApp />
        </BrowserRouter>
      </PartnerTheme>
    </QueryClientProvider>
  </StrictMode>,
);
