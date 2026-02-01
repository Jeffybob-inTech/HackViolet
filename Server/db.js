const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function q(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

module.exports = { q };
