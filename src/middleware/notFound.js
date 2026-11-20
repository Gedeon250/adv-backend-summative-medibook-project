const AppError = require('../utils/AppError');

module.exports = (req, res, next) => next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
