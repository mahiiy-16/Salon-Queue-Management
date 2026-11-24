import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';

type QueueListener = (data?: any) => void;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToQueue: (listener: QueueListener) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  subscribeToQueue: () => () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const listenersRef = useRef<Set<QueueListener>>(new Set());

  // Subscribe helper for components to receive queue updates either via WebSocket or Polling
  const subscribeToQueue = useCallback((listener: QueueListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const notifyListeners = useCallback((data?: any) => {
    listenersRef.current.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error('[SocketContext] Listener error:', err);
      }
    });
  }, []);

  useEffect(() => {
    let socketInstance: Socket | null = null;
    try {
      socketInstance = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
      });

      socketInstance.on('queue:updated', (data: any) => {
        notifyListeners(data);
      });

      setSocket(socketInstance);
    } catch (err) {
      console.warn('[SocketContext] Socket initialization skipped or failed:', err);
    }

    // Fallback polling interval:
    // On Vercel Serverless where WebSocket connections are not persistent,
    // fire queue updates every 4 seconds so all 7 screens stay synchronized.
    const pollInterval = setInterval(() => {
      // If socket is not connected or in serverless environment, notify subscribers to refresh
      notifyListeners({ type: 'POLL_SYNC', timestamp: Date.now() });
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [notifyListeners]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, subscribeToQueue }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => useContext(SocketContext);
