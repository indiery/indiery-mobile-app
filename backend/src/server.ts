import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectMongo, ensureDatabaseIndexes } from './db/mongoose';
import { initSocket } from './realtime/socket';
import { seedCoreData } from './services/seed.service';
import { startPushReceiptWorker } from './services/notification.service';

async function main() {
  await connectMongo();
  if (env.NODE_ENV !== 'production') {
    await seedCoreData();
  }

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server, env.CORS_ORIGIN);
  const stopPushReceiptWorker = startPushReceiptWorker();

  server.listen(env.PORT, () => {
    console.log(`Indiery API running on http://localhost:${env.PORT}`);
    const maintenance = env.NODE_ENV === 'production' ? seedCoreData() : Promise.resolve();
    void maintenance
      .then(() => ensureDatabaseIndexes())
      .catch((error) => {
        console.error('Unable to complete startup database maintenance', error);
      });
  });

  const shutdown = () => {
    stopPushReceiptWorker();
    server.close(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
