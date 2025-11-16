import type WebSocket from "ws";
import type { GameManagerInstance } from "../types/game-manager.types";
import { send, sendError, broadcastToRoom } from "../utils/websocket.utils";
import {
  startAutoGameTimer,
  startWordSelectionTimer,
  startRoundTimer,
  clearAutoStartTimer,
  clearWordSelectionTimer,
  clearRoomTimer,
  advanceTurn,
} from "../services/timer.service";
import type {
  ExtendedWebSocket,
  JoinRoomPayload,
  JoinByCodePayload,
  CreateRoomPayload,
  SyncStatePayload,
  SelectWordPayload,
  DrawPayload,
  SendMessagePayload,
} from "../types/websocket.types";

/**
 * Get creator of a room
 */
function getCreator(roomId: string, gameManager: GameManagerInstance) {
  const room = gameManager.getRoom(roomId);
  if (!room || !room.creatorId) {
    return null;
  }
  return gameManager.getPlayer({ roomId, playerId: room.creatorId });
}

/**
 * Send room joined response with common data
 */
function sendRoomJoinedResponse(
  ws: ExtendedWebSocket,
  room: ReturnType<GameManagerInstance["getRoom"]>,
  player: { id: string; username: string },
  gameManager: GameManagerInstance
) {
  if (!room) return;

  const creator = getCreator(room.id, gameManager);
  const gameStarted = room.state === "playing";

  send(ws, "ROOM_JOINED", {
    roomId: room.id,
    roomCode: room.code,
    playerId: player.id,
    players: gameManager.getPlayers(room.id),
    creatorName: creator?.username,
    gameStarted: gameStarted,
    currentDrawer:
      gameStarted && room.currentDrawerId
        ? gameManager.getPlayer({ roomId: room.id, playerId: room.currentDrawerId })
            ?.username
        : "",
    currentDrawerId: room.currentDrawerId,
    wordHint:
      gameStarted && room.currentWord
        ? gameManager.createWordHint(room.currentWord)
        : "",
    roundNumber: room.roundNumber,
    maxRounds: room.maxRounds,
  });
}

/**
 * Handle joining a random available room
 */
export function handleJoinRoom(
  ws: ExtendedWebSocket,
  payload: unknown,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  const { username } = payload as JoinRoomPayload;

  if (!username || username.trim().length === 0) {
    return sendError(ws, "Username is required");
  }

  // Find or create a public room
  let room = gameManager.findAvailableRoom();

  if (!room) {
    room = gameManager.createRoom(true);
    console.log("Created new public room:", room.code);
  } else {
    console.log("Joined existing public room:", room.code);
  }

  const player = gameManager.addPlayerToRoom(room.id, username, ws);

  if (!player) {
    return sendError(ws, "Room is full or could not join");
  }

  ws.playerId = player.id;
  ws.roomId = room.id;

  console.log("Joined room:", room.code, "as player:", player.username);

  // Send success response to the player
  sendRoomJoinedResponse(ws, room, player, gameManager);

  // Broadcast to all players in the room
  broadcastToRoom(wss, room.id, "PLAYERS_UPDATED", {
    players: gameManager.getPlayers(room.id),
  });

  // Notify others that player joined
  broadcastToRoom(
    wss,
    room.id,
    "PLAYER_JOINED",
    {
      username: player.username,
      playerId: player.id,
    },
    ws
  );

  // Auto Start game if more than 1 player and is not started
  if (room.players.size >= 2 && room.state === "waiting") {
    console.log(
      `[AutoStart] Room ${room.id} has ${room.players.size} players, starting countdown...`
    );
    startAutoGameTimer(room.id, gameManager, wss);
  }
}

/**
 * Handle joining room by code
 */
export function handleJoinByCode(
  ws: ExtendedWebSocket,
  payload: unknown,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  const { username, code } = payload as JoinByCodePayload;

  if (!username || !code) {
    return sendError(ws, "Username and code are required");
  }

  const upperCode = code.toUpperCase();
  const room = gameManager.getRoomByCode(upperCode);

  if (!room) {
    return sendError(ws, "Invalid room code");
  }

  if (room.state === "finished") {
    return sendError(ws, "Game has already finished");
  }

  if (room.players.size >= room.maxPlayers) {
    return sendError(ws, "Room is full");
  }

  const player = gameManager.addPlayerToRoom(room.id, username, ws);

  if (!player) {
    return sendError(ws, "Failed to join room");
  }

  ws.playerId = player.id;
  ws.roomId = room.id;

  console.log("Joined room:", room.code, "as player:", player.username);

  // Send success response
  sendRoomJoinedResponse(ws, room, player, gameManager);

  broadcastToRoom(wss, room.id, "PLAYERS_UPDATED", {
    players: gameManager.getPlayers(room.id),
  });

  // Notify others that player joined
  broadcastToRoom(
    wss,
    room.id,
    "PLAYER_JOINED",
    {
      username: player.username,
      playerId: player.id,
    },
    ws
  );

  // Auto-start game if 2+ players and not already started
  if (room.players.size >= 2 && room.state === "waiting") {
    console.log(
      `[AutoStart] Room ${room.id} has ${room.players.size} players, starting countdown...`
    );
    startAutoGameTimer(room.id, gameManager, wss);
  }
}

