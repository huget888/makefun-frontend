// Small helpers for showing API values. All user/API text goes through esc()
// before it reaches innerHTML, so no API string can inject markup.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('769.50', 500 or 0.5) as '$769.50', '$500' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** An ISO deadline as a short date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Time until a deadline: '12d 3h left', '4h 20m left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Whether a bounty still takes entries: by its deadline, not status alone —
 *  a bounty past its deadline may still read status "open" until results publish. */
export function takesEntries(b) {
  return new Date(b.deadline).getTime() > Date.now();
}

/** The reward as it stands now: the prize plus entry fees paid into the pot. */
export function pot(b) { return money(b.potUsd ?? b.rewardAmount); }

/** Shorten a long description to its first paragraph for a card. */
export function firstPara(text) {
  const para = String(text ?? '').split(/\n\s*\n/)[0] || '';
  return para.length > 220 ? `${para.slice(0, 217)}…` : para;
}
