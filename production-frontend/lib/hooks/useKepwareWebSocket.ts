import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Fallback to determine base WS URL
const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;

  // Try to derive from Next.js hostname in browser
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in development with proxy, connect to same host/port and the proxy will handle it
    // Wait, the next.config.ts proxy is for HTTP (/api/v1). WebSocket proxying in Next.js dev server can be tricky.
    // It's safer to connect directly to the backend if we know where it is, or configure Next.js to proxy WS.
    // Assuming backend is at 127.0.0.1:8000 for local dev
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
       return `ws://127.0.0.1:8000/api/v1`;
    }
    return `${protocol}//${window.location.host}/api/v1`;
  }
  return 'ws://127.0.0.1:8000/api/v1'; // fallback
};

export const useKepwareWebSocket = (type: 'extruder' | 'mill', lineNo: number | null) => {
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!lineNo) return;

    const connect = () => {
      const wsUrl = `${getWsUrl()}/ws/${type}/${lineNo}`;
      console.log(`🔌 Connecting to Kepware WS: ${wsUrl}`);
      ws.current = new WebSocket(wsUrl);

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // 🚀 Push real-time data directly into React Query Cache
          // This will instantly update any component using useQuery(['kepwareLive', type, lineNo])
          queryClient.setQueryData(['kepwareLive', type, lineNo], data);
        } catch (error) {
          console.error("❌ Failed to parse WS message", error);
        }
      };

      ws.current.onclose = () => {
        console.warn("⚠️ Kepware WS disconnected. Reconnecting in 3 seconds...");
        // Auto-reconnect logic
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error("❌ Kepware WS error:", error);
        ws.current?.close(); // Trigger onclose
      };
    };

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        // Disable onclose to prevent auto-reconnect on unmount
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [type, lineNo, queryClient]);
};
