// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  // สร้าง QueryClient ครั้งเดียวในวงจรชีวิตของแอป
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // ข้อมูลจะถือว่า "สด" อยู่ 1 นาที
        retry: 1,            // ถ้า API พัง ให้ลองใหม่ 1 ครั้ง
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}