const pool = require('../db/pool');

const SELECT_WITH_NAMES = `
  SELECT a.id, a.patient_id, a.doctor_id, a.appt_datetime, a.status, a.amount_paid,
         a.refund_amount, a.booked_on, a.cancelled_at,
         p.full_name AS patient_name, p.email AS patient_email,
         d.full_name AS doctor_name, d.room AS doctor_room
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN doctors d ON d.id = a.doctor_id`;

async function insert({ patientId, doctorId, appointmentDatetime, amountPaid }, db = pool) {
  const [result] = await db.execute(
    'INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES (?, ?, ?, ?)',
    [patientId, doctorId, appointmentDatetime, amountPaid],
  );
  return result.insertId;
}

async function findById(id, db = pool) {
  const [rows] = await db.execute(`${SELECT_WITH_NAMES} WHERE a.id = ?`, [id]);
  return rows[0] || null;
}

// Locks the appointment row so two cancellations of the same booking cannot both succeed.
async function findByIdForUpdate(id, db) {
  const [rows] = await db.execute(
    `SELECT id, patient_id, doctor_id, appt_datetime, status, amount_paid
     FROM appointments WHERE id = ? FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function findActiveBySlot(doctorId, appointmentDatetime, db = pool) {
  const [rows] = await db.execute(
    `SELECT id, patient_id FROM appointments
     WHERE doctor_id = ? AND appt_datetime = ? AND status = 'booked'`,
    [doctorId, appointmentDatetime],
  );
  return rows[0] || null;
}

async function countBookedBetween(doctorId, fromDatetime, toDatetime, db = pool) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM appointments
     WHERE doctor_id = ? AND status = 'booked' AND appt_datetime >= ? AND appt_datetime < ?`,
    [doctorId, fromDatetime, toDatetime],
  );
  return rows[0].total;
}

// Cancellation and refund are stored in the same row, written by one UPDATE.
async function markCancelled({ id, refundAmount, cancelledAt }, db = pool) {
  const [result] = await db.execute(
    `UPDATE appointments
     SET status = 'cancelled', refund_amount = ?, cancelled_at = ?
     WHERE id = ? AND status = 'booked'`,
    [refundAmount, cancelledAt, id],
  );
  return result.affectedRows > 0;
}

async function findAll({ doctorId, patientId, status } = {}, db = pool) {
  const conditions = [];
  const params = [];
  if (doctorId) { conditions.push('a.doctor_id = ?'); params.push(doctorId); }
  if (patientId) { conditions.push('a.patient_id = ?'); params.push(patientId); }
  if (status) { conditions.push('a.status = ?'); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await db.execute(`${SELECT_WITH_NAMES} ${where} ORDER BY a.appt_datetime, a.id`, params);
  return rows;
}

module.exports = {
  insert,
  findById,
  findByIdForUpdate,
  findActiveBySlot,
  countBookedBetween,
  markCancelled,
  findAll,
};
