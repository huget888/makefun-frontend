// Router for the four surfaces, all hash routes so every view has its own URL:
//   #/                        bounty board
//   #/bounty/<slug>           one bounty's page
//   #/bounty/<slug>/leaderboard  that bounty's leaderboard
//   #/account/<handle>        a public profile
// window.__shotReady is false while a view loads and true once its data is
// on screen, so a screenshot script knows when to capture.

import { clearCache, getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
let boardQuery = '';
let boardSort = 'pot';

function show(html) { app.innerHTML = html; window.scrollTo(0, 0); }

function showError(err) {
  const code = err && err.status === 404 ? 'not found' : 'could not load';
  app.innerHTML = `<p class="error">That page ${code} — the make.fun API answered ${escStatus(err)}.
    <a href="#/">Back to the board</a>.</p>`;
  function escStatus(e) { return e && e.status ? `HTTP ${e.status}` : 'an error'; }
}

function wireBoard() {
  const q = document.getElementById('q');
  const sort = document.getElementById('sort');
  const refresh = document.getElementById('refresh');
  if (q) q.addEventListener('input', () => {
    boardQuery = q.value;
    const caret = q.selectionStart;
    renderBoard(false).then(() => {
      const next = document.getElementById('q');
      if (next) { next.focus(); next.setSelectionRange(caret, caret); }
    });
  });
  if (sort) sort.addEventListener('change', () => { boardSort = sort.value; renderBoard(false); });
  if (refresh) refresh.addEventListener('click', () => { clearCache(); renderBoard(true); });
}

async function renderBoard(fetchFirst) {
  window.__shotReady = false;
  try {
    const data = await getBounties();
    document.title = 'make.fun bounties';
    show(board(data, boardQuery, boardSort));
    wireBoard();
    window.__shotReady = true;
  } catch (err) { showError(err); window.__shotReady = true; }
}

async function renderBounty(slug, wantLeaderboard) {
  window.__shotReady = false;
  try {
    const b = await getBounty(slug);
    if (wantLeaderboard) {
      const lb = await getLeaderboard(slug);
      document.title = `Leaderboard · ${b.title} | make.fun bounties`;
      show(leaderboard(b, lb));
    } else {
      document.title = `${b.title} | make.fun bounties`;
      show(bounty(b));
    }
    window.__shotReady = true;
  } catch (err) { showError(err); window.__shotReady = true; }
}

async function renderProfile(handle) {
  window.__shotReady = false;
  try {
    const p = await getProfile(handle);
    document.title = `${p.display_name || p.handle} (@${p.handle}) | make.fun bounties`;
    show(profile(p));
    window.__shotReady = true;
  } catch (err) { showError(err); window.__shotReady = true; }
}

function route() {
  const hash = location.hash || '#/';
  const bountyMatch = hash.match(/^#\/bounty\/([^/#?]+)(?:\/leaderboard)?\/?$/);
  const accountMatch = hash.match(/^#\/account\/([^/#?]+)\/?$/);
  if (bountyMatch) {
    renderBounty(decodeURIComponent(bountyMatch[1]), hash.includes('/leaderboard'));
  } else if (accountMatch) {
    renderProfile(decodeURIComponent(accountMatch[1]));
  } else {
    renderBoard(true);
  }
}

// Header jump box: a slug goes to its bounty, @handle (or a bare handle
// that is not a bounty) goes to its profile.
const jump = document.getElementById('jump');
if (jump) jump.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.getElementById('jump-q');
  const value = (input.value || '').trim().replace(/^@/, '');
  if (!value) return;
  try {
    await getBounty(value);
    location.hash = `#/bounty/${encodeURIComponent(value)}`;
  } catch {
    location.hash = `#/account/${encodeURIComponent(value)}`;
  }
});

window.addEventListener('hashchange', route);
route();
