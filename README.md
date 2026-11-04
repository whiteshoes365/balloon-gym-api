# balloon-gym-api

Leaderboard backend for the "풍선쳐라 운동해라" Toss mini-app.

## Endpoints

- `POST /api/score` — submit `{ userId, nickname, score, durationSec, achievedPct }`. Server-side anti-cheat
  rejects scores implausible for the claimed duration (see `src/anticheat.js`), rate-limited to 12/min/IP.
- `GET /api/leaderboard?period=weekly|alltime&metric=score|achievement&limit=50`
- `GET /api/rank?userId=...&period=...&metric=...`
- `GET /health`

## Env vars

- `DATABASE_URL` — Postgres connection string.
- `PORT` — set by Render automatically.

## Local dev

```
npm install
DATABASE_URL=postgres://... npm run dev
```
