import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { createSocketServer } from './sockets/index.js';
import { scheduleCronJobs } from './jobs/crons.js';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = http.createServer(app);

  createSocketServer(httpServer);
  console.log('[socket] listening with seat lock engine');

  try {
    await connectDB();
    scheduleCronJobs();
  } catch (err) {
    console.warn('[db] unavailable at boot, continuing without it:');
    console.warn(err instanceof Error ? err.message : err);
  }

  httpServer.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] fatal bootstrap error:', err);
  process.exit(1);
});
