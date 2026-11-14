import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pool, migrate } from './db.js';
import { corsOptions } from './cors.js';
import { sanitizeNickname, isValidUserId } from './nickname.js';
import { validateSubmission } from './anticheat.js';
import { isoWeekKeyKST } from './kst.js';
import { exportDump } from './exportDump.js';

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '8kb' }));

const submitLimiter = rateLimit({ windowMs: 60_000, max: 12, standardHeaders: true, legacyHeaders: false });
const readLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

app.get('/', (_req, res) => res.json({ ok: true, service: 'balloon-gym-api' }));
app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/score', submitLimiter, async (req, res) => {
  const { userId, nickname, score, durationSec, achievedPct } = req.body ?? {};
  if (!isValidUserId(userId)) return res.status(400).json({ error: 'bad_user_id' });

  const check = validateSubmission({ score, durationSec, achievedPct });
  if (!check.ok) return res.status(400).json({ error: check.reason, cap: check.cap });

  const cleanNickname = sanitizeNickname(nickname);
  const weekKey = isoWeekKeyKST();

  try {
    await pool.query(
      `INSERT INTO users (id, nickname) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET nickname = $2, updated_at = now()`,
      [userId, cleanNickname]
    );
    await pool.query(
      `INSERT INTO scores (user_id, score, achieved_pct, duration_sec, week_key)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, Math.round(score), achievedPct ?? null, Math.round(durationSec), weekKey]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('submit failed', err.message);
    res.status(503).json({ error: 'unavailable' });
  }
});

function periodFilter(period, weekKey) {
  if (period === 'weekly') return { clause: 'AND s.week_key = $1', params: [weekKey] };
  return { clause: '', params: [] };
}

app.get('/api/leaderboard', readLimiter, async (req, res) => {
  const period = req.query.period === 'weekly' ? 'weekly' : 'alltime';
  const metric = req.query.metric === 'achievement' ? 'achievement' : 'score';
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const weekKey = isoWeekKeyKST();
  const { clause, params } = periodFilter(period, weekKey);
  const orderCol = metric === 'achievement' ? 'best_achieved_pct' : 'best_score';

  try {
    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.nickname,
              MAX(s.score) AS best_score,
              MAX(s.achieved_pct) AS best_achieved_pct
       FROM scores s
       JOIN users u ON u.id = s.user_id
       WHERE 1=1 ${clause}
       GROUP BY u.id, u.nickname
       ORDER BY ${orderCol} DESC NULLS LAST
       LIMIT ${limit}`,
      params
    );
    res.json({
      period,
      metric,
      entries: rows.map((r, i) => ({
        rank: i + 1,
        userId: r.user_id,
        nickname: r.nickname,
        score: Number(r.best_score),
        achievedPct: r.best_achieved_pct === null ? null : Number(r.best_achieved_pct),
      })),
    });
  } catch (err) {
    console.error('leaderboard failed', err.message);
    res.status(503).json({ error: 'unavailable' });
  }
});

app.get('/api/rank', readLimiter, async (req, res) => {
  const userId = req.query.userId;
  if (!isValidUserId(userId)) return res.status(400).json({ error: 'bad_user_id' });
  const period = req.query.period === 'weekly' ? 'weekly' : 'alltime';
  const metric = req.query.metric === 'achievement' ? 'achievement' : 'score';
  const weekKey = isoWeekKeyKST();
  const { clause, params } = periodFilter(period, weekKey);
  const orderCol = metric === 'achievement' ? 'best_achieved_pct' : 'best_score';

  try {
    const { rows } = await pool.query(
      `WITH best AS (
         SELECT u.id AS user_id, u.nickname,
                MAX(s.score) AS best_score,
                MAX(s.achieved_pct) AS best_achieved_pct
         FROM scores s
         JOIN users u ON u.id = s.user_id
         WHERE 1=1 ${clause}
         GROUP BY u.id, u.nickname
       ), ranked AS (
         SELECT *, RANK() OVER (ORDER BY ${orderCol} DESC NULLS LAST) AS rank
         FROM best
       )
       SELECT * FROM ranked WHERE user_id = $${params.length + 1}`,
      [...params, userId]
    );
    if (rows.length === 0) return res.json({ found: false });
    const r = rows[0];
    res.json({
      found: true,
      rank: Number(r.rank),
      score: Number(r.best_score),
      achievedPct: r.best_achieved_pct === null ? null : Number(r.best_achieved_pct),
    });
  } catch (err) {
    console.error('rank failed', err.message);
    res.status(503).json({ error: 'unavailable' });
  }
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Not allowed by CORS') return res.status(403).json({ error: 'cors' });
  console.error(err);
  res.status(500).json({ error: 'internal' });
});

const PORT = Number(process.env.PORT) || 8080;

migrate()
  .then(exportDump)
  .then(() => {
    app.listen(PORT, () => console.log(`balloon-gym-api listening on ${PORT}`));
  })
  .catch((err) => {
    console.error('migration failed', err);
    process.exit(1);
  });
