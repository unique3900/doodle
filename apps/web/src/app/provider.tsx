"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getWebSocketClient } from '@monorepo/utils/websocket-client';

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (message: string) => void;
};

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
});

const Providers = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    const websocketClient = getWebSocketClient();

    websocketClient
      .connect()
      .then(() => {
        setClient(websocketClient);
        setIsConnected(true);
      })
      .catch((error: any) => {
        console.error('Failed to connect to websocket:', error);
      });

    return () => {
      websocketClient?.disconnect?.();
    };
  }, []);

  const sendMessage = (message: string) => {
    if (!client || !isConnected) {
      console.warn("WebSocket not connected. Can't send message.");
      return;
    }
    client.send(message);
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);

export default Providers;
