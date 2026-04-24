import { Response, Router } from 'express';
import mongoose from 'mongoose';
import DirectMessage from '../models/DirectMessage';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

interface ConversationRow {
  otherUserId: string;
  lastMessage: string;
  lastMessageAt: Date;
  lastSenderId: string;
  unreadCount: number;
  otherUser: { _id: string; email: string; displayName?: string } | null;
}

/**
 * GET /api/messages/conversations — list all conversations for the current user
 */
router.get('/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();

    // Aggregate: last message per conversation partner + unread count
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { $or: [{ senderId: userId }, { recipientId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $eq: ['$senderId', userId] }, '$recipientId', '$senderId'],
          },
        },
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$message' },
          lastMessageAt: { $first: '$createdAt' },
          lastSenderId: { $first: '$senderId' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recipientId', userId] }, { $eq: ['$read', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ];

    const rows = await DirectMessage.aggregate(pipeline);
    const otherIds = rows.map((r) => r._id as string);

    const users = await User.find({ _id: { $in: otherIds } })
      .select('_id email displayName')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const conversations: ConversationRow[] = rows.map((r) => {
      const otherId = r._id as string;
      const u = userMap.get(otherId);
      return {
        otherUserId: otherId,
        lastMessage: r.lastMessage as string,
        lastMessageAt: r.lastMessageAt as Date,
        lastSenderId: r.lastSenderId as string,
        unreadCount: r.unreadCount as number,
        otherUser: u
          ? { _id: String(u._id), email: u.email, displayName: u.displayName }
          : null,
      };
    });

    res.json({ conversations });
  } catch (err) {
    console.error('List DM conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/messages/unread-count — total unread messages for the current user
 */
router.get('/unread-count', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const count = await DirectMessage.countDocuments({ recipientId: userId, read: false });
    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * GET /api/messages/:userId — messages between current user and :userId
 */
router.get('/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!._id.toString();
    const other = req.params.userId;

    if (!mongoose.isValidObjectId(other)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }
    if (me === other) {
      res.status(400).json({ error: 'Cannot message yourself' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const messages = await DirectMessage.find({
      $or: [
        { senderId: me, recipientId: other },
        { senderId: other, recipientId: me },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark inbound messages as read
    await DirectMessage.updateMany(
      { senderId: other, recipientId: me, read: false },
      { $set: { read: true } }
    );

    const otherUser = await User.findById(other).select('_id email displayName').lean();

    res.json({
      messages: messages.reverse(),
      otherUser: otherUser
        ? { _id: otherUser._id, email: otherUser.email, displayName: otherUser.displayName }
        : null,
    });
  } catch (err) {
    console.error('Get DM thread error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/messages/:userId — send a message to :userId
 * Body: { message: string }
 */
router.post('/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!._id.toString();
    const other = req.params.userId;

    if (!mongoose.isValidObjectId(other)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }
    if (me === other) {
      res.status(400).json({ error: 'Cannot message yourself' });
      return;
    }

    const text = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!text) {
      res.status(400).json({ error: 'Message required' });
      return;
    }

    const recipient = await User.findById(other).select('_id').lean();
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }

    const msg = await DirectMessage.create({
      senderId: me,
      recipientId: other,
      message: text.slice(0, 2000),
    });

    const payload = {
      _id: msg._id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      message: msg.message,
      read: msg.read,
      createdAt: msg.createdAt,
    };

    // Emit real-time events via socket.io (attached by index.ts)
    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      io.to(`user:${other}`).emit('dm:message', payload);
      io.to(`user:${me}`).emit('dm:message', payload);
    }

    res.status(201).json({ message: payload });
  } catch (err) {
    console.error('Send DM error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PATCH /api/messages/:userId/read — mark all messages from :userId as read
 */
router.patch('/:userId/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!._id.toString();
    const other = req.params.userId;

    if (!mongoose.isValidObjectId(other)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }

    const result = await DirectMessage.updateMany(
      { senderId: other, recipientId: me, read: false },
      { $set: { read: true } }
    );

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      io.to(`user:${me}`).emit('dm:read', { fromUserId: other });
    }

    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Mark DM read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;
