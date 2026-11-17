import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';
import { User } from './models/user.js';
import { Session } from './models/session.js';

async function start() {
  await mongoose.connect(config.MONGODB_URI);
  await Promise.all([User.init(), Session.init()]);
  const server = app.listen(config.PORT, () => console.log(`API listening on port ${config.PORT}`));
  const shutdown = () => {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timeout);
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(error => {
  console.error('Unable to start API:', error.message);
  process.exit(1);
});
