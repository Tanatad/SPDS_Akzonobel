import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Fallback to determine base WS URL
const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!lineNo) return;

    const connect = () => {
      const wsUrl = `${getWsUrl()}/ws/${type}/${lineNo}`;
      console.log(`🔌 Connecting to Kepware WS: ${wsUrl}`);
      ws.current = new WebSocket(wsUrl);


      ws.current.onopen = () => {
        setIsConnected(true);
      };

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
        setIsConnected(false);
        console.warn("⚠️ Kepware WS disconnected. Reconnecting in 3 seconds...");
        // Auto-reconnect logic
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error("❌ Kepware WS connection failed, attempting to reconnect...");
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

  return { isConnected };
};
