const AppError = require('../utils/AppError');

// Translates low-level errors into clean API errors.
function normalizeError(error) {
  if (error instanceof AppError) return error;
  if (error.type === 'entity.parse.failed') {
    return new AppError(400, 'Request body is not valid JSON', 'INVALID_JSON');
  }
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return new AppError(409, 'A record with the same unique value already exists', 'DUPLICATE_ENTRY');
    case 'ER_ROW_IS_REFERENCED_2':
      return new AppError(409, 'Cannot delete this record because appointments still reference it', 'HAS_APPOINTMENTS');
    case 'ER_NO_REFERENCED_ROW_2':
      return new AppError(404, 'A referenced patient or doctor does not exist', 'REFERENCE_NOT_FOUND');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new AppError(422, 'The data breaks a database rule', 'CONSTRAINT_VIOLATED');
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
      return new AppError(503, 'A required service is unavailable', 'SERVICE_UNAVAILABLE');
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
module.exports = (error, req, res, next) => {
  const known = normalizeError(error);
  if (!known) {
    console.error(error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server' } });
  }
  return res.status(known.statusCode).json({
    error: { code: known.code, message: known.message, ...(known.details ? { details: known.details } : {}) },
  });
};
