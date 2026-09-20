const { createApp } = require('./app');
const { connectDb } = require('./config/db');
const { env } = require('./config/env');

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, '127.0.0.1', () => {
    console.log(`Wellness API listening on http://127.0.0.1:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
