import { Router } from 'express';
import mongoose from 'mongoose';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'up' : 'down',
      time: new Date().toISOString(),
    },
  });
});

// Module routers (auth, products, ...) will be mounted here as they are built.