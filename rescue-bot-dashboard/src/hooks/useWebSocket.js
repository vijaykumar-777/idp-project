import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url) {
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [sensorData, setSensorData] = useState(null);
  const [packetRate, setPacketRate] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000);
  
  const packetCountRef = useRef(0);
  const lastPacketTimeRef = useRef(Date.now());

  const connect = useCallback(() => {
    if (!url) return;
    
    setWsStatus('connecting');
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setWsStatus('connected');
      backoffRef.current = 1000; // reset backoff
      packetCountRef.current = 0;
      lastPacketTimeRef.current = Date.now();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSensorData(data);
        
        // Calculate packet rate
        packetCountRef.current += 1;
        const now = Date.now();
        const diff = now - lastPacketTimeRef.current;
        if (diff >= 1000) {
          setPacketRate(Math.round((packetCountRef.current / diff) * 1000));
          packetCountRef.current = 0;
          lastPacketTimeRef.current = now;
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      
      // Exponential backoff reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, 30000); // max 30s
        connect();
      }, backoffRef.current);
    };

    ws.onerror = (err) => {
      // ws.onclose will be called after this
      console.error("WebSocket error:", err);
      ws.close();
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendCommand = useCallback((dir, speed) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ cmd: 'move', dir, speed }));
    }
  }, []);

  return { sensorData, wsStatus, sendCommand, packetRate };
}
