// The four surfaces, each a function from live API data to HTML.
// Board: live bounties with pot, fee, time left, entries — searchable, sortable.
// Bounty page: summary, description, rules, rewards table with live pot, dates.
// Leaderboard: that bounty's ranked entries, columns straight from the API.
// Profile: an account's public info and its entries.

import { date, esc, firstPara, money, pot, takesEntries, timeLeft } from './format.js';

const bountyUrl = (slug) => `#/bounty/${encodeURIComponent(slug)}`;
const profileUrl = (handle) => `#/account/${encodeURIComponent(handle)}`;

function feeLine(b) {
  return b.entryFeeUsd ? `<span class="fee">${money(b.entryFeeUsd)} entry fee</span>` : '<span>Free to enter</span>';
}

function statusTag(b) {
  return takesEntries(b)
    ? `<span class="tag">Open · ${esc(timeLeft(b.deadline))}</span>`
    : `<span class="tag closed">Closed to entries</span>`;
}

export function board(data, query, sort) {
  const items = [...(data.items || [])];
  const q = (query || '').trim().toLowerCase();
  const filtered = q
    ? items.filter((b) => `${b.title} ${b.slug} ${b.category || ''} ${(b.skills || []).join(' ')}`.toLowerCase().includes(q))
    : items;
  const sorts = {
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
  };
  filtered.sort(sorts[sort] || sorts.pot);
  const rows = filtered.map((b) => `
      <li class="card">
        <h2><a href="${bountyUrl(b.slug)}">${esc(b.title)}</a></h2>
        <p class="sum">${esc(firstPara(b.summary || b.description))}</p>
        <p class="meta">
          <span>Reward <b class="pot">${pot(b)}</b></span>
          ${feeLine(b)}
          <span>Deadline ${esc(date(b.deadline))} · <b>${esc(timeLeft(b.deadline))}</b></span>
          <span><b>${b.submissionCount ?? 0}</b> ${(b.submissionCount ?? 0) === 1 ? 'entry' : 'entries'}</span>
          ${statusTag(b)}
        </p>
        <p class="meta"><a href="${bountyUrl(b.slug)}">Details</a> · <a href="${bountyUrl(b.slug)}/leaderboard">Leaderboard</a></p>
      </li>`).join('');
  return `
    <h1>Open bounties</h1>
    <p class="mut">${filtered.length} of ${items.length} live bounties · pots grow as entry fees are paid in · data refreshes every minute.</p>
    <div class="toolbar">
      <label class="sr" for="q">Search bounties</label>
      <input id="q" type="search" placeholder="Search title, category or skill…" value="${esc(query || '')}">
      <label class="sr" for="sort">Sort by</label>
      <select id="sort">
        <option value="pot"${sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
        <option value="deadline"${sort === 'deadline' ? ' selected' : ''}>Closing soonest</option>
        <option value="entries"${sort === 'entries' ? ' selected' : ''}>Most entries</option>
      </select>
      <button class="btn" id="refresh" type="button">Refresh</button>
    </div>
    ${rows ? `<ul class="board">${rows}</ul>` : '<p>No bounties match that search.</p>'}`;
}

