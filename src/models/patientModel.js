const pool = require('../db/pool');

const COLUMNS = 'id, full_name, email, phone, created_at';

async function findAll(db = pool) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM patients ORDER BY id`);
  return rows;
}

async function findById(id, db = pool) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM patients WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function findByEmail(email, db = pool) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM patients WHERE email = ?`, [email]);
  return rows[0] || null;
}

async function create({ fullName, email, phone }, db = pool) {
  const [result] = await db.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [fullName, email, phone],
  );
  return result.insertId;
}

async function update(id, { fullName, email, phone }, db = pool) {
  const [result] = await db.execute(
    'UPDATE patients SET full_name = ?, email = ?, phone = ? WHERE id = ?',
    [fullName, email, phone, id],
  );
  return result.affectedRows > 0;
}

async function remove(id, db = pool) {
  const [result] = await db.execute('DELETE FROM patients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByEmail, create, update, remove };
