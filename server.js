const express = require('express');
const mongoose = require('mongoose');
const http = require('http');

// Immediate Port Binding Strategy
const PORT = process.env.PORT || 8080;
const app = express();
const server = http.createServer(app);

// Simple health check for Cloud Run BEFORE anything else loads
app.get('/_health', (req, res) => res.status(200).send('OK'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[BOOT] 🚀 Early server listener active on port ${PORT}`);
});

// Global Error Catching
process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR] Uncaught Exception:', err.message);
  console.error(err.stack);
  // Keep process alive for a bit so logs flush
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Deferred module loading
async function startApp() {
  try {
    console.log('[BOOT] 📦 Loading application modules...');
    require('dotenv').config();
    const mainApp = require('./src/app');
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      throw new Error('MONGO_URI is missing from environment variables');
    }

    // Mount the real app onto our listening server
    app.use(mainApp);
    console.log('[BOOT] ✅ Application modules mounted');

    // Redact password for logging
    const redactedURI = MONGO_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`[DATABASE] 📡 Attempting connection to: ${redactedURI}`);

    await mongoose.connect(MONGO_URI);
    console.log('[DATABASE] 🟢 Connected to MongoDB successfully');

  } catch (error) {
    console.error('[FATAL BOOT ERROR] Failed to initialize application:');
    console.error(error.message);
    console.error(error.stack);
    // We DON'T exit here so the port remains bound and you can see this error in the console.
  }
}

startApp();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received: closing server');
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
});
