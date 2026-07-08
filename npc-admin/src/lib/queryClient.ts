import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,         // 2 min
      gcTime: 1000 * 60 * 10,           // 10 min
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        const err = error as { response?: { status?: number } };
        // Don't retry on 4xx errors
        if (err?.response?.status && err.response.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
