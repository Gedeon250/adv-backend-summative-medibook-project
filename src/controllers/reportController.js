const reportModel = require('../models/reportModel');
const { MAX_APPOINTMENTS_PER_DAY, BUSY_DAY_THRESHOLD } = require('../config/businessRules');
const asyncHandler = require('../utils/asyncHandler');

exports.doctors = asyncHandler(async (req, res) => {
  const rows = await reportModel.doctorsReport();
  res.json(rows.map((row) => ({
    doctorId: row.doctor_id,
    doctorName: row.full_name,
    specialty: row.specialty,
    bookedAppointments: row.booked_appointments,
    cancelledAppointments: row.cancelled_appointments,
    totalAppointments: row.total_appointments,
    revenueCollected: row.revenue_collected,
  })));
});

exports.busyDays = asyncHandler(async (req, res) => {
  const rows = await reportModel.busyDays({ dailyCap: MAX_APPOINTMENTS_PER_DAY, threshold: BUSY_DAY_THRESHOLD });
  res.json({
    dailyCap: MAX_APPOINTMENTS_PER_DAY,
    thresholdPercent: BUSY_DAY_THRESHOLD * 100,
    busyDays: rows.map((row) => ({
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      date: row.appointment_date,
      bookedAppointments: row.booked_appointments,
      utilizationPercent: row.utilization_percent,
    })),
  });
});
