/* Security helpers */
export function isAllowedOrigin(req) {
  /* প্রথমে সব allow — পরে চাইলে origin lock করবেন */
  return true;
}

const RATE_STORE = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 60;

export function isRateLimited(req) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const entry = RATE_STORE.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) { RATE_STORE.set(ip, { start: now, count: 1 }); return false; }
  entry.count++;
  return entry.count > RATE_MAX;
}

export function isValidImage(req) {
  const ct = req.headers["content-type"] || "";
  if (!ct.startsWith("multipart/form-data")) return false;
  const len = parseInt(req.headers["content-length"] || "0", 10);
  if (len > 8 * 1024 * 1024) return false;
  return true;
}

export function isValidChatId(id) { return /^-?\d{6,15}$/.test(String(id || "")); }

export function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}
