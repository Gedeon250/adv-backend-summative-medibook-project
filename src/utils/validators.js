const { WORKING_HOURS, SLOT_MINUTES } = require('../config/businessRules');

const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;

function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

const DAY_START = toMinutes(WORKING_HOURS.START);
const DAY_END = toMinutes(WORKING_HOURS.END);

const pad = (number) => String(number).padStart(2, '0');

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

// Clinic time is "wall clock" time: input has no timezone and is read as local time.
function parseAppointmentDatetime(input) {
  if (typeof input !== 'string') {
    return { valid: false, message: 'appointmentDatetime is required, e.g. 2026-12-01T09:30:00' };
  }
  const match = DATETIME_PATTERN.exec(input.trim());
  if (!match) {
    return { valid: false, message: 'appointmentDatetime must look like 2026-12-01T09:30:00 (no timezone)' };
  }
  const [year, month, day, hour, minute, second = '0'] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute, second);
  const sameParts = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    && date.getHours() === hour && date.getMinutes() === minute;
  if (!sameParts) {
    return { valid: false, message: 'appointmentDatetime is not a real calendar date and time' };
  }
  return { valid: true, date };
}

// Returns { valid: true } or { valid: false, code, message } for the booking time rules.
function validateSlot(date, now = new Date()) {
  if (date.getTime() <= now.getTime()) {
    return { valid: false, code: 'SLOT_IN_PAST', message: 'Appointments can only be booked in the future' };
  }
  const minutesOfDay = date.getHours() * 60 + date.getMinutes();
  const lastStart = DAY_END - SLOT_MINUTES;
  if (minutesOfDay < DAY_START || minutesOfDay > lastStart) {
    return {
      valid: false,
      code: 'OUTSIDE_WORKING_HOURS',
      message: `Appointments run ${WORKING_HOURS.START}-${WORKING_HOURS.END}; the last slot starts at ${pad(Math.floor(lastStart / 60))}:${pad(lastStart % 60)}`,
    };
  }
  if (date.getMinutes() % SLOT_MINUTES !== 0 || date.getSeconds() !== 0) {
    return { valid: false, code: 'NOT_ON_SLOT_BOUNDARY', message: `Appointments must start on a ${SLOT_MINUTES}-minute boundary` };
  }
  return { valid: true };
}

function formatMysqlDatetime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatMysqlDate(date) {
  return formatMysqlDatetime(date).slice(0, 10);
}

function parseMysqlDatetime(text) {
  const parsed = parseAppointmentDatetime(text);
  return parsed.valid ? parsed.date : null;
}

function collectErrors(data, partial, rules) {
  const errors = [];
  rules.forEach(({ field, ok, message }) => {
    if (data[field] === undefined && partial) return;
    if (!ok(data[field])) errors.push(message);
  });
  return errors;
}

function validatePatientInput(body, { partial = false } = {}) {
  return collectErrors(body || {}, partial, [
    { field: 'fullName', ok: (v) => isNonEmptyString(v, 100), message: 'fullName is required (max 100 characters)' },
    { field: 'email', ok: (v) => typeof v === 'string' && v.length <= 150 && EMAIL_PATTERN.test(v.trim()), message: 'email must be a valid email address' },
    { field: 'phone', ok: (v) => typeof v === 'string' && PHONE_PATTERN.test(v.trim()), message: 'phone must be 7-20 characters (digits, +, -, spaces, brackets)' },
  ]);
}

function validateDoctorInput(body, { partial = false } = {}) {
  return collectErrors(body || {}, partial, [
    { field: 'fullName', ok: (v) => isNonEmptyString(v, 100), message: 'fullName is required (max 100 characters)' },
    { field: 'specialty', ok: (v) => isNonEmptyString(v, 80), message: 'specialty is required (max 80 characters)' },
    { field: 'room', ok: (v) => isNonEmptyString(v, 10), message: 'room is required (max 10 characters)' },
    { field: 'consultationFee', ok: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 100000000, message: 'consultationFee must be a number of 0 or more' },
  ]);
}

function parsePositiveInteger(value) {
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : null;
}

module.exports = {
  parseAppointmentDatetime,
  validateSlot,
  validatePatientInput,
  validateDoctorInput,
  parsePositiveInteger,
  formatMysqlDatetime,
  formatMysqlDate,
  parseMysqlDatetime,
};