/**
 * Handle creating a private room
 */
export function handleCreateRoom(
  ws: ExtendedWebSocket,
  payload: unknown,
  gameManager: GameManagerInstance
): void {
  const { username } = payload as CreateRoomPayload;

  if (!username) {
    return sendError(ws, "Username is required");
  }

  const room = gameManager.createRoom(false);
  const player = gameManager.addPlayerToRoom(room.id, username, ws);

  if (!player) {
    return sendError(ws, "Failed to create room");
  }

  ws.playerId = player.id;
  ws.roomId = room.id;

  console.log(
    `[Room] ${username} created room ${room.id} with code ${room.code}`
  );

  send(ws, "ROOM_JOINED", {
    roomId: room.id,
    roomCode: room.code,
    playerId: player.id,
    players: gameManager.getPlayers(room.id),
    creatorName: username,
  });
}

/**
 * Handle syncing state for reconnection
 */
export function handleSyncState(
  ws: ExtendedWebSocket,
  payload: unknown,
  gameManager: GameManagerInstance
): void {
  const { roomId, playerId } = payload as SyncStatePayload;

  if (!roomId || !playerId) {
    return sendError(ws, "Room ID and player ID are required");
  }

  const room = gameManager.getRoom(roomId);

  if (!room) {
    return sendError(ws, "Room not found");
  }

  const player = gameManager.getPlayer({ roomId, playerId });
  if (!player) {
    return sendError(ws, "Player not found");
  }

  // Update websocket reference
  ws.playerId = playerId;
  ws.roomId = roomId;
  player.ws = ws;

  const creator = getCreator(roomId, gameManager);

  // Send current room state
  send(ws, "STATE_SYNCED", {
    players: gameManager.getPlayers(roomId),
    gameStarted: room.state === "playing",
    currentDrawer: room.currentDrawerId
      ? gameManager.getPlayer({ roomId, playerId: room.currentDrawerId })
          ?.username
      : "",
    currentDrawerId: room.currentDrawerId,
    wordHint: room.currentWord
      ? gameManager.createWordHint(room.currentWord)
      : "",
    currentWord: room.currentDrawerId === playerId ? room.currentWord : "",
    roundNumber: room.roundNumber,
    maxRounds: room.maxRounds,
    creatorName: creator?.username || "",
  });

  console.log(`[Sync] Player ${playerId} synced state for room ${roomId}`);
}

/**
 * Handle starting the game
 */
export function handleStartGame(
  ws: ExtendedWebSocket,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  if (!ws.roomId) {
    return sendError(ws, "Not in a room");
  }

  const room = gameManager.getRoom(ws.roomId);

  if (!room) {
    return sendError(ws, "Room not found");
  }

  if (room.players.size < 2) {
    return sendError(ws, "Need at least 2 players to start");
  }

  // Clear auto start timer if manually started
  clearAutoStartTimer(ws.roomId);

  const gameState = gameManager.startGame(ws.roomId);

  if (!gameState) {
    return sendError(ws, "Failed to start game");
  }

  console.log("[Game] Game started for room:", room.id);

  // Send word choices to drawer
  send(gameState.currentDrawer.ws as ExtendedWebSocket, "CHOOSE_WORD", {
    wordChoices: gameState.wordChoices,
    roundNumber: gameState.roundNumber,
    maxRounds: gameState.maxRounds,
  });

  // Notify all players game started
  broadcastToRoom(wss, room.id, "GAME_STARTED", {
    drawer: gameState.currentDrawer.username,
    drawerId: gameState.currentDrawer.id,
    roundNumber: gameState.roundNumber,
    maxRounds: gameState.maxRounds,
    players: gameManager.getPlayers(room.id),
  });

  // Start word selection timer (15 seconds)
  startWordSelectionTimer(room.id, gameManager, wss);
}

