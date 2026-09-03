// src/views/admin/analytics.js
// Admin analytics dashboard — section traffic, time-of-day, DAU, recent events.
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

function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDur(seconds) {
  if (!seconds || seconds < 60) return `${seconds ?? 0}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
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
  // data: [{ label, value, color }]
  if (!data.length) return '<p style="color:var(--text-muted);font-size:0.85rem;">No data yet.</p>';
  const max    = Math.max(...data.map(d => d.value), 1);
  const rowH   = 28;
  const labelW = 130;
  const barW   = width - labelW - 50;
  const height = data.length * rowH + 10;

  const rows = data.map((d, i) => {
    const bw     = Math.round((d.value / max) * barW);
    const y      = i * rowH + 4;
    const midY   = y + rowH / 2 - 2;
    return `
      <text x="${labelW - 6}" y="${midY + 5}" text-anchor="end" font-size="11" fill="var(--text-muted)">${d.label}</text>
      <rect x="${labelW}" y="${y}" width="${bw}" height="${rowH - 8}" rx="3" fill="${d.color}" opacity="0.85"/>
      <text x="${labelW + bw + 5}" y="${midY + 5}" font-size="11" fill="var(--text-muted)">${d.value}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;overflow:visible;">${rows}</svg>`;
}

function barChartV(data, width = 480, height = 100) {
  // data: [{ label, value }] — 24 items for hours
  if (!data.length) return '';
  const max    = Math.max(...data.map(d => d.value), 1);
  const barW   = Math.floor(width / data.length) - 2;
  const bars   = data.map((d, i) => {
    const bh   = Math.round((d.value / max) * (height - 20));
    const x    = i * (barW + 2);
    const y    = height - 20 - bh;
    const showLabel = d.value > 0 || i % 4 === 0;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="2" fill="#6366f1" opacity="0.75"/>
      ${showLabel && i % 3 === 0 ? `<text x="${x + barW / 2}" y="${height - 4}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${d.label}</text>` : ''}`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;">${bars}</svg>`;
}

function lineChart(data, width = 480, height = 80) {
  // data: [{ label, value }]
  if (!data.length) return '';
  const max    = Math.max(...data.map(d => d.value), 1);
  const n      = data.length;
  const xStep  = width / (n - 1 || 1);

  const points = data.map((d, i) => {
    const x = Math.round(i * xStep);
    const y = Math.round((height - 20) - ((d.value / max) * (height - 30))) + 5;
    return `${x},${y}`;
  }).join(' ');

  const labels = data
    .filter((_, i) => i === 0 || i === n - 1 || i === Math.floor(n / 2))
    .map((d, _, arr) => {
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
        return d.value > 0
          ? `<circle cx="${x}" cy="${y}" r="3" fill="#6366f1"/>`
          : '';
      }).join('')}
      ${labels}
    </svg>`;
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

  // Fetch last 30 days of events
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: events, error } = await supabase
    .from('user_events')
    .select('user_id, event, section, properties, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('main-content').innerHTML += `<p style="color:var(--danger);">Error: ${error.message}</p>`;
    return;
  }

  const today     = dateStr(Date.now());
  const todayEvts = events.filter(e => dateStr(e.created_at) === today);

  // ── Stat cards ─────────────────────────────────────────────────────────────

  const totalToday  = todayEvts.length;
  const dauToday    = new Set(todayEvts.map(e => e.user_id)).size;
  const dau30       = new Set(events.map(e => e.user_id)).size;

  // Avg session duration (from section_exit events with time_spent)
  const exits = events.filter(e => e.event === 'section_exit' && e.properties?.time_spent > 0);
  const avgDur = exits.length
    ? Math.round(exits.reduce((s, e) => s + (e.properties.time_spent ?? 0), 0) / exits.length)
    : 0;

  // Top section today
  const todayEnters = todayEvts.filter(e => e.event === 'section_enter');
  const sectionCountsToday = groupBy(todayEnters, e => e.section);
  const topSectionToday = Object.entries(sectionCountsToday)
    .sort((a, b) => b[1].length - a[1].length)[0];

  // ── Section popularity (all 30 days) ──────────────────────────────────────

  const enters = events.filter(e => e.event === 'section_enter' && e.section);
  const sectionCounts = groupBy(enters, e => e.section);
  const sectionData = Object.entries(sectionCounts)
    .map(([s, arr]) => ({ label: label(s), value: arr.length, color: color(s) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ── Time of day ────────────────────────────────────────────────────────────

  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: 0 }));
  events.forEach(e => {
    const h = new Date(e.created_at).getHours();
    hourBuckets[h].value++;
  });

  // ── DAU last 14 days ───────────────────────────────────────────────────────

  const days14    = last14Days();
  const byDay     = groupBy(events, e => dateStr(e.created_at));
  const dauData   = days14.map(d => ({
    label: fmtDate(d),
    value: new Set((byDay[d] ?? []).map(e => e.user_id)).size,
  }));

  // ── Quiz completions ───────────────────────────────────────────────────────

  const quizEvts  = events.filter(e => e.event === 'quiz_complete');
  const avgScore  = quizEvts.length
    ? Math.round(quizEvts.reduce((s, e) => s + (e.properties?.score ?? 0), 0) / quizEvts.length)
    : 0;

  // ── Words added ────────────────────────────────────────────────────────────

  const wordsAdded = events.filter(e => e.event === 'word_added').length;

  // ── Recent events feed ────────────────────────────────────────────────────

  const recent = events.slice(0, 30);
  const recentHtml = recent.map(e => `
    <tr>
      <td style="color:var(--text-muted);font-size:0.78rem;white-space:nowrap;">${fmtDate(e.created_at)} ${fmtTime(e.created_at)}</td>
      <td><code style="font-size:0.78rem;background:var(--surface-2);padding:1px 5px;border-radius:4px;">${e.event}</code></td>
      <td style="font-size:0.82rem;">${e.section ? `<span style="color:${color(e.section)}">${label(e.section)}</span>` : '—'}</td>
      <td style="font-size:0.78rem;color:var(--text-muted);">${e.event === 'section_exit' ? fmtDur(e.properties?.time_spent) : e.event === 'quiz_complete' ? `${e.properties?.score ?? '?'}%` : ''}</td>
    </tr>`).join('');

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

      <!-- Stat cards -->
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
          <div class="analytics-stat-label">Quizzes completed (30d)</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${avgScore ? avgScore + '%' : '—'}</div>
          <div class="analytics-stat-label">Avg quiz score</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${wordsAdded}</div>
          <div class="analytics-stat-label">Words added (30d)</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${topSectionToday ? label(topSectionToday[0]) : '—'}</div>
          <div class="analytics-stat-label">Top section today</div>
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
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Section</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>${recentHtml || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No events yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-admin').addEventListener('click', () => nav.adminDashboard());
}
