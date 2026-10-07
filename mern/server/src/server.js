const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const { scheduleReminders } = require('./services/reminderService');

let server;

async function start() {
  // A cold MongoDB (Windows starts the service lazily on boot) used to make the
  // process exit(1) on the first refused connection — under nodemon that parks
  // at "app crashed" and never comes back. Retry instead.
  for (let attempt = 1; ; attempt += 1) {
    try {
      await connectDB();
      break;
    } catch (err) {
      console.error(`[db] connect attempt ${attempt} failed: ${err.message}`);
      if (attempt >= 10) {
        console.error('[api] giving up — is MongoDB running? (Get-Service MongoDB)');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  scheduleReminders();

  server = app.listen(env.port, () => {
    console.log(`[api] Focus Prints ERP listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[api] port ${env.port} is already in use — another server is still running.`);
      process.exit(1);
    }
    console.error('[api] server error:', err);
  });
}

// ── Why did the process go away? ──────────────────────────────────────────
// Every exit path logs its reason, so "it stopped on its own" is answerable
// from the terminal scrollback instead of guesswork.
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] the process is exiting because of this:', err);
  process.exit(1);
});

['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach((signal) => {
  process.on(signal, () => {
    // SIGINT = Ctrl+C, SIGHUP/SIGBREAK = terminal window closed, SIGTERM = nodemon restart.
    console.log(`[api] received ${signal} — shutting down (not a crash).`);
    if (server) server.close(() => process.exit(0));
    else process.exit(0);
    setTimeout(() => process.exit(0), 5000).unref();
  });
});

process.on('exit', (code) => console.log(`[api] process exiting with code ${code}`));

start();
