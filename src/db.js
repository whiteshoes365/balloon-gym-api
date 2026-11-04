import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      achieved_pct NUMERIC,
      duration_sec INTEGER NOT NULL,
      week_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS scores_user_id_idx ON scores (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS scores_week_key_idx ON scores (week_key);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS scores_score_idx ON scores (score DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS scores_achieved_pct_idx ON scores (achieved_pct DESC);`);
}
