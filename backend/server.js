const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const recordRoutes = require('./routes/recordRoutes');
const alertRoutes = require('./routes/alertRoutes');
const investigationRoutes = require('./routes/investigationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Initialize app
const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins for dev development, configure strictly for prod
  credentials: true
}));

app.use(express.json());

// Log HTTP requests
app.use(morgan((tokens, req, res) => {
  const status = tokens.status(req, res);
  const logMsg = `${tokens.method(req, res)} ${tokens.url(req, res)} - Status: ${status} - Response Time: ${tokens['response-time'](req, res)}ms`;
  if (status >= 400) {
    logger.warn(logMsg);
  } else {
    logger.info(logMsg);
  }
  return null;
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the AI Government Integrity & Fraud Intelligence API Services (Phase 1)',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
