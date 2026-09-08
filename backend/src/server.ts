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
app.use(helmet());
app.use(cors());

// Rate Limiting (Prevents API abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
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

// Base route for sanity check
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to CricStats Pro API. Server is running securely with Clean Repository-Service Architecture.',
    version: '2.0.0',
    env: process.env.NODE_ENV,
  });
});

// Global Error Handler (must be registered last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
