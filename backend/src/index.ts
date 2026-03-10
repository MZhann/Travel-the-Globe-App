import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import countriesRouter from './routes/countries';
import authRouter from './routes/auth';
import visitedRouter from './routes/visited';
import wishlistRouter from './routes/wishlist';
import countryInfoRouter from './routes/countryInfo';
import countryNewsRouter from './routes/countryNews';
import albumsRouter from './routes/albums';
import usersRouter from './routes/users';

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Travel the Globe API' });
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
  app.listen(Number(PORT), HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

start().catch(console.error);
