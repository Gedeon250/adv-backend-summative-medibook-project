const QUEUE_NAMES = require('./queueNames');

// One Redis list per doctor and day, oldest request first (FIFO).

async function addEntry(redis, entry) {
  const raw = JSON.stringify(entry);
  await redis.rpush(QUEUE_NAMES.waitlistKey(entry.doctorId, entry.appointmentDatetime.slice(0, 10)), raw);
  return raw;
}

async function getEntries(redis, doctorId, date) {
  const rawEntries = await redis.lrange(QUEUE_NAMES.waitlistKey(doctorId, date), 0, -1);
  return rawEntries.map((raw) => ({ raw, entry: JSON.parse(raw) }));
}

// Called only AFTER the promoted booking is committed.
async function removeEntry(redis, doctorId, date, raw) {
  await redis.lrem(QUEUE_NAMES.waitlistKey(doctorId, date), 1, raw);
}

// Atomically takes the entry off the waitlist and parks it in the failed list,
// so the patient is always in exactly one of: waitlist, appointments, or failed.
async function moveToFailed(redis, doctorId, date, raw, reason) {
  const failed = JSON.stringify({ ...JSON.parse(raw), failedAt: new Date().toISOString(), reason });
  await redis.multi()
    .lrem(QUEUE_NAMES.waitlistKey(doctorId, date), 1, raw)
    .rpush(QUEUE_NAMES.WAITLIST_FAILED, failed)
    .exec();
}

async function getFailed(redis) {
  const rawEntries = await redis.lrange(QUEUE_NAMES.WAITLIST_FAILED, 0, -1);
  return rawEntries.map((raw) => JSON.parse(raw));
}

module.exports = { addEntry, getEntries, removeEntry, moveToFailed, getFailed };
