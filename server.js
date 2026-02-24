require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const LiveUpdateScheduler = require('./services/liveUpdateScheduler');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const contestRoutes = require('./routes/contest');
const teamRoutes = require('./routes/team');
const leaderboardRoutes = require('./routes/leaderboard');
const stockRoutes = require('./routes/stocks');
const walletRoutes = require('./routes/wallet');

const app = express();

// Create HTTP server for Socket.io
const server = http.createServer(app);

const defaultAllowedOrigins = [
  'https://trazex11admin.vercel.app',
  'https://trazex11.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8081',
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Socket.io setup with CORS
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingInterval: 60000,
  pingTimeout: 60000
});

// Initialize live update scheduler
const scheduler = new LiveUpdateScheduler(io);

// Connect to MongoDB
const startServer = async () => {
  await connectDB();

// Security middleware
app.use(helmet());

// CORS configuration (must be before rate limiters/routes for preflight)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parser middleware (needed before auth rate limiter key generation)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    const username = (req.body?.username || '').toLowerCase().trim();
    const userIdentifier = email || username;

    if (userIdentifier) {
      return `${req.path}:${userIdentifier}`;
    }

    if (typeof rateLimit.ipKeyGenerator === 'function') {
      return `${req.path}:${rateLimit.ipKeyGenerator(req.ip)}`;
    }

    return `${req.path}:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Too many authentication attempts for this user, please try again later.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Cookie parser middleware
app.use(cookieParser());

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/wallet', walletRoutes);

// Socket.io Connection Handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('subscribe', (symbol) => {
    if (!symbol) {
      return;
    }
    socket.join(symbol);
    console.log(`Client ${socket.id} subscribed to ${symbol}`);
  });

  socket.on('unsubscribe', (symbol) => {
    if (!symbol) {
      return;
    }
    socket.leave(symbol);
    console.log(`Client ${socket.id} unsubscribed from ${symbol}`);
  });

  // Request market stats
  socket.on('request:stats', async () => {
    try {
      const stats = await scheduler.getStats();
      socket.emit('market:stats', {
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending stats:', error.message);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error from ${socket.id}:`, error);
  });
});

// Expose scheduler for use in other parts of the app (e.g., admin endpoints)
app.locals.scheduler = scheduler;

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Trazex Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      user: '/api/user'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to uncaught exception');
  process.exit(1);
});

  const PORT = process.env.PORT || 3000;

  server.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);

    // Start live update scheduler
    try {
      scheduler.start();
      console.log('✅ Live stock update system initialized');
    } catch (error) {
      console.error('❌ Failed to start live update scheduler:', error.message);
    }
  });
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

module.exports = { app, server, io, scheduler };
