import { Router } from 'express';
import { z } from 'zod';
import { Teacher } from '../models/teacher.js';
import { User } from '../models/user.js';
import { Session } from '../models/session.js';
import { HttpError } from '../middleware/errors.js';
import { objectId, sessionInput, timestampInput } from '../validation.js';

export const sessionRoutes = Router();

sessionRoutes.post('/', async (req, res) => {
  const input = sessionInput.parse(req.body);
  if (!await Teacher.exists({ _id: input.teacherId })) throw new HttpError(404, 'Teacher not found');
  const session = await Session.create(input);
  res.status(201).json({ data: session });
});

sessionRoutes.get('/available', async (req, res) => {
  const timestamp = timestampInput.parse(req.query.dateTimestamp);
  const dayStart = new Date(timestamp);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const sessions = await Session.aggregate([
    { $match: { status: 'AVAILABLE', startTime: { $gte: dayStart, $lt: dayEnd } } },
    { $sort: { startTime: 1, _id: 1 } },
  ]);
  res.json({ data: sessions });
});

sessionRoutes.post('/:id/book', async (req, res) => {
  const sessionId = objectId.parse(req.params.id);
  const { userId } = z.object({ userId: objectId }).strict().parse(req.body);
  if (!await User.exists({ _id: userId })) throw new HttpError(404, 'User not found');

  // Checking and updating in one write prevents two requests booking the same slot.
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: 'AVAILABLE' },
    { $set: { userId, status: 'BOOKED' } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!session) {
    if (!await Session.exists({ _id: sessionId })) throw new HttpError(404, 'Session not found');
    throw new HttpError(409, 'Session is no longer available');
  }
  res.json({ data: session });
});

sessionRoutes.patch('/:id/complete', async (req, res) => {
  const sessionId = objectId.parse(req.params.id);
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: 'BOOKED' },
    { $set: { status: 'COMPLETED', completedAt: new Date() } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!session) {
    if (!await Session.exists({ _id: sessionId })) throw new HttpError(404, 'Session not found');
    throw new HttpError(409, 'Only booked sessions can be completed');
  }
  res.json({ data: session });
});
