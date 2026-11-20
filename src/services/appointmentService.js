const { withTransaction } = require('../db/transaction');
const appointmentModel = require('../models/appointmentModel');
const doctorModel = require('../models/doctorModel');
const patientModel = require('../models/patientModel');
const { MAX_APPOINTMENTS_PER_DAY } = require('../config/businessRules');
const AppError = require('../utils/AppError');
const { calculateRefund } = require('../utils/refundCalculator');
const {
  parseAppointmentDatetime,
  validateSlot,
  formatMysqlDatetime,
  formatMysqlDate,
  parseMysqlDatetime,
} = require('../utils/validators');
const { writeAuditLog } = require('../utils/auditLogger');
const { enqueueConfirmation } = require('./notificationService');
const { getSharedRedis } = require('../queues/redisClient');
const { enqueue } = require('../queues/jobQueue');
const QUEUE_NAMES = require('../queues/queueNames');

function waitlistOffer(patientId, doctorId, appointmentDatetime) {
  return {
    waitlist: {
      available: true,
      joinWith: 'POST /api/waitlist',
      body: { patientId, doctorId, appointmentDatetime },
    },
  };
}

function slotTakenError(patientId, doctorId, slot) {
  return new AppError(409, 'This doctor already has an appointment at that time', 'SLOT_TAKEN', waitlistOffer(patientId, doctorId, slot));
}

function dayFullError(patientId, doctorId, slot) {
  return new AppError(
    409,
    `This doctor is fully booked that day (${MAX_APPOINTMENTS_PER_DAY} appointments)`,
    'DAY_FULL',
    waitlistOffer(patientId, doctorId, slot),
  );
}

function dayBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { from: formatMysqlDatetime(start), to: formatMysqlDatetime(nextDay) };
}

// Parses and validates the requested time. Throws 400 (malformed) or 422 (rule broken).
function parseBookingTime(appointmentDatetime, now) {
  const parsed = parseAppointmentDatetime(appointmentDatetime);
  if (!parsed.valid) throw new AppError(400, parsed.message, 'INVALID_DATETIME');
  const slotCheck = validateSlot(parsed.date, now);
  if (!slotCheck.valid) throw new AppError(422, slotCheck.message, slotCheck.code);
  return parsed.date;
}

async function bookAppointment({ patientId, doctorId, appointmentDatetime }, { now = new Date(), source = 'api' } = {}) {
  const date = parseBookingTime(appointmentDatetime, now);
  const slot = formatMysqlDatetime(date);
  const { from, to } = dayBounds(date);

  const appointmentId = await withTransaction(async (connection) => {
    // Lock the doctor row first: bookings for one doctor are handled one at a time,
    // so the "is the slot free?" and "is the day full?" checks cannot go stale.
    const doctor = await doctorModel.findByIdForUpdate(doctorId, connection);
    if (!doctor) throw new AppError(404, `Doctor ${doctorId} not found`, 'DOCTOR_NOT_FOUND');

    const patient = await patientModel.findById(patientId, connection);
    if (!patient) throw new AppError(404, `Patient ${patientId} not found`, 'PATIENT_NOT_FOUND');

    if (await appointmentModel.findActiveBySlot(doctorId, slot, connection)) {
      throw slotTakenError(patientId, doctorId, slot);
    }

    const bookedToday = await appointmentModel.countBookedBetween(doctorId, from, to, connection);
    if (bookedToday >= MAX_APPOINTMENTS_PER_DAY) throw dayFullError(patientId, doctorId, slot);

    try {
      // The price is read on the server from the doctor's fee, never trusted from the client.
      return await appointmentModel.insert(
        { patientId, doctorId, appointmentDatetime: slot, amountPaid: doctor.consultation_fee },
        connection,
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') throw slotTakenError(patientId, doctorId, slot);
      throw error;
    }
  });

  const appointment = await appointmentModel.findById(appointmentId);
  await writeAuditLog('BOOKING', {
    appointmentId,
    patientId,
    doctorId,
    appointmentDatetime: appointment.appt_datetime,
    amountPaid: appointment.amount_paid,
    source,
  });
  await enqueueConfirmation(appointmentId);
  return appointment;
}

async function cancelAppointment(appointmentId, { now = new Date() } = {}) {
  const outcome = await withTransaction(async (connection) => {
    const appointment = await appointmentModel.findByIdForUpdate(appointmentId, connection);
    if (!appointment) throw new AppError(404, `Appointment ${appointmentId} not found`, 'APPOINTMENT_NOT_FOUND');
    if (appointment.status === 'cancelled') {
      throw new AppError(409, 'This appointment is already cancelled', 'ALREADY_CANCELLED');
    }

    const appointmentAt = parseMysqlDatetime(appointment.appt_datetime);
    if (appointmentAt.getTime() <= now.getTime()) {
      throw new AppError(422, 'Appointments that have already started cannot be cancelled', 'APPOINTMENT_IN_PAST');
    }

    // The refund is always calculated here, never accepted from the request.
    const refund = calculateRefund({ amountPaid: appointment.amount_paid, appointmentAt, cancelledAt: now });
    await appointmentModel.markCancelled(
      { id: appointmentId, refundAmount: refund.refundAmount, cancelledAt: formatMysqlDatetime(now) },
      connection,
    );
    return { appointment, refund };
  });

  const { appointment, refund } = outcome;
  await writeAuditLog('CANCELLATION', {
    appointmentId,
    patientId: appointment.patient_id,
    doctorId: appointment.doctor_id,
    appointmentDatetime: appointment.appt_datetime,
    refundPercent: refund.percent,
    refundAmount: refund.refundAmount,
  });
  await notifyWaitlistOfFreedSlot(appointment);

  return {
    appointment: await appointmentModel.findById(appointmentId),
    refund: { percent: refund.percent, amount: refund.refundAmount, hoursOfNotice: Math.round(refund.hoursOfNotice * 100) / 100 },
  };
}

// Tells the worker a slot is free. If Redis is down the cancellation still stands.
async function notifyWaitlistOfFreedSlot(appointment) {
  try {
    await enqueue(getSharedRedis(), QUEUE_NAMES.SLOT_FREED, {
      doctorId: appointment.doctor_id,
      appointmentDatetime: appointment.appt_datetime,
    });
  } catch (error) {
    console.error(`Could not notify waitlist for appointment ${appointment.id}: ${error.message}`);
  }
}

async function getAppointment(id) {
  const appointment = await appointmentModel.findById(id);
  if (!appointment) throw new AppError(404, `Appointment ${id} not found`, 'APPOINTMENT_NOT_FOUND');
  return appointment;
}

module.exports = {
  bookAppointment,
  cancelAppointment,
  getAppointment,
  parseBookingTime,
  dayBounds,
};
