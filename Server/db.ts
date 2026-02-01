import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

export async function q<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows;
}
