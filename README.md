# MediBook: Clinic Appointment Booking Backend

Express.js + MySQL + Redis backend for a clinic booking system. Patients book 30-minute slots with doctors; the API enforces booking limits, cancellation refunds, a Redis-backed waitlist, an audit log, reports and a bilingual feedback page.

Schema diagram: [`schema-diagram.png`](schema-diagram.png) (also `.svg` and `.pdf`).

## Requirements
- Node.js 18+
- MySQL 8.0.16+ (CHECK constraints are enforced from this version)
- Redis 6.2+ (the worker uses `BLMOVE`)

VIDEO: https://drive.google.com/file/d/1FLeAkCMT-8LaPrED99B8H8JKK9rJh7By/view?usp=sharing

## Setup
```bash
git clone https://github.com/<your-username>/adv-backend-summative-medibook-project.git
cd adv-backend-summative-medibook-project
npm install
cp .env.example .env          # then put your MySQL password in .env
npm run db:setup              # runs database/schema.sql and database/seed.sql
npm start                     # terminal 1: web API on http://localhost:3000
npm run worker                # terminal 2: waitlist + notification worker (separate process)
npm test                      # unit tests, no MySQL or Redis needed
```
You can also load the database by hand: `mysql -u root -p < database/schema.sql` then `mysql -u root -p < database/seed.sql`.

## Project structure
```
database/   schema.sql, seed.sql
src/
  config/       env settings + businessRules.js (every business number, defined once)
  db/           connection pool + transaction helper (no SQL text)
  models/       ALL SQL lives here, parameterized with ?
  services/     business rules: booking, cancellation, waitlist, notifications
  controllers/  read the request, call services/models, send the response
  routes/       URL to controller mapping only
  middleware/   id check, 404, central error handler
  queues/       Redis waitlist, job queue, connections
  utils/        pure functions (refund calculator, validators), audit logger, errors
  views/        feedback page HTML
  worker.js     separate worker process
locales/      en.json, fr.json
tests/        Jest unit tests
```

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/patients` | list / create |
| GET/PUT/PATCH/DELETE | `/api/patients/:id` | read / replace / update / delete |
| GET/POST | `/api/doctors` | list / create |
| GET/PUT/PATCH/DELETE | `/api/doctors/:id` | read / replace / update / delete |
| GET | `/api/doctors/:id/statistics` | revenue, upcoming count, next 7 days, utilization |
| GET/POST | `/api/appointments` | list (filters: `doctorId`, `patientId`, `status`) / book |
| GET | `/api/appointments/:id` | one appointment |
| PATCH | `/api/appointments/:id/cancel` | cancel with refund |
| POST | `/api/waitlist` | join the waitlist for a full slot or day |
| GET | `/api/waitlist?doctorId=1&date=2026-12-01` | view a waitlist |
| GET | `/api/waitlist/failed` | promotions that could not be booked |
| GET | `/api/reports/doctors` | every doctor with totals and revenue |
| GET | `/api/reports/busy-days` | doctor-days above 80% of the daily cap |
| GET | `/feedback` and `/feedback?lang=fr` | feedback page (English / French) |

Book: `POST /api/appointments` with `{ "patientId": 1, "doctorId": 1, "appointmentDatetime": "2026-12-01T09:30:00" }`.
Times are clinic local time (no timezone). The price is read from the doctor's fee on the server.

Status codes: `400` malformed input, `404` not found, `409` conflict (slot taken, day full, duplicate email, already cancelled, delete with appointments), `422` rule broken (past time, outside hours, not on a 30-minute boundary, cancelling a past appointment), `503` Redis unavailable for the waitlist.

## Business rules and decisions

### Part C: booking and cancellation
- **Rules checked:** future only; 09:00-17:00 with the last slot starting 16:30 (a slot must end by 17:00, so 17:00 itself is rejected); start on :00 or :30; max 12 booked appointments per doctor per day.
- **No double booking, even with simultaneous requests:** a booking runs in one transaction that first locks the doctor row (`SELECT ... FOR UPDATE`). Requests for the same doctor wait in line, so the slot check and the 12-per-day count are always up to date. The database is a second safety net: `UNIQUE (doctor_id, active_slot)`.
- **Cancelled slots can be rebooked and history is kept:** `active_slot` is a generated column equal to `appt_datetime` only while `status = 'booked'`, otherwise `NULL`. A UNIQUE index allows many NULLs, so a cancelled row never blocks the slot, and the row (with its refund) stays in the table.
- **Refund (calculated on the server):** more than 48 hours before the appointment = 100%; from 24 up to and including 48 hours = 50%; less than 24 hours = 0%. So exactly 48h and exactly 24h both give 50%.
- **Cancellation and refund succeed or fail together:** the appointment row is locked and updated (`status`, `refund_amount`, `cancelled_at`) in one transaction.
- Already cancelled returns `409`; an appointment that has already started returns `422`.

### Part D: audit log
Every successful booking and cancellation is appended as one JSON line to `logs/audit.log` using async `fs.promises` only. `logs/` is created automatically. The logger catches its own errors, so a logging problem never fails a request.

### Part E: Redis queues and worker
- When a booking fails because the slot is taken or the day is full, the `409` response includes a waitlist offer. `POST /api/waitlist` stores the request in a Redis list per doctor and day (first in, first out).
- A cancellation pushes a "slot freed" job. The separate `npm run worker` process reads it and tries to book waitlisted patients in order using the same booking service (all rules apply again).
- **A patient is never lost:** a waitlist entry is removed only after its booking is committed. If the booking cannot be made for a permanent reason (for example the patient no longer exists), the entry is moved to `waitlist:failed` in one atomic Redis step. If the slot or day is still full, the entry simply stays in line.
- Jobs are moved to a "processing" list while running and recovered when the worker restarts; after 3 failed attempts a job goes to a dead list.
- Each booking also queues a confirmation job; the worker writes the confirmation to the audit log.
- If Redis is down, booking and cancellation still work; only the waitlist endpoints return `503`.

### Reports (all in SQL)
- Doctor statistics: revenue collected (amount paid minus refunds), upcoming appointments, bookings for each of the next 7 days (a recursive date series so empty days show 0) and utilization percent against the 12-slot cap.
- Doctors report: `LEFT JOIN`, so a doctor with no appointments still appears.
- Busy days: `GROUP BY doctor and date` with `HAVING COUNT(*) > 12 * 0.8`, so 10 or more bookings.

## Seed data
4 patients, 3 doctors (Dr. Mensah-Adjei starts with no appointments), 17 appointments including past ones and one cancelled-with-refund row. Dr. Boateng has 11 of 12 slots booked three days from today (near the cap). Dates are relative to the day you run the seed, so they are always in the future.

## Tests
`npm test` runs 36 Jest tests with no MySQL or Redis: refund tiers and both exact boundaries (24h, 48h) with fixed dates, slot validation edge cases (17:00, 09:15, past), input validators, and the feedback page in both languages.