function rewardsTable(b) {
  const now = b.rewardsNow || [];
  if (now.length) {
    const rows = now.map((r) => `
        <tr><td>${r.place}${r.place === 1 ? 'st' : r.place === 2 ? 'nd' : r.place === 3 ? 'rd' : 'th'}</td>
        <td class="num">${money(r.baseUsd)}</td><td class="num">${money(r.feeShareUsd)}</td>
        <td class="num"><b>${money(r.amountUsd)}</b></td></tr>`).join('');
    return `<table><thead><tr><th>Place</th><th class="num">Prize</th><th class="num">Fee share</th><th class="num">Total now</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  const rewards = b.rewards || {};
  const rows = Object.entries(rewards).map(([place, amount]) => `
      <tr><td>${place}</td><td class="num" colspan="3"><b>${money(amount)}</b></td></tr>`).join('');
  return rows ? `<table><thead><tr><th>Place</th><th class="num">Prize</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="mut">No rewards table published yet.</p>';
}

export function bounty(b) {
  const open = takesEntries(b);
  return `
    <p class="crumb"><a href="#/">← All bounties</a> · <a href="${bountyUrl(b.slug)}/leaderboard">Leaderboard</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="mut">${esc(b.category || '')}${b.sponsor?.name ? ` · by ${esc(b.sponsor.name)}` : ''} ${statusTag(b)}</p>
    <p>${esc(b.summary || '')}</p>
    <dl class="facts">
      <div><dt>Live pot</dt><dd class="pot">${pot(b)}</dd></div>
      <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd></div>
      <div><dt>Deadline</dt><dd>${esc(date(b.deadline))}</dd></div>
      <div><dt>Time left</dt><dd>${esc(timeLeft(b.deadline))}</dd></div>
      <div><dt>Entries</dt><dd>${b.submissionCount ?? 0}</dd></div>
      <div><dt>Status</dt><dd>${esc(b.status || '')}${open ? '' : ' (closed)'}</dd></div>
    </dl>
    <h2>Rewards — live pot ${pot(b)}</h2>
    ${rewardsTable(b)}
    <h2>Description &amp; rules</h2>
    <div class="desc">${esc(b.description || '')}</div>
    <h2>Dates</h2>
    <p class="mut">Published ${esc(date(b.publishedAt))} · deadline ${esc(date(b.deadline))} · ${open ? 'still taking entries' : 'no longer taking entries'}.</p>
    <p><a class="btn" href="${bountyUrl(b.slug)}/leaderboard">See the leaderboard</a></p>`;
}

export function leaderboard(b, lb) {
  const cols = (lb.columns || []).filter((c) => !c.hidden);
  const entries = lb.entries || [];
  const head = cols.map((c) => `<th class="num">${esc(c.title)}</th>`).join('');
  const rows = entries.map((e) => {
    const cells = cols.map((c) => `<td class="num">${esc(e.display?.[c.key] ?? e.values?.[c.key] ?? '—')}</td>`).join('');
    return `<tr><td><b>#${e.rank}</b></td><td><a href="${profileUrl(e.handle)}">${esc(e.handle)}</a></td><td>${esc(e.title || '')}</td>${cells}</tr>`;
  }).join('');
  return `
    <p class="crumb"><a href="#/">← All bounties</a> · <a href="${bountyUrl(b.slug)}">${esc(b.title)}</a></p>
    <h1>Leaderboard — ${esc(b.title)}</h1>
    <p class="mut">${esc(lb.title || 'Results')} · ranked by ${esc(lb.rank_key || 'score')}${lb.tie_break ? ` · tie-break: ${esc(lb.tie_break.title)}` : ''} · ${entries.length} entries shown · live pot ${pot(b)}</p>
    ${rows ? `<table><thead><tr><th>Rank</th><th>Entrant</th><th>Entry</th>${head}</tr></thead><tbody>${rows}</tbody></table>`
      : '<p>No ranked entries yet — be the first to enter.</p>'}`;
}

export function profile(p) {
  const rec = p.record || {};
  const sols = p.solutions || [];
  const avatar = p.avatar || p.image;
  const pic = avatar
    ? `<img class="avatar" crossorigin="anonymous" src="${esc(avatar)}" alt="">`
    : `<span class="avatar avatar-fallback" aria-hidden="true">${esc((p.display_name || p.handle || '?')[0].toUpperCase())}</span>`;
  const rows = sols.map((s) => `
      <li class="card">
        <h2><a href="${bountyUrl(s.competition.slug)}">${esc(s.title)}</a></h2>
        <p class="sum">${esc(s.competition.title)} · entered ${esc(date(s.entered_at))}</p>
        <p class="meta"><span>Reward <b class="pot">${money(s.competition.reward_usd)}</b></span>
        <span>${s.placement ? `Placed #${s.placement}` : 'Not placed yet'}</span>
        ${s.prize_usd ? `<span>Won <b>${money(s.prize_usd)}</b></span>` : ''}</p>
      </li>`).join('');
  return `
    <div class="profile-head">${pic}<div>
      <h1>${esc(p.display_name || p.handle)}</h1>
      <p class="mut">@${esc(p.handle)} · joined ${esc(date(p.joined_at))}${p.github_login ? ` · GitHub ${esc(p.github_login)}` : ''}</p>
    </div></div>
    ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
    <dl class="facts">
      <div><dt>Bounties entered</dt><dd>${rec.competitions_entered ?? sols.length}</dd></div>
      <div><dt>Placed</dt><dd>${rec.competitions_placed ?? 0}</dd></div>
      <div><dt>Won</dt><dd>${rec.competitions_won ?? 0}</dd></div>
      <div><dt>Best placement</dt><dd>${rec.best_placement ? `#${rec.best_placement}` : '—'}</dd></div>
      <div><dt>Prize money</dt><dd>${money(rec.prize_usd ?? 0)}</dd></div>
    </dl>
    <h2>Entries (${sols.length})</h2>
    ${rows ? `<ul class="board">${rows}</ul>` : '<p>No entries yet.</p>'}`;
}
