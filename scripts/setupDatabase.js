const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DATABASE_DIR = path.join(__dirname, '..', 'database');

async function runScript(connection, fileName) {
  const sql = await fs.readFile(path.join(DATABASE_DIR, fileName), 'utf8');
  await connection.query(sql);
  console.log(`Ran ${fileName}`);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await runScript(connection, 'schema.sql');
    await runScript(connection, 'seed.sql');
    console.log('Database ready.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Database setup failed:', error.message);
  process.exit(1);
});
