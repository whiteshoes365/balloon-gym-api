const MAX_LEN = 16;
// Control chars (0x00-0x1F, 0x7F) plus HTML/markup-special characters that would be
// unsafe if ever rendered as-is on an admin page or similar.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\x00-\x1f\x7f<>&"'`]/g;

export function sanitizeNickname(raw) {
  if (typeof raw !== 'string') return '익명';
  const stripped = raw.replace(UNSAFE_CHARS, '').trim();
  if (!stripped) return '익명';
  return Array.from(stripped).slice(0, MAX_LEN).join('');
}

export function isValidUserId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}
