import { QueryClient } from '@tanstack/react-query';

export const kenoQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
