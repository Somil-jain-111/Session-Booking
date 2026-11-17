import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { Teacher } from '../src/models/teacher.js';

async function seed() {
  await mongoose.connect(config.MONGODB_URI);
  const teacher = await Teacher.findOneAndUpdate(
    { email: 'teacher@example.com' },
    { $setOnInsert: { fullName: 'Aditi Sharma', email: 'teacher@example.com', specialization: 'Mathematics', experience: 5 } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  console.log(`Teacher ID: ${teacher!._id}`);
}

async function main() {
  try { await seed(); }
  finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
