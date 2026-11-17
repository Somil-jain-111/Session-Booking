import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/user.js';
import { Teacher } from '../src/models/teacher.js';
import { Session } from '../src/models/session.js';

let mongo: MongoMemoryServer;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await User.init();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Teacher.deleteMany({}), Session.deleteMany({})]);
});
after(async () => { await mongoose.disconnect(); await mongo?.stop(); });

async function fixture() {
  const teacher = await Teacher.create({ fullName: 'Aditi', email: 'teacher@example.com', specialization: 'Maths', experience: 5 });
  const user = await User.create({ fullName: 'Somil', email: 'somil@example.com', phone: '9876543210' });
  const slot = { teacherId: String(teacher._id), startTime: '2030-05-10T10:00:00Z', endTime: '2030-05-10T11:00:00Z' };
  return { teacher, user, slot };
}

test('creates users and enforces normalized email uniqueness', async () => {
  const input = { fullName: 'Somil Jain', email: 'Somil@example.com', phone: '9876543210' };
  const first = await request(app).post('/users').send(input).expect(201);
  assert.equal(first.body.data.email, 'somil@example.com');
  await request(app).post('/users').send({ ...input, email: 'somil@example.com' }).expect(409);
  await request(app).post('/users').send({ ...input, phone: '' }).expect(400);
});

test('validates teacher, time interval and client supplied status', async () => {
  const { slot } = await fixture();
  await request(app).post('/sessions').send({ ...slot, teacherId: String(new mongoose.Types.ObjectId()) }).expect(404);
  await request(app).post('/sessions').send({ ...slot, endTime: slot.startTime }).expect(400);
  await request(app).post('/sessions').send({ ...slot, status: 'COMPLETED' }).expect(400);
  const result = await request(app).post('/sessions').send(slot).expect(201);
  assert.equal(result.body.data.status, 'AVAILABLE');
  assert.equal(result.body.data.userId, null);
});

test('available sessions include UTC midnight and exclude the next day and booked slots', async () => {
  const { slot, user } = await fixture();
  await Session.create([
    { ...slot, startTime: '2030-05-10T00:00:00Z', endTime: '2030-05-10T01:00:00Z' },
    { ...slot, startTime: '2030-05-11T00:00:00Z', endTime: '2030-05-11T01:00:00Z' },
    { ...slot, status: 'BOOKED', userId: user._id },
  ]);
  const result = await request(app).get(`/sessions/available?dateTimestamp=${Date.parse(slot.startTime)}`).expect(200);
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].startTime, '2030-05-10T00:00:00.000Z');
  await request(app).get('/sessions/available?dateTimestamp=bad').expect(400);
  await request(app).get('/sessions/available').expect(400);
});

test('concurrent booking requests have exactly one winner', async () => {
  const { slot, user } = await fixture();
  const session = await Session.create(slot);
  const responses = await Promise.all(Array.from({ length: 8 }, () =>
    request(app).post(`/sessions/${session._id}/book`).send({ userId: String(user._id) })));
  assert.equal(responses.filter(response => response.status === 200).length, 1);
  assert.equal(responses.filter(response => response.status === 409).length, 7);
});

test('completion moves a session into history and keeps other users out', async () => {
  const { slot, user } = await fixture();
  const session = await Session.create(slot);
  const id = String(session._id);
  await request(app).patch(`/sessions/${id}/complete`).expect(409);
  await request(app).post(`/sessions/${id}/book`).send({ userId: String(user._id) }).expect(200);
  const upcoming = await request(app).get(`/users/${user._id}/sessions`).expect(200);
  assert.equal(upcoming.body.data.upcomingSessions.length, 1);
  const completed = await request(app).patch(`/sessions/${id}/complete`).expect(200);
  assert.ok(completed.body.data.completedAt);
  await request(app).patch(`/sessions/${id}/complete`).expect(409);
  const history = await request(app).get(`/users/${user._id}/sessions`).expect(200);
  assert.equal(history.body.data.upcomingSessions.length, 0);
  assert.equal(history.body.data.completedSessions.length, 1);
  const other = await User.create({ fullName: 'Other', email: 'other@example.com', phone: '9876543211' });
  const empty = await request(app).get(`/users/${other._id}/sessions`).expect(200);
  assert.deepEqual(empty.body.data, { upcomingSessions: [], completedSessions: [] });
});

test('handles missing records, invalid ids, malformed JSON and unknown routes', async () => {
  const { slot } = await fixture();
  const session = await Session.create(slot);
  const missing = String(new mongoose.Types.ObjectId());
  await request(app).post(`/sessions/${session._id}/book`).send({ userId: missing }).expect(404);
  await request(app).patch(`/sessions/${missing}/complete`).expect(404);
  await request(app).get(`/users/${missing}/sessions`).expect(404);
  await request(app).patch('/sessions/invalid/complete').expect(400);
  await request(app).post('/users').set('Content-Type', 'application/json').send('{').expect(400);
  await request(app).get('/missing').expect(404);
});
