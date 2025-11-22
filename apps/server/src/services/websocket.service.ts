import WebSocket from "ws";
import type { Server } from "http";
import type { GameManagerInstance } from "../types/game-manager.types";
import type { ExtendedWebSocket } from "../types/websocket.types";
import { parseMessage, sendError } from "../utils/websocket.utils";
import { handleMessage } from "../handlers/message.router";
import { handlePlayerDisconnect } from "../handlers/websocket.handlers";

/**
 * Initialize WebSocket server and set up event handlers
 */
export function initializeWebSocketServer(
  server: Server,
  gameManager: GameManagerInstance
): WebSocket.Server {
  const wss = new WebSocket.Server({ server });

  // Connection handler
  wss.on("connection", (ws: WebSocket) => {
    const extWs = ws as ExtendedWebSocket;
    console.log("New WebSocket connection");

    // Initialize custom properties
    extWs.isAlive = true;
    extWs.playerId = null;
    extWs.roomId = null;

    // Ping handler
    extWs.on("ping", () => {
      extWs.isAlive = true;
    });

    // Message handler
    extWs.on("message", (message: WebSocket.Data) => {
      const data = parseMessage(message.toString());
      if (data) {
        handleMessage(extWs, data, gameManager, wss);
      } else {
        sendError(extWs, "Invalid message format");
      }
    });

    // Close handler
    extWs.on("close",(code: number, reason: Buffer) => {
      console.log(`Disconnect - Code: ${code}, Reason: ${reason.toString()}, Player: ${extWs.playerId}`);
      if (extWs.playerId && extWs.roomId) {
        handlePlayerDisconnect(extWs, gameManager, wss);
      }
    });

    // Error handler
    extWs.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
    });
  });

  // Heartbeat to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000); // 30 seconds

  // Cleanup on server close
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

