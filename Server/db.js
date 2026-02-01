const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // REQUIRED for Render / Supabase / Neon / Railway
  ssl: {
    rejectUnauthorized: false,
  },

  // Fail fast instead of hanging forever
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 5,
});

async function q(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

module.exports = { q };
