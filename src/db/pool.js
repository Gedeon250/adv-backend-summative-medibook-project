const mysql = require('mysql2/promise');
const config = require('../config');

// dateStrings keeps DATETIME values as plain strings (no timezone shifting);
// decimalNumbers returns DECIMAL columns as JS numbers.
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
});

module.exports = pool;
