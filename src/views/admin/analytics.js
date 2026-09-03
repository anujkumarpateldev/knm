// src/views/admin/analytics.js
// Admin analytics dashboard — users, AI usage, section traffic, time-of-day, DAU, recent events.
import { nav } from '../../router.js';
import { supabase } from '../../supabase.js';

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const SECTION_LABELS = {
  landing:          'Home',
  knm:              'KNM Practice',
  reading:          'Reading',
  reading_vocab:    'Vocabulary',
  speaking:         'Speaking',
  speaking_learn:   'Speaking – Learn',
  speaking_practice:'Speaking – Practice',
  words:            'Word Journal',
  words_add:        'Add Word',
  words_revision:   'Revision',
  progress:         'Progress',
};

const SECTION_COLORS = {
  landing:          '#6366f1',
  knm:              '#3b82f6',
  reading:          '#10b981',
  reading_vocab:    '#059669',
  speaking:         '#f59e0b',
  speaking_learn:   '#d97706',
  speaking_practice:'#b45309',
  words:            '#8b5cf6',
  words_add:        '#7c3aed',
  words_revision:   '#6d28d9',
  progress:         '#ec4899',
};

function label(section) { return SECTION_LABELS[section] ?? section ?? '—'; }
function color(section) { return SECTION_COLORS[section] ?? '#94a3b8'; }

// ── Data helpers ──────────────────────────────────────────────────────────────