/**
 * Handle word selection by drawer
 */
export function handleSelectWord(
  ws: ExtendedWebSocket,
  payload: unknown,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  const { word } = payload as SelectWordPayload;

  if (!ws.roomId) {
    return sendError(ws, "Not in a room");
  }

  const room = gameManager.getRoom(ws.roomId);

  if (!room) {
    return sendError(ws, "Room not found");
  }

  const currentDrawer = gameManager.getCurrentDrawer(ws.roomId);

  if (!currentDrawer || currentDrawer.id !== ws.playerId) {
    return sendError(ws, "Not your turn to select word");
  }

  clearWordSelectionTimer(ws.roomId);

  const result = gameManager.selectWord(ws.roomId, word);

  if (!result) {
    return sendError(ws, "Invalid word selection");
  }

  console.log("[Word] Selected word:", word, "for room:", ws.roomId);

  // Send word to drawer
  send(ws, "WORD_SELECTED", {
    word: result.word,
    wordHint: result.wordHint,
  });

  // Broadcast hint to other players
  broadcastToRoom(
    wss,
    ws.roomId,
    "WORD_SELECTED",
    {
      wordHint: result.wordHint,
    },
    ws
  );

  // Start drawing timer (30 seconds)
  startRoundTimer(ws.roomId, gameManager, wss);
}

/**
 * Handle drawing actions
 */
export function handleDraw(
  ws: ExtendedWebSocket,
  payload: unknown,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  if (!ws.roomId) return;

  const room = gameManager.getRoom(ws.roomId);

  if (!room || room.state !== "playing") {
    return;
  }

  const currentDrawer = gameManager.getCurrentDrawer(ws.roomId);

  if (!currentDrawer || currentDrawer.id !== ws.playerId) {
    return;
  }

  // Broadcast drawing to all other players
  broadcastToRoom(wss, ws.roomId, "DRAW", payload, ws);
}

/**
 * Handle clearing canvas
 */
export function handleClearCanvas(
  ws: ExtendedWebSocket,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  if (!ws.roomId) return;

  const room = gameManager.getRoom(ws.roomId);
  const currentDrawer = gameManager.getCurrentDrawer(ws.roomId);

  if (!room || room.state !== "playing") {
    return;
  }

  if (!currentDrawer || currentDrawer.id !== ws.playerId) {
    return;
  }

  broadcastToRoom(wss, ws.roomId, "CLEAR_CANVAS", {});
}

/**
 * Handle chat messages and guesses
 */
