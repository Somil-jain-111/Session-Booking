import 'dotenv/config';
import { z } from 'zod';

export const config = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
}).parse(process.env);