function dateStr(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

function fmtDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDur(seconds) {
  if (!seconds || seconds < 60) return `${seconds ?? 0}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function fmtTokens(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {});
}

function last14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
}

// ── SVG chart builders ────────────────────────────────────────────────────────

function barChartH(data, width = 420) {
  if (!data.length) return '<p style="color:var(--text-muted);font-size:0.85rem;">No data yet.</p>';
  const max    = Math.max(...data.map(d => d.value), 1);
  const rowH   = 28;
  const labelW = 130;
  const barW   = width - labelW - 50;
  const height = data.length * rowH + 10;

  const rows = data.map((d, i) => {
    const bw   = Math.round((d.value / max) * barW);
    const y    = i * rowH + 4;
    const midY = y + rowH / 2 - 2;
    return `
      <text x="${labelW - 6}" y="${midY + 5}" text-anchor="end" font-size="11" fill="var(--text-muted)">${d.label}</text>
      <rect x="${labelW}" y="${y}" width="${bw}" height="${rowH - 8}" rx="3" fill="${d.color}" opacity="0.85"/>
      <text x="${labelW + bw + 5}" y="${midY + 5}" font-size="11" fill="var(--text-muted)">${d.value}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;overflow:visible;">${rows}</svg>`;
}

function barChartV(data, width = 480, height = 100) {
  if (!data.length) return '';
  const max  = Math.max(...data.map(d => d.value), 1);
  const barW = Math.floor(width / data.length) - 2;
  const bars = data.map((d, i) => {
    const bh = Math.round((d.value / max) * (height - 20));
    const x  = i * (barW + 2);
    const y  = height - 20 - bh;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="2" fill="#6366f1" opacity="0.75"/>
      ${i % 3 === 0 ? `<text x="${x + barW / 2}" y="${height - 4}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${d.label}</text>` : ''}`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;">${bars}</svg>`;
}

function lineChart(data, width = 480, height = 80) {
  if (!data.length) return '';
  const max   = Math.max(...data.map(d => d.value), 1);
  const n     = data.length;
  const xStep = width / (n - 1 || 1);

  const points = data.map((d, i) => {
    const x = Math.round(i * xStep);
    const y = Math.round((height - 20) - ((d.value / max) * (height - 30))) + 5;
    return `${x},${y}`;
  }).join(' ');

  const labels = data
    .filter((_, i) => i === 0 || i === n - 1 || i === Math.floor(n / 2))
    .map(d => {
      const i  = data.indexOf(d);
      const x  = Math.round(i * xStep);
      const an = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      return `<text x="${x}" y="${height}" text-anchor="${an}" font-size="9" fill="var(--text-muted)">${d.label}</text>`;
    }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;">
      <polyline points="${points}" fill="none" stroke="#6366f1" stroke-width="2" stroke-linejoin="round"/>
      ${data.map((d, i) => {
        const x = Math.round(i * xStep);
        const y = Math.round((height - 20) - ((d.value / max) * (height - 30))) + 5;
        return d.value > 0 ? `<circle cx="${x}" cy="${y}" r="3" fill="#6366f1"/>` : '';
      }).join('')}
      ${labels}
    </svg>`;
}

// ── User overview modal ───────────────────────────────────────────────────────

function showUserOverview(profile, userEvents, userAI) {
  const fmtFull = isoStr => isoStr
    ? new Date(isoStr).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—';

  // Last active = most recent event timestamp
  const lastEvent = userEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const lastActive = lastEvent ? fmtFull(lastEvent.created_at) : (profile.last_login_at ? fmtFull(profile.last_login_at) : '—');

  // AI stats
  const aiCalls  = userAI.length;
  const aiInput  = userAI.reduce((s, r) => s + (r.input_tokens  ?? 0), 0);
  const aiOutput = userAI.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const aiByAction = groupBy(userAI, r => r.action ?? 'unknown');

  // Section-wise activity (time spent from section_exit)
  const exits = userEvents.filter(e => e.event === 'section_exit' && e.properties?.time_spent > 0);
  const sectionTime = {};
  exits.forEach(e => {
    sectionTime[e.section] = (sectionTime[e.section] ?? 0) + e.properties.time_spent;
  });
  const sectionVisits = {};
  userEvents.filter(e => e.event === 'section_enter' && e.section).forEach(e => {
    sectionVisits[e.section] = (sectionVisits[e.section] ?? 0) + 1;
  });
  const allSections = [...new Set([...Object.keys(sectionTime), ...Object.keys(sectionVisits)])];
  const maxTime = Math.max(...Object.values(sectionTime), 1);

  const sectionRows = allSections
    .sort((a, b) => (sectionTime[b] ?? 0) - (sectionTime[a] ?? 0))
    .map(sec => {
      const pct = Math.round(((sectionTime[sec] ?? 0) / maxTime) * 100);
      return `
        <tr>
          <td style="font-size:0.83rem;padding:6px 8px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color(sec)};margin-right:6px;vertical-align:middle;"></span>
            ${label(sec)}
          </td>
          <td style="font-size:0.8rem;padding:6px 8px;color:var(--text-muted);">${sectionVisits[sec] ?? 0} visits</td>
          <td style="padding:6px 8px;min-width:120px;">
            <div style="height:7px;border-radius:4px;background:var(--surface-2);overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${color(sec)};border-radius:4px;"></div>
            </div>
          </td>
          <td style="font-size:0.8rem;padding:6px 8px;color:var(--text-muted);text-align:right;">${fmtDur(sectionTime[sec] ?? 0)}</td>
        </tr>`;
    }).join('');

  const aiActionRows = Object.entries(aiByAction)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([act, rows]) => `
      <tr>
        <td style="font-size:0.83rem;padding:4px 8px;">${act}</td>
        <td style="font-size:0.83rem;padding:4px 8px;text-align:right;">${rows.length}</td>
        <td style="font-size:0.8rem;padding:4px 8px;text-align:right;color:var(--text-muted);">
          ${fmtTokens(rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0))} tok
        </td>
      </tr>`).join('');

  const statusColor = profile.is_active ? '#10b981' : '#ef4444';
  const statusText  = profile.is_active ? 'Active' : 'Deactivated';

  // Build and inject modal
  const existing = document.getElementById('user-overview-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'user-overview-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.5);padding:1rem;`;

  modal.innerHTML = `
    <div style="background:var(--surface-1);border-radius:14px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
      <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:2px;">User Overview</div>
          <div style="font-size:1rem;font-weight:700;word-break:break-all;">${profile.email}</div>
        </div>
        <button id="modal-close-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.4rem;line-height:1;padding:4px 8px;">&times;</button>
      </div>

      <div style="padding:1.25rem 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
        <div style="background:var(--surface-2);border-radius:10px;padding:0.85rem 1rem;">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Status</div>
          <div style="font-weight:700;color:${statusColor};">${statusText}</div>
        </div>
        <div style="background:var(--surface-2);border-radius:10px;padding:0.85rem 1rem;">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Role</div>
          <div style="font-weight:700;">${profile.role}</div>
        </div>
        <div style="background:var(--surface-2);border-radius:10px;padding:0.85rem 1rem;">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Registered</div>
          <div style="font-weight:600;font-size:0.88rem;">${fmtFull(profile.created_at)}</div>
        </div>
        <div style="background:var(--surface-2);border-radius:10px;padding:0.85rem 1rem;">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Last Active</div>
          <div style="font-weight:600;font-size:0.88rem;">${lastActive}</div>
        </div>
      </div>

      <div style="padding:0 1.5rem 1rem;">
        <div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:0.6rem;">AI Usage</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:0.75rem;">
          <div style="background:var(--surface-2);border-radius:8px;padding:0.7rem;text-align:center;">
            <div style="font-size:1.2rem;font-weight:700;">${aiCalls}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">Total calls</div>
          </div>
          <div style="background:var(--surface-2);border-radius:8px;padding:0.7rem;text-align:center;">
            <div style="font-size:1.2rem;font-weight:700;">${fmtTokens(aiInput)}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">Input tokens</div>
          </div>
          <div style="background:var(--surface-2);border-radius:8px;padding:0.7rem;text-align:center;">
            <div style="font-size:1.2rem;font-weight:700;">${fmtTokens(aiOutput)}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">Output tokens</div>
          </div>
        </div>
        ${aiActionRows ? `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="font-size:0.75rem;color:var(--text-muted);text-align:left;padding:4px 8px;">Action</th>
            <th style="font-size:0.75rem;color:var(--text-muted);text-align:right;padding:4px 8px;">Calls</th>
            <th style="font-size:0.75rem;color:var(--text-muted);text-align:right;padding:4px 8px;">Tokens</th>
          </tr></thead>
          <tbody>${aiActionRows}</tbody>
        </table>` : '<p style="font-size:0.82rem;color:var(--text-muted);">No AI usage recorded.</p>'}
      </div>

      <div style="padding:0 1.5rem 1.5rem;">
        <div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:0.6rem;">Section Activity <span style="font-weight:400;text-transform:none;letter-spacing:0;">(last 30 days)</span></div>
        ${sectionRows ? `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="font-size:0.75rem;color:var(--text-muted);text-align:left;padding:4px 8px;">Section</th>
            <th style="font-size:0.75rem;color:var(--text-muted);text-align:left;padding:4px 8px;">Visits</th>
            <th style="font-size:0.75rem;color:var(--text-muted);padding:4px 8px;"></th>
            <th style="font-size:0.75rem;color:var(--text-muted);text-align:right;padding:4px 8px;">Time</th>
          </tr></thead>
          <tbody>${sectionRows}</tbody>
        </table>` : '<p style="font-size:0.82rem;color:var(--text-muted);">No section activity recorded yet.</p>'}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('modal-close-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ── Main render ───────────────────────────────────────────────────────────────

export async function renderAdminAnalytics() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-analytics">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-admin">${BACK} Admin</button>
        <div>
          <div class="admin-eyebrow">Admin Panel</div>
          <h1 class="admin-title">Analytics</h1>
        </div>
      </div>
      <p style="color:var(--text-muted);margin-bottom:1.5rem;">Loading data…</p>
    </div>`;

  document.getElementById('btn-back-admin').addEventListener('click', () => nav.adminDashboard());

  // ── Parallel data fetch ───────────────────────────────────────────────────

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const since7  = new Date(Date.now() - 7  * 86400000).toISOString();

  const [eventsRes, profilesRes, aiRes] = await Promise.all([
    supabase
      .from('user_events')
      .select('user_id, event, section, properties, created_at')
      .gte('created_at', since30)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_profiles')
      .select('user_id, email, role, is_active, deactivated_at, last_login_at, created_at'),
    supabase
      .from('ai_usage')
      .select('user_id, module, action, provider, model, input_tokens, output_tokens, created_at')
      .order('created_at', { ascending: false }),
  ]);

  if (eventsRes.error || profilesRes.error || aiRes.error) {
    const msg = (eventsRes.error || profilesRes.error || aiRes.error).message;
    document.getElementById('main-content').innerHTML += `<p style="color:var(--danger);">Error: ${msg}</p>`;
    return;
  }

  const events   = eventsRes.data;
  const profiles = profilesRes.data;
  const aiAll    = aiRes.data;

  // ── User stats ────────────────────────────────────────────────────────────

  const totalUsers      = profiles.length;
  const activeUsers     = profiles.filter(p => p.is_active).length;
  const deactivated     = profiles.filter(p => !p.is_active).length;
  const newThisMonth    = profiles.filter(p => p.created_at >= since30).length;
  const newThisWeek     = profiles.filter(p => p.created_at >= since7).length;

  // Active = logged in within last 7 days
  const recentlyActive  = profiles.filter(p => p.last_login_at && p.last_login_at >= since7).length;

  // ── AI usage stats ────────────────────────────────────────────────────────

  const totalAICalls    = aiAll.length;
  const totalInputTok   = aiAll.reduce((s, r) => s + (r.input_tokens  ?? 0), 0);
  const totalOutputTok  = aiAll.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const aiLast30        = aiAll.filter(r => r.created_at >= since30);
  const aiLast7         = aiAll.filter(r => r.created_at >= since7);

  // Per-user AI call count (all time)
  const aiByUser = groupBy(aiAll, r => r.user_id);

  // Build email lookup from profiles
  const emailOf = Object.fromEntries(profiles.map(p => [p.user_id, p.email]));

  // Top AI users (all time, top 10)
  const topAIUsers = Object.entries(aiByUser)
    .map(([uid, rows]) => ({
      email:  emailOf[uid] ?? uid.slice(0, 8) + '…',
      calls:  rows.length,
      tokens: rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0),
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10);

  // AI usage by provider
  const byProvider = groupBy(aiAll, r => r.provider ?? 'unknown');
  const providerData = Object.entries(byProvider)
    .map(([p, rows]) => ({ label: p, value: rows.length, color: p === 'deepseek' ? '#3b82f6' : '#10b981' }))
    .sort((a, b) => b.value - a.value);

  // AI usage by action
  const byAction = groupBy(aiAll, r => r.action ?? 'unknown');
  const actionData = Object.entries(byAction)
    .map(([a, rows]) => ({ label: a, value: rows.length, color: '#8b5cf6' }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ── Event stats ───────────────────────────────────────────────────────────

  const today     = dateStr(Date.now());
  const todayEvts = events.filter(e => dateStr(e.created_at) === today);

  const totalToday = todayEvts.length;
  const dauToday   = new Set(todayEvts.map(e => e.user_id)).size;
  const dau30      = new Set(events.map(e => e.user_id)).size;

  const exits  = events.filter(e => e.event === 'section_exit' && e.properties?.time_spent > 0);
  const avgDur = exits.length
    ? Math.round(exits.reduce((s, e) => s + (e.properties.time_spent ?? 0), 0) / exits.length)
    : 0;

  const todayEnters      = todayEvts.filter(e => e.event === 'section_enter');
  const sectionCountsToday = groupBy(todayEnters, e => e.section);
  const topSectionToday  = Object.entries(sectionCountsToday).sort((a, b) => b[1].length - a[1].length)[0];

  const enters      = events.filter(e => e.event === 'section_enter' && e.section);
  const sectionCounts = groupBy(enters, e => e.section);
  const sectionData = Object.entries(sectionCounts)
    .map(([s, arr]) => ({ label: label(s), value: arr.length, color: color(s) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: 0 }));
  events.forEach(e => { hourBuckets[new Date(e.created_at).getHours()].value++; });

  const days14  = last14Days();
  const byDay   = groupBy(events, e => dateStr(e.created_at));
  const dauData = days14.map(d => ({
    label: fmtDate(d),
    value: new Set((byDay[d] ?? []).map(e => e.user_id)).size,
  }));

  const quizEvts = events.filter(e => e.event === 'quiz_complete');
  const avgScore = quizEvts.length
    ? Math.round(quizEvts.reduce((s, e) => s + (e.properties?.score ?? 0), 0) / quizEvts.length)
    : 0;

  const wordsAdded = events.filter(e => e.event === 'word_added').length;

  // ── Per-user table (all users, sorted by last login) ─────────────────────

  const aiCallsOf = Object.fromEntries(
    Object.entries(aiByUser).map(([uid, rows]) => [uid, rows.length])
  );

  const sortedProfiles = [...profiles].sort((a, b) => {
    if (!a.last_login_at && !b.last_login_at) return 0;
    if (!a.last_login_at) return 1;
    if (!b.last_login_at) return -1;
    return new Date(b.last_login_at) - new Date(a.last_login_at);
  });

  const usersTableHtml = sortedProfiles.map(p => {
    const statusDot = p.is_active
      ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:5px;"></span>Active`
      : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:5px;"></span>Deactivated`;
    const isNew = p.created_at >= since7;
    return `
      <tr>
        <td style="font-size:0.82rem;">${p.email}${isNew ? ' <span style="background:#fef08a;color:#713f12;font-size:0.7rem;padding:1px 5px;border-radius:4px;vertical-align:middle;">NEW</span>' : ''}</td>
        <td style="font-size:0.8rem;">${statusDot}</td>
        <td style="font-size:0.8rem;color:var(--text-muted);">${p.role}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);">${fmtDateTime(p.created_at)}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);">${fmtDateTime(p.last_login_at)}</td>
        <td style="font-size:0.82rem;text-align:right;">${aiCallsOf[p.user_id] ?? 0}</td>
        <td><button class="btn-user-overview" data-uid="${p.user_id}" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface-2);cursor:pointer;color:var(--text);">Overview</button></td>
      </tr>`;
  }).join('');

  // ── Top AI users table ────────────────────────────────────────────────────

  const topAIHtml = topAIUsers.map(u => `
    <tr>
      <td style="font-size:0.82rem;">${u.email}</td>
      <td style="font-size:0.82rem;text-align:right;">${u.calls}</td>
      <td style="font-size:0.78rem;text-align:right;color:var(--text-muted);">${fmtTokens(u.tokens)}</td>
    </tr>`).join('');

  // ── Recent events feed ────────────────────────────────────────────────────

  const recentHtml = events.slice(0, 30).map(e => `
    <tr>
      <td style="color:var(--text-muted);font-size:0.78rem;white-space:nowrap;">${fmtDate(e.created_at)} ${fmtTime(e.created_at)}</td>
      <td><code style="font-size:0.78rem;background:var(--surface-2);padding:1px 5px;border-radius:4px;">${e.event}</code></td>
      <td style="font-size:0.82rem;">${e.section ? `<span style="color:${color(e.section)}">${label(e.section)}</span>` : '—'}</td>
      <td style="font-size:0.78rem;color:var(--text-muted);">${e.event === 'section_exit' ? fmtDur(e.properties?.time_spent) : e.event === 'quiz_complete' ? `${e.properties?.score ?? '?'}%` : ''}</td>
      <td style="font-size:0.75rem;color:var(--text-muted);">${emailOf[e.user_id] ?? '—'}</td>
    </tr>`).join('');

  // ── Render ────────────────────────────────────────────────────────────────

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="admin-analytics">
      <div class="admin-page-header">
        <button class="btn-back" id="btn-back-admin">${BACK} Admin</button>
        <div>
          <div class="admin-eyebrow">Admin Panel</div>
          <h1 class="admin-title">Analytics</h1>
          <p style="color:var(--text-muted);font-size:0.85rem;">Last 30 days</p>
        </div>
      </div>

      <!-- ── Users ── -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">Users</h2>
        <div class="analytics-stat-row">
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${totalUsers}</div>
            <div class="analytics-stat-label">Total registered</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value" style="color:#10b981;">${activeUsers}</div>
            <div class="analytics-stat-label">Active accounts</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value" style="color:#ef4444;">${deactivated}</div>
            <div class="analytics-stat-label">Deactivated</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${newThisMonth}</div>
            <div class="analytics-stat-label">New this month</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${newThisWeek}</div>
            <div class="analytics-stat-label">New this week</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${recentlyActive}</div>
            <div class="analytics-stat-label">Active last 7 days</div>
          </div>
        </div>

        <div style="overflow-x:auto;margin-top:1rem;">
          <table class="analytics-events-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th style="text-align:right;">AI Calls</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${usersTableHtml || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No users</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <!-- ── AI Usage ── -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">AI Usage</h2>
        <div class="analytics-stat-row">
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${totalAICalls}</div>
            <div class="analytics-stat-label">Total AI calls (all time)</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${aiLast30.length}</div>
            <div class="analytics-stat-label">AI calls last 30 days</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${aiLast7.length}</div>
            <div class="analytics-stat-label">AI calls last 7 days</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${fmtTokens(totalInputTok)}</div>
            <div class="analytics-stat-label">Total input tokens</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${fmtTokens(totalOutputTok)}</div>
            <div class="analytics-stat-label">Total output tokens</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${fmtTokens(totalInputTok + totalOutputTok)}</div>
            <div class="analytics-stat-label">Total tokens (all time)</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.5rem;flex-wrap:wrap;">
          <div>
            <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem;color:var(--text-muted);">By Provider</h3>
            ${barChartH(providerData, 320)}
          </div>
          <div>
            <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem;color:var(--text-muted);">By Action</h3>
            ${barChartH(actionData, 320)}
          </div>
        </div>

        <h3 style="font-size:0.9rem;font-weight:600;margin:1.5rem 0 0.75rem;color:var(--text-muted);">Top AI Users (all time)</h3>
        <div style="overflow-x:auto;">
          <table class="analytics-events-table">
            <thead>
              <tr><th>User</th><th style="text-align:right;">Calls</th><th style="text-align:right;">Tokens</th></tr>
            </thead>
            <tbody>${topAIHtml || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No AI usage yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <!-- ── Activity stats ── -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">Activity <span class="analytics-period">last 30 days</span></h2>
        <div class="analytics-stat-row">
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${totalToday}</div>
            <div class="analytics-stat-label">Events today</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${dauToday}</div>
            <div class="analytics-stat-label">Active users today</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${dau30}</div>
            <div class="analytics-stat-label">Unique users (30d)</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${fmtDur(avgDur)}</div>
            <div class="analytics-stat-label">Avg time per section</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${quizEvts.length}</div>
            <div class="analytics-stat-label">Quizzes completed</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${avgScore ? avgScore + '%' : '—'}</div>
            <div class="analytics-stat-label">Avg quiz score</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${wordsAdded}</div>
            <div class="analytics-stat-label">Words added</div>
          </div>
          <div class="analytics-stat-card">
            <div class="analytics-stat-value">${topSectionToday ? label(topSectionToday[0]) : '—'}</div>
            <div class="analytics-stat-label">Top section today</div>
          </div>
        </div>
      </div>

      <!-- Section popularity -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">Section Popularity <span class="analytics-period">last 30 days</span></h2>
        ${barChartH(sectionData)}
      </div>

      <!-- Daily active users -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">Daily Active Users <span class="analytics-period">last 14 days</span></h2>
        ${lineChart(dauData)}
      </div>

      <!-- Activity by hour -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">Activity by Hour of Day <span class="analytics-period">last 30 days · all events</span></h2>
        ${barChartV(hourBuckets)}
        <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.25rem;">Hours 0–23 (local server time)</p>
      </div>

      <!-- Recent events -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">Recent Events <span class="analytics-period">latest 30</span></h2>
        <div style="overflow-x:auto;">
          <table class="analytics-events-table">
            <thead>
              <tr><th>Time</th><th>Event</th><th>Section</th><th>Detail</th><th>User</th></tr>
            </thead>
            <tbody>${recentHtml || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No events yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-admin').addEventListener('click', () => nav.adminDashboard());

  // Wire Overview buttons — use delegated listener on the table body
  document.querySelectorAll('.btn-user-overview').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid     = btn.dataset.uid;
      const profile = profiles.find(p => p.user_id === uid);
      if (!profile) return;
      const userEvents = events.filter(e => e.user_id === uid);
      const userAI     = aiAll.filter(r => r.user_id === uid);
      showUserOverview(profile, userEvents, userAI);
    });
  });
}
