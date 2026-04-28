import fs from 'node:fs';
import { app } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import './queues/ocrQueue';

async function bootstrap() {
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
  await connectDb();
  app.listen(env.port, () => {
    console.log(`PenBot AI Server running on :${env.port}`);
  });
}

bootstrap();
