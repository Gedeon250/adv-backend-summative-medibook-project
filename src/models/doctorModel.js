const pool = require('../db/pool');

const COLUMNS = 'id, full_name, specialty, consultation_fee, room, created_at';

async function findAll(db = pool) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM doctors ORDER BY id`);
  return rows;
}

async function findById(id, db = pool) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM doctors WHERE id = ?`, [id]);
  return rows[0] || null;
}

// Locks the doctor row until the transaction ends. Every booking for the same
// doctor queues up here, which is what makes the daily cap and the slot check safe.
async function findByIdForUpdate(id, db) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM doctors WHERE id = ? FOR UPDATE`, [id]);
  return rows[0] || null;
}

async function create({ fullName, specialty, consultationFee, room }, db = pool) {
  const [result] = await db.execute(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [fullName, specialty, consultationFee, room],
  );
  return result.insertId;
}

async function update(id, { fullName, specialty, consultationFee, room }, db = pool) {
  const [result] = await db.execute(
    'UPDATE doctors SET full_name = ?, specialty = ?, consultation_fee = ?, room = ? WHERE id = ?',
    [fullName, specialty, consultationFee, room, id],
  );
  return result.affectedRows > 0;
}

async function remove(id, db = pool) {
  const [result] = await db.execute('DELETE FROM doctors WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByIdForUpdate, create, update, remove };
