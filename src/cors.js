const ALLOWED_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)*apps\.tossmini\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*private-apps\.tossmini\.com$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

export function isAllowedOrigin(origin) {
  if (!origin) return true; // non-browser clients (curl, health checks)
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
};
