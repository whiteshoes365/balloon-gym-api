const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKst(date) {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

// ISO week key (Monday-start, year-of-Thursday rule), computed on the KST wall clock.
export function isoWeekKeyKST(date = new Date()) {
  const k = toKst(date);
  const d = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
