import crypto from "crypto";
import type { WebSocket } from "ws";

// Hardcoded words list
const WORD_LIST = [
  "Apple",
  "Banana",
  "Cat",
  "Dog",
  "Elephant",
  "Fish",
  "Giraffe",
  "House",
  "Ice Cream",
  "Jungle",
  "Kite",
  "Lion",
  "Mountain",
  "Notebook",
  "Ocean",
  "Penguin",
  "Queen",
  "Rainbow",
  "Sun",
  "Tiger",
  "Umbrella",
  "Violin",
  "Watermelon",
  "Xylophone",
  "Yacht",
  "Zebra",
  "Anchor",
  "Butterfly",
  "Computer",
  "Diamond",
  "Eagle",
  "Flower",
  "Guitar",
  "Helicopter",
  "Igloo",
  "Jellyfish",
  "Kangaroo",
  "Lighthouse",
  "Mushroom",
  "Necklace",
  "Octopus",
  "Piano",
  "Quicksand",
  "Robot",
  "Saxophone",
  "Tree",
  "Volcano",
  "Whale",
  "Yoga",
  "Zipper",
  "Airplane",
  "Beach",
  "Castle",
  "Dragon",
  "Envelope",
  "Fireworks",
  "Ghost",
  "Hammer",
  "Island",
  "Jacket",
] as const;

const MAX_PLAYERS = 8;
const ROOM_TIMEOUT = 60 * 60 * 1000; // 1 hour
const MAX_ROUNDS = 3;
const WORDS_TO_CHOOSE = 3;

// Type definitions
type GameState = "waiting" | "playing" | "finished";

interface Player {
  id: string;
  username: string;
  score: number;
  guessedCorrect: boolean;
  ws: WebSocket;
  joinedAt: number;
}

interface Room {
  id: string;
  code: string;
  isPublic: boolean;
  maxPlayers: number;
  players: Map<string, Player>;
  state: GameState;
  currentDrawerId: string | null;
  currentDrawerIndex: number;
  currentWord: string;
  wordChoices: string[];
  roundNumber: number;
  maxRounds: number;
  turnNumber: number;
  creatorId: string | null;
  createdAt: number;
  lastActivity: number;
}

interface PlayerInfo {
  id: string;
  username: string;
  score: number;
  guessedCorrect: boolean;
  isDrawing: boolean;
  isCreator: boolean;
}

interface GameStartResult {
  currentDrawer: Player;
  wordChoices: string[];
  roundNumber: number;
  maxRounds: number;
  turnNumber: number;
}

interface WordSelectionResult {
  word: string;
  wordHint: string;
}

interface GameEndResult {
  gameEnded: boolean;
  winners: Array<{ id: string; username: string; score: number }>;
  players: PlayerInfo[];
}

// Singleton class
class GameManager {
  private static instance: GameManager;
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map();
  private pendingRoomCreation = false;

