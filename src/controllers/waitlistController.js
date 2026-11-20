const waitlistService = require('../services/waitlistService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePositiveInteger } = require('../utils/validators');

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function requireId(value, field) {
  const id = parsePositiveInteger(value);
  if (id === null) throw new AppError(400, `${field} is required and must be a positive whole number`, 'VALIDATION_ERROR');
  return id;
}

exports.join = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const entry = await waitlistService.joinWaitlist({
    patientId: requireId(body.patientId, 'patientId'),
    doctorId: requireId(body.doctorId, 'doctorId'),
    appointmentDatetime: body.appointmentDatetime,
  });
  res.status(201).json({ message: 'Added to the waitlist', ...entry });
});

exports.list = asyncHandler(async (req, res) => {
  const doctorId = requireId(req.query.doctorId, 'doctorId');
  if (!DAY_PATTERN.test(req.query.date || '')) throw new AppError(400, 'date is required, e.g. 2026-12-01', 'VALIDATION_ERROR');
  res.json(await waitlistService.listWaitlist(doctorId, req.query.date));
});

exports.listFailed = asyncHandler(async (req, res) => {
  res.json(await waitlistService.listFailedPromotions());
});
