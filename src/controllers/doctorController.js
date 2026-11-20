const doctorModel = require('../models/doctorModel');
const reportModel = require('../models/reportModel');
const { MAX_APPOINTMENTS_PER_DAY, STATS_WINDOW_DAYS } = require('../config/businessRules');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { validateDoctorInput, formatMysqlDatetime, formatMysqlDate } = require('../utils/validators');
const { toDoctor } = require('../utils/serializers');

function assertValid(body, options) {
  const errors = validateDoctorInput(body, options);
  if (errors.length) throw new AppError(400, errors.join('; '), 'VALIDATION_ERROR', { errors });
}

async function getExistingDoctor(id) {
  const doctor = await doctorModel.findById(id);
  if (!doctor) throw new AppError(404, `Doctor ${id} not found`, 'DOCTOR_NOT_FOUND');
  return doctor;
}

const clean = (body) => ({
  fullName: body.fullName?.trim(),
  specialty: body.specialty?.trim(),
  consultationFee: body.consultationFee,
  room: body.room?.trim(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json((await doctorModel.findAll()).map(toDoctor));
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json(toDoctor(await getExistingDoctor(req.params.id)));
});

exports.create = asyncHandler(async (req, res) => {
  assertValid(req.body);
  const id = await doctorModel.create(clean(req.body));
  res.status(201).json(toDoctor(await doctorModel.findById(id)));
});

exports.replace = asyncHandler(async (req, res) => {
  await getExistingDoctor(req.params.id);
  assertValid(req.body);
  await doctorModel.update(req.params.id, clean(req.body));
  res.json(toDoctor(await doctorModel.findById(req.params.id)));
});

exports.modify = asyncHandler(async (req, res) => {
  const existing = await getExistingDoctor(req.params.id);
  assertValid(req.body, { partial: true });
  const changes = clean(req.body);
  await doctorModel.update(req.params.id, {
    fullName: changes.fullName ?? existing.full_name,
    specialty: changes.specialty ?? existing.specialty,
    consultationFee: changes.consultationFee ?? existing.consultation_fee,
    room: changes.room ?? existing.room,
  });
  res.json(toDoctor(await doctorModel.findById(req.params.id)));
});

exports.remove = asyncHandler(async (req, res) => {
  await getExistingDoctor(req.params.id);
  await doctorModel.remove(req.params.id);
  res.status(204).send();
});

exports.statistics = asyncHandler(async (req, res) => {
  const now = new Date();
  const query = {
    doctorId: req.params.id,
    now: formatMysqlDatetime(now),
    today: formatMysqlDate(now),
    windowDays: STATS_WINDOW_DAYS,
    dailyCap: MAX_APPOINTMENTS_PER_DAY,
  };
  const summary = await reportModel.doctorSummary(query);
  if (!summary) throw new AppError(404, `Doctor ${req.params.id} not found`, 'DOCTOR_NOT_FOUND');
  const perDay = await reportModel.doctorDailyCounts(query);

  res.json({
    doctorId: summary.doctor_id,
    doctorName: summary.full_name,
    specialty: summary.specialty,
    revenueCollected: summary.revenue_collected,
    upcomingAppointments: summary.upcoming_appointments,
    nextDays: {
      days: STATS_WINDOW_DAYS,
      dailyCap: MAX_APPOINTMENTS_PER_DAY,
      bookedAppointments: summary.booked_in_window,
      utilizationPercent: summary.utilization_percent,
      perDay: perDay.map((row) => ({
        date: row.date,
        bookedAppointments: row.booked_appointments,
        utilizationPercent: row.utilization_percent,
      })),
    },
  });
});
