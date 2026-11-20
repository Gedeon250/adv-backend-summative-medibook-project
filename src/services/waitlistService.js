const appointmentModel = require('../models/appointmentModel');
const doctorModel = require('../models/doctorModel');
const patientModel = require('../models/patientModel');
const { MAX_APPOINTMENTS_PER_DAY } = require('../config/businessRules');
const AppError = require('../utils/AppError');
const { formatMysqlDatetime } = require('../utils/validators');
const { writeAuditLog } = require('../utils/auditLogger');
const { getSharedRedis } = require('../queues/redisClient');
const waitlistQueue = require('../queues/waitlistQueue');
const appointmentService = require('./appointmentService');

const RETRYABLE_CODES = ['SLOT_TAKEN', 'DAY_FULL'];

async function withRedis(work) {
  try {
    return await work(getSharedRedis());
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, 'The waitlist is temporarily unavailable', 'REDIS_UNAVAILABLE');
  }
}

async function joinWaitlist({ patientId, doctorId, appointmentDatetime }, { now = new Date() } = {}) {
  const date = appointmentService.parseBookingTime(appointmentDatetime, now);
  const slot = formatMysqlDatetime(date);

  if (!(await doctorModel.findById(doctorId))) throw new AppError(404, `Doctor ${doctorId} not found`, 'DOCTOR_NOT_FOUND');
  if (!(await patientModel.findById(patientId))) throw new AppError(404, `Patient ${patientId} not found`, 'PATIENT_NOT_FOUND');

  const holder = await appointmentModel.findActiveBySlot(doctorId, slot);
  if (holder && holder.patient_id === patientId) {
    throw new AppError(409, 'You already hold this appointment', 'ALREADY_BOOKED');
  }
  const { from, to } = appointmentService.dayBounds(date);
  const bookedToday = await appointmentModel.countBookedBetween(doctorId, from, to);
  if (!holder && bookedToday < MAX_APPOINTMENTS_PER_DAY) {
    throw new AppError(422, 'That slot is available, book it directly instead of joining the waitlist', 'SLOT_AVAILABLE');
  }

  return withRedis(async (redis) => {
    const day = slot.slice(0, 10);
    const existing = await waitlistQueue.getEntries(redis, doctorId, day);
    if (existing.some(({ entry }) => entry.patientId === patientId && entry.appointmentDatetime === slot)) {
      throw new AppError(409, 'This patient is already on the waitlist for that slot', 'ALREADY_ON_WAITLIST');
    }
    await waitlistQueue.addEntry(redis, { patientId, doctorId, appointmentDatetime: slot, joinedAt: new Date().toISOString() });
    return { position: existing.length + 1, doctorId, appointmentDatetime: slot };
  });
}

async function listWaitlist(doctorId, day) {
  return withRedis(async (redis) => (await waitlistQueue.getEntries(redis, doctorId, day)).map(({ entry }) => entry));
}

async function listFailedPromotions() {
  return withRedis((redis) => waitlistQueue.getFailed(redis));
}

// Runs in the worker when a slot is freed. A waitlist entry is only removed AFTER its
// booking is committed, or moved to the failed list, so a patient is never in neither place.
async function promoteFromWaitlist(redis, { doctorId, appointmentDatetime }) {
  const day = appointmentDatetime.slice(0, 10);
  const entries = await waitlistQueue.getEntries(redis, doctorId, day);

  for (const { raw, entry } of entries) {
    const alreadyHolds = await appointmentModel.findActiveBySlot(entry.doctorId, entry.appointmentDatetime);
    if (alreadyHolds && alreadyHolds.patient_id === entry.patientId) {
      await waitlistQueue.removeEntry(redis, doctorId, day, raw);
      continue;
    }

    try {
      const booked = await appointmentService.bookAppointment(
        { patientId: entry.patientId, doctorId: entry.doctorId, appointmentDatetime: entry.appointmentDatetime },
        { source: 'waitlist' },
      );
      await waitlistQueue.removeEntry(redis, doctorId, day, raw);
      await writeAuditLog('WAITLIST_PROMOTED', { appointmentId: booked.id, patientId: entry.patientId, doctorId });
      return booked;
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      if (RETRYABLE_CODES.includes(error.code)) continue;
      await waitlistQueue.moveToFailed(redis, doctorId, day, raw, error.code);
      await writeAuditLog('WAITLIST_PROMOTION_FAILED', { patientId: entry.patientId, doctorId, reason: error.code });
    }
  }
  return null;
}

module.exports = { joinWaitlist, listWaitlist, listFailedPromotions, promoteFromWaitlist };
