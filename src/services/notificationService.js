const appointmentModel = require('../models/appointmentModel');
const { getSharedRedis } = require('../queues/redisClient');
const { enqueue } = require('../queues/jobQueue');
const QUEUE_NAMES = require('../queues/queueNames');
const { writeAuditLog } = require('../utils/auditLogger');

// Never throws: if Redis is down the booking is still valid, we just skip the job.
async function enqueueConfirmation(appointmentId) {
  try {
    await enqueue(getSharedRedis(), QUEUE_NAMES.NOTIFICATIONS, { type: 'APPOINTMENT_CONFIRMATION', appointmentId });
  } catch (error) {
    console.error(`Could not queue confirmation for appointment ${appointmentId}: ${error.message}`);
  }
}

// Runs in the worker. "Sending" the message means writing it to the audit log.
async function processConfirmation({ appointmentId }) {
  const appointment = await appointmentModel.findById(appointmentId);
  if (!appointment || appointment.status !== 'booked') {
    await writeAuditLog('CONFIRMATION_SKIPPED', { appointmentId, reason: 'appointment missing or cancelled' });
    return;
  }
  await writeAuditLog('CONFIRMATION_SENT', {
    appointmentId,
    channel: 'email',
    to: appointment.patient_email,
    message: `Hello ${appointment.patient_name}, your appointment with ${appointment.doctor_name} `
      + `(room ${appointment.doctor_room}) is confirmed for ${appointment.appt_datetime}.`,
  });
}

module.exports = { enqueueConfirmation, processConfirmation };
