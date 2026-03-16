import { Request, Response, Router } from 'express';
import ChatMessage from '../models/ChatMessage';

const router = Router();

router.get('/history', async (req: Request, res: Response) => {
  try {
    const before = req.query.before as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const filter: Record<string, unknown> = {};
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;
