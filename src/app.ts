import express from 'express';
import { userRoutes } from './routes/users.js';
import { sessionRoutes } from './routes/sessions.js';
import { errorHandler } from './middleware/errors.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/users', userRoutes);
app.use('/sessions', sessionRoutes);
app.use((_req, res) => { res.status(404).json({ error: { message: 'Route not found' } }); });
app.use(errorHandler);
