import { app } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { recoverInterruptedOcrJobs, startOcrWorker } from './queues/ocrQueue';

async function bootstrap() {
  await connectDb();
  await recoverInterruptedOcrJobs();
  startOcrWorker();
  app.listen(env.port, () => {
    console.log(`PenBot AI Server running on :${env.port}`);
  });
}

bootstrap();
