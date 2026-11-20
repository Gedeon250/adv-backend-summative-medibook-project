const appointmentModel = require('../models/appointmentModel');
const appointmentService = require('../services/appointmentService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePositiveInteger } = require('../utils/validators');
const { toAppointment } = require('../utils/serializers');

const STATUSES = ['booked', 'cancelled'];

function requireId(value, field) {
  const id = parsePositiveInteger(value);
  if (id === null) throw new AppError(400, `${field} is required and must be a positive whole number`, 'VALIDATION_ERROR');
  return id;
}

exports.book = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const patientId = requireId(body.patientId, 'patientId');
  const doctorId = requireId(body.doctorId, 'doctorId');
  const appointment = await appointmentService.bookAppointment({
    patientId,
    doctorId,
    appointmentDatetime: body.appointmentDatetime,
  });
  res.status(201).json(toAppointment(appointment));
});

exports.cancel = asyncHandler(async (req, res) => {
  const { appointment, refund } = await appointmentService.cancelAppointment(req.params.id);
  res.json({ message: 'Appointment cancelled', refund, appointment: toAppointment(appointment) });
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json(toAppointment(await appointmentService.getAppointment(req.params.id)));
});

exports.list = asyncHandler(async (req, res) => {
  const { doctorId, patientId, status } = req.query;
  const filters = {};
  if (doctorId !== undefined) filters.doctorId = requireId(doctorId, 'doctorId');
  if (patientId !== undefined) filters.patientId = requireId(patientId, 'patientId');
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw new AppError(400, `status must be one of: ${STATUSES.join(', ')}`, 'VALIDATION_ERROR');
    filters.status = status;
  }
  res.json((await appointmentModel.findAll(filters)).map(toAppointment));
});