export function handleSendMessage(
  ws: ExtendedWebSocket,
  payload: unknown,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  const { message } = payload as SendMessagePayload;

  if (!ws.roomId || !ws.playerId) return;

  const room = gameManager.getRoom(ws.roomId);

  if (!room) {
    return;
  }

  const player = gameManager.getPlayer({
    roomId: ws.roomId,
    playerId: ws.playerId,
  });

  if (!player) {
    return;
  }

  const messageData = {
    username: player.username,
    message: message.trim(),
    playerId: player.id,
    timestamp: Date.now(),
  };

  // Check if it's a correct guess
  if (room.state === "playing" && room.currentWord) {
    const isCorrect =
      message.trim().toLowerCase() === room.currentWord.toLowerCase();
    const isDrawer = room.currentDrawerId === player.id;

    if (isCorrect && !isDrawer && !player.guessedCorrect) {
      // Correctly guessed
      const points = gameManager.handleCorrectGuess({
        roomId: ws.roomId,
        playerId: player.id,
      });

      console.log(
        `[Guess] ${player.username} guessed correctly and earned ${points} points`
      );

      // Check if all non-drawers have guessed
      const allGuessed = Array.from(room.players.values())
        .filter((p) => p.id !== room.currentDrawerId)
        .every((p) => p.guessedCorrect);

      broadcastToRoom(wss, ws.roomId, "CORRECT_GUESS", {
        username: player.username,
        playerId: player.id,
        points,
      });

      // If everyone guessed, auto-advance turn
      if (allGuessed) {
        console.log(
          `[Game] All players guessed in room ${ws.roomId}, auto-advancing`
        );
        clearRoomTimer(ws.roomId);
        setTimeout(() => {
          advanceTurn(ws.roomId!, gameManager, wss);
        }, 2000);
      }

      // Update scores
      broadcastToRoom(wss, ws.roomId, "PLAYERS_UPDATED", {
        players: gameManager.getPlayers(ws.roomId),
      });

      // Send the correct guess message only to:
      // 1. The drawer
      // 2. Players who have already guessed correctly
      const drawer = room.currentDrawerId
        ? gameManager.getPlayer({
            roomId: ws.roomId,
            playerId: room.currentDrawerId,
          })
        : null;

      const correctMessage = {
        username: player.username,
        message: message.trim(),
        playerId: player.id,
        timestamp: Date.now(),
        isCorrect: true,
      };

      // Send to drawer
      if (drawer && drawer.ws) {
        send(drawer.ws as ExtendedWebSocket, "MESSAGE", correctMessage);
      }

      // Send to all players who have guessed correctly (including the one who just guessed)
      Array.from(room.players.values()).forEach((p) => {
        if (p.guessedCorrect && p.ws && p.id !== room.currentDrawerId) {
          send(p.ws as ExtendedWebSocket, "MESSAGE", correctMessage);
        }
      });

      // Send masked message to players who haven't guessed
      const maskedMessage = {
        username: player.username,
        message: "*** Guessed correctly! ***",
        playerId: player.id,
        timestamp: Date.now(),
        isCorrect: true,
      };

      Array.from(room.players.values()).forEach((p) => {
        if (!p.guessedCorrect && p.id !== room.currentDrawerId && p.ws) {
          send(p.ws as ExtendedWebSocket, "MESSAGE", maskedMessage);
        }
      });

      return; // Don't broadcast to everyone
    }

    // For wrong guesses during active game, only show to drawer and correct guessers
    if (!isDrawer) {
      const drawer = room.currentDrawerId
        ? gameManager.getPlayer({
            roomId: ws.roomId,
            playerId: room.currentDrawerId,
          })
        : null;

      // Send to drawer
      if (drawer && drawer.ws) {
        send(drawer.ws as ExtendedWebSocket, "MESSAGE", messageData);
      }

      // Send to players who have guessed correctly
      Array.from(room.players.values()).forEach((p) => {
        if (p.guessedCorrect && p.ws && p.id !== room.currentDrawerId) {
          send(p.ws as ExtendedWebSocket, "MESSAGE", messageData);
        }
      });

      // Send back to sender
      send(ws, "MESSAGE", messageData);

      return; // Don't broadcast to everyone
    }
  }

  // Broadcast regular message to all players (only when game is not playing, or sender is drawer)
  broadcastToRoom(wss, ws.roomId, "MESSAGE", messageData);
}

/**
 * Handle advancing to next turn
 */
export function handleNextTurn(
  ws: ExtendedWebSocket,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  if (!ws.roomId) {
    return sendError(ws, "Not in a room");
  }

  const room = gameManager.getRoom(ws.roomId);

  if (!room) {
    return sendError(ws, "Room not found");
  }

  const currentDrawer = gameManager.getCurrentDrawer(ws.roomId);

  if (!currentDrawer || currentDrawer.id !== ws.playerId) {
    return sendError(ws, "Only current drawer can advance turn");
  }

  clearRoomTimer(ws.roomId);
  advanceTurn(ws.roomId, gameManager, wss);
}

/**
 * Handle player disconnection
 */
export function handlePlayerDisconnect(
  ws: ExtendedWebSocket,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  if (!ws.playerId || !ws.roomId) return;

  const player = gameManager.getPlayer({
    roomId: ws.roomId,
    playerId: ws.playerId,
  });
  const playerUsername = player?.username;

  const result = gameManager.removePlayer({
    roomId: ws.roomId,
    playerId: ws.playerId,
  });

  if (result) {
    console.log(`[Disconnect] Player ${ws.playerId} left room ${ws.roomId}`);

    const room = gameManager.getRoom(ws.roomId);

    if (room && room.players.size > 0) {
      broadcastToRoom(wss, ws.roomId, "PLAYERS_UPDATED", {
        players: gameManager.getPlayers(ws.roomId),
      });

      broadcastToRoom(wss, ws.roomId, "PLAYER_LEFT", {
        username: playerUsername || "A player",
        playerId: ws.playerId,
      });

      // If current drawer left, advance turn
      if (room.state === "playing" && room.currentDrawerId === ws.playerId) {
        clearRoomTimer(ws.roomId);
        clearWordSelectionTimer(ws.roomId);
        advanceTurn(ws.roomId, gameManager, wss);
      }

      // Cancel auto-start if not enough players
      if (room.state === "waiting" && room.players.size < 2) {
        clearAutoStartTimer(ws.roomId);
        broadcastToRoom(wss, ws.roomId, "AUTO_START_CANCELLED", {});
      }
    }
  }
}

