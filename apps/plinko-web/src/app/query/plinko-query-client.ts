import { QueryClient } from '@tanstack/react-query';

export const plinkoQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
