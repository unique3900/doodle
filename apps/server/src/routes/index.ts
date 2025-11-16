import { Router } from "express";

import testRouter from "./test";
import gameManager from "../game-manager";

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: gameManager.getRoomCount(),
    players: gameManager.getTotalPlayers()
  });
});

router.use("/test", testRouter);

export default router;
