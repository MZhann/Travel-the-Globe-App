import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import countriesRouter from './routes/countries.js';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/countries', countriesRouter);

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

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
