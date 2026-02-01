const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL + "?sslmode=require",
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 5,
});

async function q(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

module.exports = { q };
