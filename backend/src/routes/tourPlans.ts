import { Response, Router } from 'express';
import mongoose from 'mongoose';
import TourPlan from '../models/TourPlan';
import Tour from '../models/Tour';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/tour-plans — List plans where user is creator or member
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const plans = await TourPlan.find({ $or: [{ creatorId: userId }, { members: userId }] })
      .sort({ updatedAt: -1 })
      .lean();

    const tourIds = [...new Set(plans.map((p) => p.tourId.toString()))];
    const tours = await Tour.find({ _id: { $in: tourIds } }).lean();
    const tourMap = new Map(tours.map((t) => [t._id.toString(), t]));

    const memberIds = [...new Set(plans.flatMap((p) => [p.creatorId, ...p.members]))];
    const users = await User.find({ _id: { $in: memberIds } }).select('_id email displayName').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enriched = plans.map((plan) => ({
      ...plan,
      tour: tourMap.get(plan.tourId.toString()) ?? null,
      memberDetails: plan.members.map((id) => userMap.get(id) ?? { _id: id, displayName: 'Unknown' }),
      creatorDetails: userMap.get(plan.creatorId) ?? { _id: plan.creatorId, displayName: 'Unknown' },
    }));

    res.json({ plans: enriched });
  } catch (err) {
    console.error('List tour plans error:', err);
    res.status(500).json({ error: 'Failed to list tour plans' });
  }
});

/**
 * POST /api/tour-plans — Create a plan for a tour
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { tourId, title, plannedDate, notes } = req.body;

    if (!tourId || !mongoose.isValidObjectId(tourId)) {
      res.status(400).json({ error: 'Valid tourId is required' });
      return;
    }

    const tour = await Tour.findById(tourId).lean();
    if (!tour) { res.status(404).json({ error: 'Tour not found' }); return; }

    const plan = await TourPlan.create({
      tourId,
      creatorId: userId,
      title: title || `Plan: ${tour.title}`,
      members: [userId],
      plannedDate: plannedDate ? new Date(plannedDate) : undefined,
      notes: notes ?? '',
    });

    res.status(201).json({ plan });
  } catch (err) {
    console.error('Create tour plan error:', err);
    res.status(500).json({ error: 'Failed to create tour plan' });
  }
});

/**
 * GET /api/tour-plans/:id — Get plan details
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await TourPlan.findById(req.params.id).lean();
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    const tour = await Tour.findById(plan.tourId).lean();
    const memberIds = [...new Set([plan.creatorId, ...plan.members])];
    const users = await User.find({ _id: { $in: memberIds } }).select('_id email displayName').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    res.json({
      plan: {
        ...plan,
        tour,
        memberDetails: plan.members.map((id) => userMap.get(id) ?? { _id: id, displayName: 'Unknown' }),
        creatorDetails: userMap.get(plan.creatorId),
      },
    });
  } catch (err) {
    console.error('Get tour plan error:', err);
    res.status(500).json({ error: 'Failed to fetch tour plan' });
  }
});

/**
 * POST /api/tour-plans/:id/join — Join a plan
 */
router.post('/:id/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const plan = await TourPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    if (plan.members.includes(userId)) {
      res.json({ plan });
      return;
    }

    plan.members.push(userId);
    plan.messages.push({
      userId,
      displayName: req.user!.displayName || req.user!.email.split('@')[0],
      message: 'joined the plan!',
      createdAt: new Date(),
    });
    await plan.save();

    res.json({ plan });
  } catch (err) {
    console.error('Join tour plan error:', err);
    res.status(500).json({ error: 'Failed to join plan' });
  }
});

/**
 * POST /api/tour-plans/:id/leave — Leave a plan
 */
router.post('/:id/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const plan = await TourPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    plan.members = plan.members.filter((m) => m !== userId);
    plan.messages.push({
      userId,
      displayName: req.user!.displayName || req.user!.email.split('@')[0],
      message: 'left the plan.',
      createdAt: new Date(),
    });
    await plan.save();

    res.json({ plan });
  } catch (err) {
    console.error('Leave tour plan error:', err);
    res.status(500).json({ error: 'Failed to leave plan' });
  }
});

/**
 * POST /api/tour-plans/:id/messages — Send a message in plan chat
 */
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const plan = await TourPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    if (!plan.members.includes(userId)) {
      res.status(403).json({ error: 'You must join the plan first' });
      return;
    }

    const { message } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'Message required' }); return; }

    plan.messages.push({
      userId,
      displayName: req.user!.displayName || req.user!.email.split('@')[0],
      message: message.trim().slice(0, 1000),
      createdAt: new Date(),
    });
    await plan.save();

    res.json({ messages: plan.messages });
  } catch (err) {
    console.error('Tour plan message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PATCH /api/tour-plans/:id — Update plan status/notes
 */
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const plan = await TourPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }
    if (plan.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can modify the plan' });
      return;
    }

    const { status, notes, plannedDate, title } = req.body;
    if (status) plan.status = status;
    if (notes !== undefined) plan.notes = notes;
    if (plannedDate) plan.plannedDate = new Date(plannedDate);
    if (title) plan.title = title;
    await plan.save();

    res.json({ plan });
  } catch (err) {
    console.error('Update tour plan error:', err);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

/**
 * POST /api/tour-plans/:id/invite — Invite a user (by userId)
 */
router.post('/:id/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await TourPlan.findById(req.params.id);
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    const { userId: inviteeId } = req.body;
    if (!inviteeId) { res.status(400).json({ error: 'userId required' }); return; }

    const invitee = await User.findById(inviteeId).select('_id email displayName').lean();
    if (!invitee) { res.status(404).json({ error: 'User not found' }); return; }

    if (!plan.members.includes(inviteeId)) {
      plan.members.push(inviteeId);
      plan.messages.push({
        userId: req.user!._id.toString(),
        displayName: req.user!.displayName || req.user!.email.split('@')[0],
        message: `invited ${invitee.displayName || invitee.email.split('@')[0]} to the plan`,
        createdAt: new Date(),
      });
      await plan.save();
    }

    res.json({ plan });
  } catch (err) {
    console.error('Invite to plan error:', err);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

export default router;
