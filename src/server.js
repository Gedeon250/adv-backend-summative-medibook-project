const app = require('./app');
const config = require('./config');
const pool = require('./db/pool');
const { ensureLogDirectory } = require('./utils/auditLogger');

async function start() {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error(`Cannot connect to MySQL (${config.db.host}:${config.db.port}): ${error.message}`);
    console.error('Check your .env file and that the database is set up (npm run db:setup).');
    process.exit(1);
  }

  await ensureLogDirectory().catch((error) => console.error(`Audit log folder problem: ${error.message}`));

  app.listen(config.port, () => {
    console.log(`MediBook API running on http://localhost:${config.port}`);
  });
}

start();
