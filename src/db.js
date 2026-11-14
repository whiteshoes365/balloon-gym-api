import pg from 'pg';

const { Pool } = pg;

const url = process.env.DATABASE_URL ?? '';
const needsSsl = /render\.com|supabase\.(co|com)/.test(url);
// Optional schema (e.g. DB_SCHEMA=balloon_gym on Supabase). Use the Supabase
// *session* pooler (port 5432) so the per-connection search_path sticks.
const schema = process.env.DB_SCHEMA;
if (schema && !/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('invalid DB_SCHEMA');

export const pool = new Pool({
  connectionString: url,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

if (schema) {
  pool.on('connect', (client) => {
    client.query(`SET search_path TO ${schema}`).catch((err) => console.error('search_path failed', err.message));
  });
}

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
