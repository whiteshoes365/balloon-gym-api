// Mirrors the gameplay constants in balloon-gym's src/workoutConfig.ts so we can
// bound the max plausible score for a claimed play duration without trusting the client.
const BALLOON_BASE_SCORE = 10;
const MAX_COMBO_MULT = 3;
const FASTEST_SPAWN_SEC = 0.55; // SEGMENT_BALLOON.run.spawnMin
const SEGMENT_COMPLETE_BONUS = 50;
const MIN_SEGMENT_DURATION_SEC = 30; // MIN_DURATION_SEC in treadmill/plan.ts

const MAX_CATCH_RATE_PER_SEC = 1 / FASTEST_SPAWN_SEC;
const MAX_SCORE_PER_SEC = MAX_CATCH_RATE_PER_SEC * BALLOON_BASE_SCORE * MAX_COMBO_MULT;

// Generous safety margin: real play can never sustain the theoretical max (travel
// time, segment transitions, imperfect timing), but we don't want false rejects.
const SAFETY_MARGIN = 1.4;

export const MAX_DURATION_SEC = 6 * 60 * 60; // 6h hard ceiling, anything longer is bogus
export const MIN_DURATION_SEC = 1;

export function maxPlausibleScore(durationSec) {
  const maxSegments = Math.floor(durationSec / MIN_SEGMENT_DURATION_SEC);
  const fromCatches = durationSec * MAX_SCORE_PER_SEC;
  const fromSegmentBonus = maxSegments * SEGMENT_COMPLETE_BONUS;
  return Math.ceil((fromCatches + fromSegmentBonus) * SAFETY_MARGIN);
}

export function validateSubmission({ score, durationSec, achievedPct }) {
  if (!Number.isFinite(score) || score < 0 || score > 10_000_000) {
    return { ok: false, reason: 'bad_score' };
  }
  if (!Number.isFinite(durationSec) || durationSec < MIN_DURATION_SEC || durationSec > MAX_DURATION_SEC) {
    return { ok: false, reason: 'bad_duration' };
  }
  if (achievedPct !== undefined && achievedPct !== null) {
    if (!Number.isFinite(achievedPct) || achievedPct < 0 || achievedPct > 100) {
      return { ok: false, reason: 'bad_achieved_pct' };
    }
  }
  const cap = maxPlausibleScore(durationSec);
  if (score > cap) {
    return { ok: false, reason: 'implausible_score', cap };
  }
  return { ok: true };
}