  constructor() {
    // If instance already exists, return it
    if (GameManager.instance) {
      return GameManager.instance;
    }

    this.rooms = new Map();
    this.playerRoomMap = new Map();
    this.pendingRoomCreation = false;

    // Start cleanup interval
    this.startCleanup();

    GameManager.instance = this;
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  // Room Management
  createRoom(isPublic = false): Room {
    const roomId = this.generateId("room");
    const code = this.generateRoomCode();

    const room: Room = {
      id: roomId,
      code: code,
      isPublic,
      maxPlayers: MAX_PLAYERS,
      players: new Map(),
      state: "waiting",
      currentDrawerId: null,
      currentDrawerIndex: 0,
      currentWord: "",
      wordChoices: [],
      roundNumber: 0,
      maxRounds: MAX_ROUNDS,
      turnNumber: 0,
      creatorId: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.rooms.set(roomId, room);
    console.log("Room created:", roomId, code, "isPublic:", isPublic);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find((r) => r.code === code);
  }

  findAvailableRoom(): Room | null {
    const allRooms = Array.from(this.rooms.values());
    console.log("Total rooms:", allRooms.length);

    const publicRooms = allRooms.filter(
      (r) =>
        r.isPublic &&
        r.state !== "finished" && // Allow joining waiting or playing rooms
        r.players.size < r.maxPlayers
    );

    console.log("Available public rooms:", publicRooms.length);
    publicRooms.forEach((r) =>
      console.log("Public room:", r.code, "players:", r.players.size)
    );

    if (publicRooms.length === 0) {
      console.log("No public rooms available, creating new private room");
      return null;
    }

    // Sort by player count (descending) and creation time (oldest first)
    publicRooms.sort((a, b) => {
      // First priority: rooms with players
      if (a.players.size !== b.players.size) {
        return b.players.size - a.players.size;
      }
      // Second priority: older rooms first
      return a.createdAt - b.createdAt;
    });

    const bestRoom = publicRooms[0];

    console.log(
      `[Match] Selected room ${bestRoom.id} (${bestRoom.code}) with ${bestRoom.players.size} players`
    );
    return bestRoom;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // Remove all players from map
      room.players.forEach((player) => {
        this.playerRoomMap.delete(player.id);
      });
      this.rooms.delete(roomId);
      console.log(`[Room] Deleted room ${roomId}`);
    }
  }

  // Player Management
  addPlayerToRoom(
    roomId: string,
    username: string,
    ws: WebSocket
  ): Player | null {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    if (room.players.size >= room.maxPlayers) {
      return null;
    }

    const playerId = this.generateId("player");

    const player: Player = {
      id: playerId,
      username: username.trim().substring(0, 20),
      score: 0, // New player score is 0
      guessedCorrect: false,
      ws,
      joinedAt: Date.now(),
    };

    // Set first player as creator
    if (room.players.size === 0) {
      room.creatorId = playerId;
    }

    room.players.set(playerId, player);
    this.playerRoomMap.set(playerId, roomId);
    room.lastActivity = Date.now();

    return player;
  }

  getPlayer({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): Player | null {
    const room = this.rooms.get(roomId);
    return room ? room.players.get(playerId) || null : null;
  }

  removePlayer({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): boolean {
    const room = this.rooms.get(roomId);

    if (!room) {
      return false;
    }

    room.players.delete(playerId);
    this.playerRoomMap.delete(playerId);
    room.lastActivity = Date.now();

    // Delete room if empty
    if (room.players.size === 0) {
      this.deleteRoom(roomId);
    }

    return true;
  }

  getPlayers(roomId: string): PlayerInfo[] {
    const room = this.rooms.get(roomId);

    if (!room) {
      return [];
    }

    return Array.from(room.players.values()).map((p) => ({
      id: p.id,
      username: p.username,
      score: p.score,
      guessedCorrect: p.guessedCorrect,
      isDrawing: p.id === room.currentDrawerId,
      isCreator: p.id === room.creatorId,
    }));
  }

  startGame(roomId: string): GameStartResult | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.creatorId) {
      // TODO: Set logic to set second player as creator if no creator is found and so on but now leave
      return null;
    }

    room.state = "playing";
    room.roundNumber = 1;
    room.turnNumber = 1;
    room.currentDrawerIndex = 0;
    room.wordChoices = this.getRandomWords(WORDS_TO_CHOOSE);
    room.currentWord = "";

    const players = Array.from(room.players.values());
    room.currentDrawerId = players[0].id;

    this.resetGuesses(roomId);
    room.lastActivity = Date.now();

    return {
      currentDrawer: players[0],
      wordChoices: room.wordChoices,
      roundNumber: room.roundNumber,
      maxRounds: room.maxRounds,
      turnNumber: room.turnNumber,
    };
  }

  selectWord(roomId: string, word: string): WordSelectionResult | null {
    const room = this.rooms.get(roomId);

    if (!room || room.state !== "playing") {
      return null;
    }

    if (!room.wordChoices.includes(word)) {
      return null;
    }

    room.currentWord = word;
    room.wordChoices = [];

    return {
      word: room.currentWord,
      wordHint: this.createWordHint(room.currentWord),
    };
  }

  getCurrentDrawer(roomId: string): Player | null {
    const room = this.rooms.get(roomId);

    if (!room || !room.currentDrawerId) {
      return null;
    }

    return room.players.get(room.currentDrawerId) || null;
  }

  nextTurn(roomId: string): GameStartResult | GameEndResult | null {
    const room = this.rooms.get(roomId);

    if (!room || room.state !== "playing") {
      return null;
    }

    const players = Array.from(room.players.values());

    if (players.length === 0) {
      return null;
    }

    // Move to next drawer
    room.currentDrawerIndex = (room.currentDrawerIndex + 1) % players.length; // Circular index
    room.turnNumber++;

    // Increase round if we have completed one circle
    if (room.currentDrawerIndex === 0) {
      room.roundNumber++;

      // Is game ended
      if (room.roundNumber > room.maxRounds) {
        return this.endGame(roomId);
      }
    }

    room.currentDrawerId = players[room.currentDrawerIndex].id;
    room.wordChoices = this.getRandomWords(WORDS_TO_CHOOSE);
    room.currentWord = ""; // Will be set when drawer chooses

    this.resetGuesses(roomId);
    room.lastActivity = Date.now();

    return {
      currentDrawer: players[room.currentDrawerIndex],
      wordChoices: room.wordChoices,
      roundNumber: room.roundNumber,
      maxRounds: room.maxRounds,
      turnNumber: room.turnNumber,
    };
  }

  endGame(roomId: string): GameEndResult | null {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    room.state = "finished";

    // Get Winners
    const players = Array.from(room.players.values());
    const maxScore = Math.max(...players.map((p) => p.score));
    const winners = players.filter((p) => p.score === maxScore);

    return {
      gameEnded: true,
      winners: winners.map((w) => ({
        id: w.id,
        username: w.username,
        score: w.score,
      })),
      players: this.getPlayers(roomId),
    };
  }

  // Need to handle the user who guessed correctly and ones who have not yet guessed correctly  -> For message visibility after guessing word
  handleCorrectGuess({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): number {
    const room = this.rooms.get(roomId);
    const player = room?.players.get(playerId);

    if (!room || !player || player.guessedCorrect) {
      return 0;
    }

    player.guessedCorrect = true;

    // Calculate point based on how quickly they guessed
    const basePoints = 100;
    const guessedCount = Array.from(room.players.values()).filter(
      (p) => p.guessedCorrect
    ).length;

    // First to guess gets more points
    const points = Math.max(50, basePoints - (guessedCount - 1) * 10); // Logic: First to guess gets 100 points, second to guess gets 90 points, third to guess gets 80 points, and so on.

    player.score += points;

    // Give points to drawer when someone guesses correctly
    if (room.currentDrawerId) {
      const drawer = room.players.get(room.currentDrawerId);
      if (drawer) {
        drawer.score += 25;
      }
    }

    room.lastActivity = Date.now();

    return points;
  }

  resetGuesses(roomId: string): void {
    const room = this.rooms.get(roomId);

    if (room) {
      room.players.forEach((player) => {
        player.guessedCorrect = false;
      });
    }
  }

  // Utils
  getRandomWord(): string {
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  }

  getRandomWords(count: number): string[] {
    const shuffled = [...WORD_LIST].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  createWordHint(word: string): string {
    return word
      .split("")
      .map((char, index) => {
        if (char === " ") return " ";
        if (index === 0 || index === word.length - 1) return char;
        return "_";
      })
      .join(" ");
  }

  generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code: string;

    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.getRoomByCode(code));

    return code;
  }

  // Stats
  getRoomCount(): number {
    return this.rooms.size;
  }

  getTotalPlayers(): number {
    let count = 0;
    this.rooms.forEach((room) => {
      count += room.players.size;
    });
    return count;
  }

  // Cleanup inactive rooms
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const roomsToDelete: string[] = [];

      this.rooms.forEach((room, roomId) => {
        // Delete rooms that are old and inactive
        if (now - room.lastActivity > ROOM_TIMEOUT) {
          roomsToDelete.push(roomId);
        }
      });

      roomsToDelete.forEach((roomId) => {
        this.deleteRoom(roomId);
      });

      if (roomsToDelete.length > 0) {
        console.log(
          `[Cleanup] Deleted ${roomsToDelete.length} inactive rooms`
        );
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}

export default GameManager.getInstance();
