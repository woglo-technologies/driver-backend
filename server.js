require('dotenv').config();
const app = require('./src/app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Validate environment variables
if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

// Redact password for logging
const redactedURI = MONGO_URI.replace(/:([^@]+)@/, ':****@');

// Start the server immediately
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[STARTUP] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[STARTUP] Attempting to connect to MongoDB: ${redactedURI}`);
});

// Database connection attempt (non-blocking for server startup)
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[DATABASE] Connected to MongoDB successfully.');
  })
  .catch((error) => {
    console.error('[DATABASE] MongoDB connection error:', error.message);
    console.error('[DATABASE] Tip: Ensure the IP address is allowlisted in MongoDB Atlas (0.0.0.0/0 for Cloud Run).');
    // We don't exit here so the process stays alive and Cloud Run health check passes,
    // but the app might fail on DB-reliant requests until connection is established.
  });

// Handle graceful shutdown for Cloud Run
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  const s = await server;
  if (s) {
    s.close(async () => {
      console.log('HTTP server closed');
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
