import type WebSocket from "ws";
import type { GameManagerInstance } from "../types/game-manager.types";
import type { ExtendedWebSocket, MessageType } from "../types/websocket.types";
import { sendError } from "../utils/websocket.utils";
import * as handlers from "./websocket.handlers";

/**
 * Route incoming WebSocket messages to appropriate handlers
 */
export function handleMessage(
  ws: ExtendedWebSocket,
  data: { type: string; payload: unknown },
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  const { type, payload } = data;

  switch (type as MessageType) {
    case "JOIN_ROOM":
      handlers.handleJoinRoom(ws, payload, gameManager, wss);
      break;
    case "JOIN_BY_CODE":
      handlers.handleJoinByCode(ws, payload, gameManager, wss);
      break;
    case "CREATE_ROOM":
      handlers.handleCreateRoom(ws, payload, gameManager);
      break;
    case "SYNC_STATE":
      handlers.handleSyncState(ws, payload, gameManager);
      break;
    case "START_GAME":
      handlers.handleStartGame(ws, gameManager, wss);
      break;
    case "SELECT_WORD":
      handlers.handleSelectWord(ws, payload, gameManager, wss);
      break;
    case "DRAW":
      handlers.handleDraw(ws, payload, gameManager, wss);
      break;
    case "CLEAR_CANVAS":
      handlers.handleClearCanvas(ws, gameManager, wss);
      break;
    case "SEND_MESSAGE":
      handlers.handleSendMessage(ws, payload, gameManager, wss);
      break;
    case "NEXT_TURN":
      handlers.handleNextTurn(ws, gameManager, wss);
      break;
    default:
      sendError(ws, "Unknown message type");
  }
}

