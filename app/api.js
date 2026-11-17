// make.fun public API — read-only GET, any origin (CORS). Docs:
// https://make.fun/api/openapi.json and https://make.fun/llms.txt
// Answers are cached in memory for 60s and revalidated with ETag inside
// the same minute (a 304 costs nothing and returns the cached body), so
// switching between views rarely makes a new request at all.

const API = 'https://make.fun/api';
const TTL = 60_000;
const cache = new Map(); // path -> { at, etag, body }

async function get(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) { hit.at = Date.now(); return hit.body; }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(path, { at: Date.now(), etag: res.headers.get('ETag'), body });
  return body;
}

/** Live bounties, open first: { items: [...] }. activity=times keeps it small. */
export const getBounties = () => get('/competitions?status=open&activity=times&limit=100');

/** One bounty, by slug: title, summary, description, rewards, pot, dates. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { columns, entries: [{ rank, handle, title, display }] }. */
export const getLeaderboard = (slug, limit = 50) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard?limit=${limit}`);

/** A public profile: handle, display name, bio, record, solutions (entries). */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** Drop the cache (used by the refresh button on each view). */
export function clearCache() { cache.clear(); }
