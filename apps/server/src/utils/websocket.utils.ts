import WebSocket from "ws";
import type { ExtendedWebSocket } from "../types/websocket.types";

/**
 * Send a message to a WebSocket client
 */
export function send(
  ws: ExtendedWebSocket,
  type: string,
  payload: unknown
): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

/**
 * Send an error message to a WebSocket client
 */
export function sendError(ws: ExtendedWebSocket, message: string): void {
  send(ws, "ERROR", { message });
}

/**
 * Broadcast a message to all clients in a room
 */
export function broadcastToRoom(
  wss: WebSocket.Server,
  roomId: string,
  type: string,
  payload: unknown,
  excludeWs: ExtendedWebSocket | null = null
): void {
  wss.clients.forEach((client) => {
    const extClient = client as ExtendedWebSocket;
    if (
      extClient.roomId === roomId &&
      extClient !== excludeWs &&
      extClient.readyState === WebSocket.OPEN
    ) {
      send(extClient, type, payload);
    }
  });
}

/**
 * Parse WebSocket message safely
 */
export function parseMessage(message: string): {
  type: string;
  payload: unknown;
} | null {
  try {
    const data = JSON.parse(message);
    return data;
  } catch (error) {
    console.error("[WebSocket] Error parsing message:", error);
    return null;
  }
}

