const pool = require('./pool');

// Runs `work(connection)` inside one transaction: commit if it resolves,
// roll back (and rethrow) if it throws. No SQL text lives here.
async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { withTransaction };
