const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);

  // Without these listeners a dropped socket is invisible: requests just hang
  // until they time out and it reads like the server "stopped working".
  const conn = mongoose.connection;
  conn.on('error', (err) => console.error('[db] connection error:', err.message));
  conn.on('disconnected', () => console.warn('[db] disconnected — mongoose will retry'));
  conn.on('reconnected', () => console.log('[db] reconnected'));

  await mongoose.connect(env.mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`[db] connected → ${mongoose.connection.name}`);
  return conn;
}

module.exports = { connectDB };
