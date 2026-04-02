const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(helmet());
app.use(morgan('dev'));

// Static folder configuration for uploads
app.use('/uploads', express.static('uploads'));

// Health Route
app.get('/', (req, res) => {
  res.send('Woglo Driver API is running');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const driverRoutes = require('./routes/driverRoutes');

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/driver', driverRoutes);

const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
