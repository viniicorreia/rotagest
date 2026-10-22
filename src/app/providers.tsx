import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { toast, Toaster } from 'sonner';
import { ApiError, setReadOnlyHandler } from '@/api/client';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // Erros de autorização/validação não melhoram com nova tentativa.
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );
  // Modo suporte: toda escrita volta 403 SUPPORT_READ_ONLY. Um id fixo evita empilhar o mesmo aviso.
  useEffect(() => {
    setReadOnlyHandler((message) => toast.error(message, { id: 'support-read-only' }));
    return () => setReadOnlyHandler(null);
  }, []);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster richColors position="top-center" closeButton />
    </QueryClientProvider>
  );
}
