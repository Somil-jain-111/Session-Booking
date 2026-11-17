# Session Booking API

A small REST API for booking teacher sessions. Built with Node.js, TypeScript, Express, MongoDB and Mongoose.

## Run locally

Requires Node.js 22+ and a running MongoDB instance (local or Atlas).

```sh
npm install
cp .env.example .env
# Set MONGODB_URI in .env if using Atlas or a different local database.
npm run seed
npm run dev
```

The seed command creates one sample teacher without deleting existing data. Copy the printed teacher ID into the Postman collection's `teacherId` variable.

For a compiled build:

```sh
npm run build
npm start
```

Configuration: `MONGODB_URI` is required; `PORT` defaults to `3000`.

## Endpoints

| Method | Path | Input | Success |
| --- | --- | --- | --- |
| POST | `/users` | `fullName`, `email`, `phone` | 201 |
| POST | `/sessions` | `teacherId`, `startTime`, `endTime` | 201 |
| GET | `/sessions/available?dateTimestamp=1904637600000` | Unix timestamp in milliseconds | 200 |
| POST | `/sessions/:id/book` | `userId` | 200 |
| PATCH | `/sessions/:id/complete` | No body | 200 |
| GET | `/users/:id/sessions` | No body | 200 |

Dates in session creation must be ISO 8601 strings with `Z` or an explicit offset, for example `2030-05-10T10:00:00Z`.

Responses use `{ "data": ... }`. Errors use `{ "error": { "message": "..." } }`, with validation details where relevant. Invalid input returns 400, missing records 404, and duplicate emails or invalid session transitions 409.

## Try the complete flow

Import `postman/session-booking.postman_collection.json`. Set `baseUrl` if needed and set `teacherId` from the seed output. Run requests in order: create user, create session, list availability, book, view upcoming sessions, complete, then view history. The collection stores generated user/session IDs automatically and checks response statuses.

## Implementation notes

- Both list endpoints use MongoDB aggregation. Availability matches the UTC day containing `dateTimestamp`, using an inclusive start and exclusive next-day boundary. Sessions are selected by their start time.
- User history uses `$facet` to return `upcomingSessions` and `completedSessions` together. Upcoming means every BOOKED session, including overdue sessions still awaiting completion; this avoids silently hiding bookings. Completed sessions are sorted by completion time, newest first.
- Booking uses a single conditional `findOneAndUpdate` on AVAILABLE status. Concurrent requests cannot both claim the same session. Completion similarly only accepts BOOKED status.
- Email uniqueness is backed by a MongoDB unique index. The server waits for that index before accepting requests. Emails are lowercased.
- Teacher creation was not requested, so a repeatable seed command supplies a teacher for testing.
- No authentication, cancellation, overlap checks, or restrictions on past bookings/completion times were specified. These are outside this assignment. User IDs are supplied by the caller; a deployed product would require authentication and authorization before exposing these routes.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

Integration tests use a temporary MongoDB process through `mongodb-memory-server`; they do not touch the configured application database. The first run downloads a MongoDB binary and needs internet access. Tests cover validation, duplicate emails, UTC date boundaries, concurrent booking, completion and history isolation.

Source is organized by models, routes and shared middleware. Express 5 forwards rejected async handlers to the centralized error handler.
