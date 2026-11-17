import { Router } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/user.js';
import { Session } from '../models/session.js';
import { HttpError } from '../middleware/errors.js';
import { objectId, userInput } from '../validation.js';

export const userRoutes = Router();

userRoutes.post('/', async (req, res) => {
  const user = await User.create(userInput.parse(req.body));
  res.status(201).json({ data: user });
});

userRoutes.get('/:id/sessions', async (req, res) => {
  const userId = objectId.parse(req.params.id);
  if (!await User.exists({ _id: userId })) throw new HttpError(404, 'User not found');

  const [sessions] = await Session.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $facet: {
      upcomingSessions: [
        { $match: { status: 'BOOKED' } },
        { $sort: { startTime: 1, _id: 1 } },
      ],
      completedSessions: [
        { $match: { status: 'COMPLETED' } },
        { $sort: { completedAt: -1, _id: 1 } },
      ],
    } },
  ]);
  res.json({ data: sessions });
});
