import type { WebSocket } from "ws";

// Extended WebSocket with custom properties
export interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  playerId: string | null;
  roomId: string | null;
}

// Message Types
export type MessageType =
  | "JOIN_ROOM"
  | "JOIN_BY_CODE"
  | "CREATE_ROOM"
  | "SYNC_STATE"
  | "START_GAME"
  | "SELECT_WORD"
  | "DRAW"
  | "CLEAR_CANVAS"
  | "SEND_MESSAGE"
  | "NEXT_TURN";

// Payload Types
export interface JoinRoomPayload {
  username: string;
}

export interface JoinByCodePayload {
  username: string;
  code: string;
}

export interface CreateRoomPayload {
  username: string;
}

export interface SyncStatePayload {
  roomId: string;
  playerId: string;
}

export interface StartGamePayload {
  roomId?: string;
}

export interface SelectWordPayload {
  word: string;
}

export interface DrawPayload {
  x: number;
  y: number;
  color?: string;
  size?: number;
  tool?: string;
}

export interface SendMessagePayload {
  message: string;
}

export interface NextTurnPayload {
  roomId?: string;
}

// WebSocket Message Structure
export interface WebSocketMessage {
  type: MessageType;
  payload: unknown;
}

// Response Types
export interface RoomJoinedResponse {
  roomId: string;
  roomCode: string;
  playerId: string;
  players: unknown[];
  creatorName?: string;
  gameStarted?: boolean;
  currentDrawer?: string;
  currentDrawerId?: string | null;
  wordHint?: string;
  roundNumber?: number;
  maxRounds?: number;
}

export interface ErrorResponse {
  message: string;
}

