require('dotenv').config();
const app = require('./src/app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const server = mongoose.connect(MONGO_URI)
  .then(() => {
    // Redact password for logging
    const redactedURI = MONGO_URI ? MONGO_URI.replace(/:([^@]+)@/, ':****@') : 'undefined';
    console.log(`Connected to MongoDB: ${redactedURI}`);
    return app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
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
