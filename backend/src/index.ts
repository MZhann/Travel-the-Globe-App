import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import countriesRouter from './routes/countries';
import authRouter from './routes/auth';
import visitedRouter from './routes/visited';
import wishlistRouter from './routes/wishlist';
import countryInfoRouter from './routes/countryInfo';
import countryNewsRouter from './routes/countryNews';
import albumsRouter from './routes/albums';
import usersRouter from './routes/users';
import chatRouter from './routes/chat';
import ChatMessage from './models/ChatMessage';
import { JWT_SECRET, type JwtPayload } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

// CORS — supports comma-separated origins in FRONTEND_URL
// Strip trailing slashes so "https://example.app/" matches "https://example.app"
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// Increase body size limit for base64 image uploads (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/countries', countriesRouter);
app.use('/api/visited', visitedRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/country-info', countryInfoRouter);
app.use('/api/country-news', countryNewsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/users', usersRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Travel the Globe API' });
});

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  ChatMessage.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
    .then((msgs) => {
      socket.emit('chat:history', msgs.reverse());
    })
    .catch((err) => console.error('Failed to load chat history:', err));

  io.emit('chat:online', io.engine.clientsCount);

  socket.on('chat:send', async (data: { message: string; displayName: string }) => {
    if (!data.message?.trim()) return;
    try {
      const msg = await ChatMessage.create({
        userId: socket.data.userId,
        displayName: data.displayName || socket.data.email?.split('@')[0] || 'Traveler',
        message: data.message.trim().slice(0, 1000),
      });
      io.emit('chat:message', {
        _id: msg._id,
        userId: msg.userId,
        displayName: msg.displayName,
        message: msg.message,
        createdAt: msg.createdAt,
      });
    } catch (err) {
      console.error('Failed to save chat message:', err);
    }
  });

  socket.on('disconnect', () => {
    io.emit('chat:online', io.engine.clientsCount);
  });
});

async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/travel-the-globe';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB connection failed, running without DB:', (err as Error).message);
  }

  const HOST = process.env.HOST ?? '0.0.0.0';
  httpServer.listen(Number(PORT), HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

start().catch(console.error);
