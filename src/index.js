require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize, User } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { ensureDirectories } = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

if (process.env.CORS_ALLOW_ALL === 'true') {
  corsOptions.origin = true; // Reflect request origin (for LAN/private installations)
} else {
  corsOptions.origin = process.env.FRONTEND_URL || false; // false = same-origin only
}

app.use(cors(corsOptions));

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

// Sync super admin credentials from ENV (password recovery mechanism)
const ensureSuperAdmin = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const name = process.env.SUPER_ADMIN_NAME;
  const nationalId = process.env.SUPER_ADMIN_NATIONAL_ID;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !name || !nationalId || !password) return;

  const admin = await User.findOne({ where: { isSuperAdmin: true } });
  if (!admin) return;

  const updates = {};
  if (admin.email !== email) updates.email = email;
  if (admin.name !== name) updates.name = name;
  if (admin.nationalId !== nationalId) updates.nationalId = nationalId;

  const passwordMatch = await admin.comparePassword(password);
  if (!passwordMatch) updates.password = password;

  if (Object.keys(updates).length > 0) {
    await admin.update(updates);
    logger.info('Super admin credentials synced from ENV');
  }
};

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

    await ensureSuperAdmin();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to start server', { error: error.message });
    process.exit(1);
  }
};

start();
