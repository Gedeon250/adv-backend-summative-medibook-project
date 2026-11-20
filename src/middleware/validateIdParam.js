const AppError = require('../utils/AppError');
const { parsePositiveInteger } = require('../utils/validators');

// Used with router.param('id', ...): rejects ids that are not positive integers.
module.exports = (req, res, next, value) => {
  const id = parsePositiveInteger(value);
  if (id === null) return next(new AppError(400, 'id must be a positive whole number', 'INVALID_ID'));
  req.params.id = id;
  return next();
};
