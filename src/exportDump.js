// One-off migration helper: when EXPORT_DUMP=1, log a JSON snapshot of all
// rows (text-cast, lossless) plus counts and md5 checksums. Remove after use.
import { pool } from './db.js';

export async function exportDump() {
  if (process.env.EXPORT_DUMP !== '1') return;
  const c = await pool.connect();
  try {
    await c.query("SET TimeZone TO 'UTC'");
    const users = (await c.query(
      'SELECT id, nickname, created_at::text AS created_at, updated_at::text AS updated_at FROM users ORDER BY id'
    )).rows;
    const scores = (await c.query(
      `SELECT id::text AS id, user_id, score, achieved_pct::text AS achieved_pct, duration_sec, week_key,
              created_at::text AS created_at FROM scores ORDER BY id`
    )).rows;
    const sum = async (t) => (await c.query(
      `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS m FROM ${t} x`
    )).rows[0].m;
    const seq = (await c.query("SELECT last_value::text AS v FROM scores_id_seq")).rows[0].v;
    console.log('BGDUMP ' + JSON.stringify({
      counts: { users: users.length, scores: scores.length },
      md5: { users: await sum('users'), scores: await sum('scores') },
      seq, users, scores,
    }));
  } catch (err) {
    console.error('BGDUMP failed', err.message);
  } finally {
    c.release();
  }
}
