import { z } from 'zod';

export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid MongoDB ObjectId');
export const userInput = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/, 'Enter a valid phone number'),
}).strict();

const dateTime = z.iso.datetime({ offset: true }).transform(value => new Date(value));
export const sessionInput = z.object({
  teacherId: objectId,
  startTime: dateTime,
  endTime: dateTime,
}).strict().refine(value => value.endTime > value.startTime, {
  path: ['endTime'], message: 'endTime must be after startTime',
});

// The API accepts Unix milliseconds and consistently interprets dates in UTC.
export const timestampInput = z.string().regex(/^\d+$/).transform(Number)
  .refine(value => Number.isSafeInteger(value) && value <= 8640000000000000 - 86400000, 'Invalid timestamp');
