/**
 * Temporary store for message CSV data.
 * PhantomBuster fetches our AI-generated message via GET /api/phantom/message-csv/:token
 * instead of using the dashboard "First Name" config.
 */
const store = new Map();
const TTL_MS = 30 * 60 * 1000; // Increased to 30 minutes to give PhantomBuster more time

export function createToken(linkedinUrl, message) {
  const token = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  store.set(token, {
    linkedinUrl: String(linkedinUrl || ""),
    message: String(message || ""),
    expiresAt: Date.now() + TTL_MS,
  });
  return token;
}

export function get(token) {
  const data = store.get(token);
  if (!data || data.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  return data;
}

export function remove(token) {
  store.delete(token);
}

/**
 * Build options for sendMessage when BACKEND_PUBLIC_URL is set.
 * Callers without req (scheduler, outreach) can use this to pass AI messages.
 */
export function buildSpreadsheetOptions(linkedinUrl, message) {
  const baseUrl = process.env.BACKEND_PUBLIC_URL?.trim();
  if (!baseUrl) return {};
  const token = createToken(linkedinUrl, message);
  return { spreadsheetUrl: `${baseUrl.replace(/\/$/, "")}/api/phantom/message-csv/${token}` };
}
