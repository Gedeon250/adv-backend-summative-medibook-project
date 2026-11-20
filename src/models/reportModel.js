const pool = require('../db/pool');

// All numbers below are produced by MySQL (joins, aggregates, a recursive date series).
// Revenue collected = amount paid minus anything refunded.

async function doctorsReport(db = pool) {
  const [rows] = await db.execute(
    `SELECT d.id AS doctor_id, d.full_name, d.specialty,
            COUNT(CASE WHEN a.status = 'booked' THEN 1 END)    AS booked_appointments,
            COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) AS cancelled_appointments,
            COUNT(a.id)                                        AS total_appointments,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.id
     GROUP BY d.id, d.full_name, d.specialty
     ORDER BY revenue_collected DESC, d.full_name`,
  );
  return rows;
}

async function busyDays({ dailyCap, threshold }, db = pool) {
  const [rows] = await db.execute(
    `SELECT d.id AS doctor_id, d.full_name AS doctor_name,
            DATE(a.appt_datetime) AS appointment_date,
            COUNT(*) AS booked_appointments,
            ROUND(COUNT(*) * 100 / ?, 1) AS utilization_percent
     FROM appointments a
     JOIN doctors d ON d.id = a.doctor_id
     WHERE a.status = 'booked'
     GROUP BY d.id, d.full_name, DATE(a.appt_datetime)
     HAVING COUNT(*) > ? * ?
     ORDER BY appointment_date, d.full_name`,
    [dailyCap, dailyCap, threshold],
  );
  return rows;
}

async function doctorSummary({ doctorId, now, today, windowDays, dailyCap }, db = pool) {
  const [rows] = await db.execute(
    `SELECT d.id AS doctor_id, d.full_name, d.specialty,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected,
            COALESCE(SUM(a.status = 'booked' AND a.appt_datetime > ?), 0) AS upcoming_appointments,
            COALESCE(SUM(a.status = 'booked'
                         AND a.appt_datetime >= ?
                         AND a.appt_datetime < DATE_ADD(?, INTERVAL ? DAY)), 0) AS booked_in_window,
            ROUND(100 * COALESCE(SUM(a.status = 'booked'
                         AND a.appt_datetime >= ?
                         AND a.appt_datetime < DATE_ADD(?, INTERVAL ? DAY)), 0) / (? * ?), 1) AS utilization_percent
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.id
     WHERE d.id = ?
     GROUP BY d.id, d.full_name, d.specialty`,
    [now, today, today, windowDays, today, today, windowDays, windowDays, dailyCap, doctorId],
  );
  return rows[0] || null;
}

async function doctorDailyCounts({ doctorId, today, windowDays, dailyCap }, db = pool) {
  const [rows] = await db.execute(
    `WITH RECURSIVE days (day, n) AS (
       SELECT CAST(? AS DATE), 1
       UNION ALL
       SELECT DATE_ADD(day, INTERVAL 1 DAY), n + 1 FROM days WHERE n < ?
     )
     SELECT days.day AS date,
            COUNT(a.id) AS booked_appointments,
            ROUND(COUNT(a.id) * 100 / ?, 1) AS utilization_percent
     FROM days
     LEFT JOIN appointments a
       ON a.doctor_id = ? AND a.status = 'booked'
      AND a.appt_datetime >= days.day AND a.appt_datetime < DATE_ADD(days.day, INTERVAL 1 DAY)
     GROUP BY days.day
     ORDER BY days.day`,
    [today, windowDays, dailyCap, doctorId],
  );
  return rows;
}

module.exports = { doctorsReport, busyDays, doctorSummary, doctorDailyCounts };
