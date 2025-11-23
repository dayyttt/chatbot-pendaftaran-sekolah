import { useEffect, useRef } from 'react';

export function useWebSocket(url, onMessage) {
  const ws = useRef(null);

  useEffect(() => {
    // Buat koneksi WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${url}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Cleanup function
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url, onMessage]);

  return ws.current;
}
