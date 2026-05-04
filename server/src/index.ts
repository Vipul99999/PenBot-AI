import { app } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

async function bootstrap() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`PenBot AI Server running on :${env.port}`);
  });
}

bootstrap();
