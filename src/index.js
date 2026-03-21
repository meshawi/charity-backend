require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { ensureDirectories } = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Required for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api', routes);

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Charity Backend API is running' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const start = async () => {
  try {
    // Ensure storage directories exist
    ensureDirectories();
    logger.info('Storage directories initialized');

    await sequelize.authenticate();
    logger.info('Database connected successfully');
    
    await sequelize.sync();
    logger.info('Models synchronized');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to start server', { error: error.message });
    process.exit(1);
  }
};

start();
