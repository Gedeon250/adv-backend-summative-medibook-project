const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

const logDirectory = path.resolve(config.logDir);
const logFile = path.join(logDirectory, 'audit.log');

let directoryReady = null;

function ensureLogDirectory() {
  if (!directoryReady) {
    directoryReady = fs.mkdir(logDirectory, { recursive: true }).catch((error) => {
      directoryReady = null;
      throw error;
    });
  }
  return directoryReady;
}

// Appends one JSON line. It never throws: a logging problem must not fail the request.
async function writeAuditLog(event, data = {}) {
  try {
    await ensureLogDirectory();
    const line = JSON.stringify({ timestamp: new Date().toISOString(), event, ...data });
    await fs.appendFile(logFile, `${line}\n`, 'utf8');
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
}

module.exports = { writeAuditLog, ensureLogDirectory, logFile };
