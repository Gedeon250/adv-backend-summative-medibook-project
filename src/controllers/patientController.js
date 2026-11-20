const patientModel = require('../models/patientModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { validatePatientInput } = require('../utils/validators');
const { toPatient } = require('../utils/serializers');

function assertValid(body, options) {
  const errors = validatePatientInput(body, options);
  if (errors.length) throw new AppError(400, errors.join('; '), 'VALIDATION_ERROR', { errors });
}

async function getExistingPatient(id) {
  const patient = await patientModel.findById(id);
  if (!patient) throw new AppError(404, `Patient ${id} not found`, 'PATIENT_NOT_FOUND');
  return patient;
}

async function assertEmailFree(email, ownId) {
  const owner = await patientModel.findByEmail(email);
  if (owner && owner.id !== ownId) throw new AppError(409, 'A patient with this email already exists', 'EMAIL_TAKEN');
}

const clean = (body) => ({
  fullName: body.fullName?.trim(),
  email: body.email?.trim().toLowerCase(),
  phone: body.phone?.trim(),
});

exports.list = asyncHandler(async (req, res) => {
  const patients = await patientModel.findAll();
  res.json(patients.map(toPatient));
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json(toPatient(await getExistingPatient(req.params.id)));
});

exports.create = asyncHandler(async (req, res) => {
  assertValid(req.body);
  const data = clean(req.body);
  await assertEmailFree(data.email);
  const id = await patientModel.create(data);
  res.status(201).json(toPatient(await patientModel.findById(id)));
});

exports.replace = asyncHandler(async (req, res) => {
  await getExistingPatient(req.params.id);
  assertValid(req.body);
  const data = clean(req.body);
  await assertEmailFree(data.email, req.params.id);
  await patientModel.update(req.params.id, data);
  res.json(toPatient(await patientModel.findById(req.params.id)));
});

exports.modify = asyncHandler(async (req, res) => {
  const existing = await getExistingPatient(req.params.id);
  assertValid(req.body, { partial: true });
  const changes = clean(req.body);
  const merged = {
    fullName: changes.fullName ?? existing.full_name,
    email: changes.email ?? existing.email,
    phone: changes.phone ?? existing.phone,
  };
  await assertEmailFree(merged.email, req.params.id);
  await patientModel.update(req.params.id, merged);
  res.json(toPatient(await patientModel.findById(req.params.id)));
});

exports.remove = asyncHandler(async (req, res) => {
  await getExistingPatient(req.params.id);
  await patientModel.remove(req.params.id);
  res.status(204).send();
});
