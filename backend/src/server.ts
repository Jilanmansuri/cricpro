import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Configurations & DB
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/errorMiddleware';
import { requestLogger } from './middlewares/loggingMiddleware';

// Routes
import authRoutes from './routes/authRoutes';
import manualMatchRoutes from './routes/manualMatchRoutes';
import matchRoutes from './routes/matchRoutes';
import playerRoutes from './routes/playerRoutes';
import teamRoutes from './routes/teamRoutes';
import tournamentRoutes from './routes/tournamentRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Load Env
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Global Request Logger
app.use(requestLogger);

// Security & Header Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: true,
  credentials: true,
}));

// Rate Limiting (Prevents API abuse, relaxed during development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 2000,
  message: 'Too many requests from this IP, please try again later after 15 minutes.',
});
app.use('/api', limiter);

// Request Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging & Performance Middlewares
app.use(compression());

// Mount Static Folders
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/manual-match', manualMatchRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/notifications', notificationRoutes);

// Base route for sanity check & health check
app.get(['/', '/api/health'], (_req, res) => {
  res.json({
    status: 'OK',
    message: 'Welcome to CricStats Pro API. Server is running securely with Clean Repository-Service Architecture.',
    version: '2.0.0',
    env: process.env.NODE_ENV,
  });
});

// Global Error Handler (must be registered last)
app.use(errorHandler);

// Start Server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 CricPro API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📱 Mobile / LAN Endpoint: http://192.168.1.78:${PORT}/api`);
  console.log(`💻 Localhost Endpoint:    http://localhost:${PORT}/api`);
});
