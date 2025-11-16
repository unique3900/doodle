import type WebSocket from "ws";
import type { GameManagerInstance } from "../types/game-manager.types";
import { send, broadcastToRoom } from "../utils/websocket.utils";
import type { ExtendedWebSocket } from "../types/websocket.types";

// Timer storage
const roomTimers = new Map<string, NodeJS.Timeout>();
const wordSelectionTimers = new Map<string, NodeJS.Timeout>();
const autoStartTimers = new Map<string, NodeJS.Timeout>();

/**
 * Start word selection timer (15 seconds)
 */
export function startWordSelectionTimer(
  roomId: string,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  clearWordSelectionTimer(roomId);

  const timer = setTimeout(() => {
    const room = gameManager.getRoom(roomId);
    if (room && room.state === "playing" && room.wordChoices.length > 0) {
      console.log(
        `[Timer] Word selection timeout in room ${roomId}, auto-selecting`
      );

      // Auto-select first word
      const word = room.wordChoices[0];
      const result = gameManager.selectWord(roomId, word);

      if (result) {
        const currentDrawer = gameManager.getCurrentDrawer(roomId);

        // Send word to drawer
        if (currentDrawer) {
          send(currentDrawer.ws as ExtendedWebSocket, "WORD_SELECTED", {
            word: result.word,
            wordHint: result.wordHint,
          });
        }

        // Send hint to other players
        broadcastToRoom(
          wss,
          roomId,
          "WORD_SELECTED",
          {
            wordHint: result.wordHint,
          },
          currentDrawer?.ws as ExtendedWebSocket
        );

        // Start drawing timer
        startRoundTimer(roomId, gameManager, wss);
      }
    }
  }, 15000); // 15 seconds to choose word

  wordSelectionTimers.set(roomId, timer);
}

/**
 * Clear word selection timer
 */
export function clearWordSelectionTimer(roomId: string): void {
  const timer = wordSelectionTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    wordSelectionTimers.delete(roomId);
  }
}

/**
 * Start auto-start game timer (10 seconds countdown)
 */
export function startAutoGameTimer(
  roomId: string,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  // Clear any existing timer
  clearAutoStartTimer(roomId);

  let countdown = 10;

  // Send initial countdown
  broadcastToRoom(wss, roomId, "AUTO_START_COUNTDOWN", { countdown });

  const timer = setInterval(() => {
    countdown--;

    if (countdown > 0) {
      broadcastToRoom(wss, roomId, "AUTO_START_COUNTDOWN", { countdown });
    } else {
      clearAutoStartTimer(roomId);

      const room = gameManager.getRoom(roomId);
      if (room && room.state === "waiting" && room.players.size >= 2) {
        console.log(`[AutoStart] Starting game in room ${roomId}`);

        const gameState = gameManager.startGame(roomId);

        if (gameState) {
          // Send word choices to drawer
          send(gameState.currentDrawer.ws as ExtendedWebSocket, "CHOOSE_WORD", {
            wordChoices: gameState.wordChoices,
            roundNumber: gameState.roundNumber,
            maxRounds: gameState.maxRounds,
          });

          // Notify all players game started
          broadcastToRoom(wss, roomId, "GAME_STARTED", {
            drawer: gameState.currentDrawer.username,
            drawerId: gameState.currentDrawer.id,
            roundNumber: gameState.roundNumber,
            maxRounds: gameState.maxRounds,
            players: gameManager.getPlayers(roomId),
          });

          // Start word selection timer
          startWordSelectionTimer(roomId, gameManager, wss);
        }
      }
    }
  }, 1000);

  autoStartTimers.set(roomId, timer);
}

/**
 * Clear auto-start timer
 */
export function clearAutoStartTimer(roomId: string): void {
  const timer = autoStartTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    autoStartTimers.delete(roomId);
  }
}

/**
 * Start round timer (30 seconds)
 */
export function startRoundTimer(
  roomId: string,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  clearRoomTimer(roomId);

  const timer = setTimeout(() => {
    const room = gameManager.getRoom(roomId);
    if (room && room.state === "playing" && room.currentWord) {
      console.log(`[Timer] Round ended in room ${roomId}`);

      broadcastToRoom(wss, roomId, "ROUND_ENDED", {
        word: room.currentWord,
      });

      setTimeout(() => {
        advanceTurn(roomId, gameManager, wss);
      }, 3000);
    }
  }, 30000); // 30 seconds to draw/guess

  roomTimers.set(roomId, timer);
}

/**
 * Clear room timer
 */
export function clearRoomTimer(roomId: string): void {
  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }
}

/**
 * Advance to next turn
 */
export function advanceTurn(
  roomId: string,
  gameManager: GameManagerInstance,
  wss: WebSocket.Server
): void {
  const gameState = gameManager.nextTurn(roomId);

  if (!gameState) {
    return;
  }

  // Check if game ended (type guard)
  if ("gameEnded" in gameState && gameState.gameEnded) {
    console.log(`[Game] Ended in room ${roomId}`);

    broadcastToRoom(wss, roomId, "GAME_ENDED", {
      winners: gameState.winners,
      players: gameState.players,
    });

    return;
  }

  // At this point, gameState is GameStartResult
  // Type assertion after type guard
  if (!("currentDrawer" in gameState)) {
    return;
  }

  console.log(
    `[Turn] New turn in room ${roomId}, drawer: ${gameState.currentDrawer.username}`
  );

  // Send word choices to drawer
  send(gameState.currentDrawer.ws as ExtendedWebSocket, "CHOOSE_WORD", {
    wordChoices: gameState.wordChoices,
    roundNumber: gameState.roundNumber,
    maxRounds: gameState.maxRounds,
  });

  // Notify all players of new turn
  broadcastToRoom(wss, roomId, "NEW_TURN", {
    drawer: gameState.currentDrawer.username,
    drawerId: gameState.currentDrawer.id,
    roundNumber: gameState.roundNumber,
    maxRounds: gameState.maxRounds,
    players: gameManager.getPlayers(roomId),
  });

  // Start word selection timer
  startWordSelectionTimer(roomId, gameManager, wss);
}

