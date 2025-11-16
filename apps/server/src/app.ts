import cors from "cors";
import express from "express";
import morgan from "morgan";
import http from "http";
import routes from "./routes";
import GameManager from "./game-manager";
import { initializeWebSocketServer } from "./services/websocket.service";

// Initialize Express app
const app: express.Express = express();
const server = http.createServer(app);

// Initialize game manager
const gameManager = GameManager;

// Middleware
app.use(morgan("tiny"));
app.use(express.json({ limit: "100mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000"],
  })
);

// Routes
app.use("/v1", routes);

// Initialize WebSocket server
initializeWebSocketServer(server, gameManager);

// Get port from environment or use default
const PORT = process.env.PORT || 3001;

// Start server
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[WebSocket] Server initialized`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, closing server...");
  server.close(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
});

export default app;
export { server };
