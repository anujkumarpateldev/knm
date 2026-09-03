import { state } from '../state.js';
import { nav } from '../router.js';
import { supabase } from '../supabase.js';
import { trackEnter } from '../utils/tracker.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayStr(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

function fmtDur(seconds) {
  if (!seconds || seconds < 60) return `${seconds ?? 0}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Compute current streak (consecutive days ending today or yesterday). */
function calcStreak(history) {
  if (!history.length) return 0;
  const days = [...new Set(history.map(a => dayStr(a.timestamp)))].sort().reverse();
  const today = dayStr(Date.now());
  const yesterday = dayStr(Date.now() - 86400000);

  // Streak must touch today or yesterday to be considered active
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = Math.round((prev - curr) / 86400000);
    if (diff === 1) { streak++; } else { break; }
  }
  return streak;
}

/** Best exam score from activityHistory. */
function bestExamScore(history) {
  const exams = history.filter(a => a.mode === 'Exam');
  if (!exams.length) return null;
  return Math.max(...exams.map(a => a.score));
}

/** Count activity sessions per section label from activityHistory. */
const SECTION_FROM_TITLE = {
  'KNM Practice': 'knm',
  'Reading':      'reading',
  'Speaking':     'speaking',
};

/** Mini horizontal bar chart (plain HTML, no SVG). */
function miniBar(value, max, color) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return `<div style="height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin-top:4px;">
    <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div>
  </div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────

export async function renderProgressDashboard() {
  trackEnter('progress');
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  const sorted = [...state.activityHistory].sort((a, b) => b.timestamp - a.timestamp);
  const streak   = calcStreak(state.activityHistory);
  const best     = bestExamScore(state.activityHistory);
  const total    = state.activityHistory.length;
  const examPass = state.activityHistory.filter(a => a.mode === 'Exam' && a.passed === true).length;
  const examTotal= state.activityHistory.filter(a => a.mode === 'Exam').length;

  // Study time this week from user_events (async, fills in after render)
  let weeklySeconds = null;
  let sectionTimes  = {};

  if (state.currentUser) {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: exits } = await supabase
      .from('user_events')
      .select('section, properties')
      .eq('user_id', state.currentUser.id)
      .eq('event', 'section_exit')
      .gte('created_at', since);

    if (exits) {
      weeklySeconds = exits.reduce((s, e) => s + (e.properties?.time_spent ?? 0), 0);
      exits.forEach(e => {
        if (e.section) {
          sectionTimes[e.section] = (sectionTimes[e.section] ?? 0) + (e.properties?.time_spent ?? 0);
        }
      });
    }
  }

  // Section breakdown (top 5 by time this week)
  const sectionEntries = Object.entries(sectionTimes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxSectionTime = sectionEntries[0]?.[1] ?? 1;

  const SECTION_LABELS = {
    landing: 'Home', knm: 'KNM Practice', reading: 'Reading',
    reading_vocab: 'Vocabulary', speaking: 'Speaking',
    speaking_learn: 'Speaking – Learn', speaking_practice: 'Speaking – Practice',
    words: 'Word Journal', words_add: 'Add Word', words_revision: 'Revision',
    progress: 'Progress',
  };
  const SECTION_COLORS = {
    knm: '#3b82f6', reading: '#10b981', reading_vocab: '#059669',
    speaking: '#f59e0b', speaking_learn: '#d97706', speaking_practice: '#b45309',
    words: '#8b5cf6', words_add: '#7c3aed', words_revision: '#6d28d9',
    landing: '#6366f1', progress: '#ec4899',
  };

  const sectionBreakdownHtml = sectionEntries.length
    ? sectionEntries.map(([sec, secs]) => `
        <div style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
            <span>${SECTION_LABELS[sec] ?? sec}</span>
            <span style="color:var(--text-muted);">${fmtDur(secs)}</span>
          </div>
          ${miniBar(secs, maxSectionTime, SECTION_COLORS[sec] ?? '#94a3b8')}
        </div>`).join('')
    : `<p style="color:var(--text-muted);font-size:0.85rem;">No section data yet this week.</p>`;

  const listHtml = sorted.length === 0
    ? `<div style="text-align:center;padding:4rem;color:var(--text-muted);">No activity recorded yet. Try taking an exam or practising a module!</div>`
    : sorted.map(activity => {
        const date = new Date(activity.timestamp).toLocaleString();
        const scoreClass = (activity.mode === 'Exam' && activity.passed === false) ? 'score-fail' : 'score-pass';
        return `
          <div class="progress-item">
            <div class="progress-item-details">
              <h4>${activity.title} <span class="tag" style="margin-left:0.5rem;">${activity.mode}</span></h4>
              <p>${date}</p>
            </div>
            <div class="progress-item-score ${scoreClass}">${activity.score}%</div>
          </div>`;
      }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="progress-view">
      <div class="dashboard-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h1>Your Progress</h1>
          <p>Study stats and activity history.</p>
        </div>
        <button class="btn-secondary" id="btn-back-home">Back to Home</button>
      </div>

      <!-- Stat cards -->
      <div class="analytics-stat-row" style="margin-bottom:2rem;">
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${streak}</div>
          <div class="analytics-stat-label">Day streak 🔥</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${weeklySeconds !== null ? fmtDur(weeklySeconds) : '—'}</div>
          <div class="analytics-stat-label">Study time this week</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${total}</div>
          <div class="analytics-stat-label">Sessions recorded</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${best !== null ? best + '%' : '—'}</div>
          <div class="analytics-stat-label">Best exam score</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${examTotal > 0 ? `${examPass}/${examTotal}` : '—'}</div>
          <div class="analytics-stat-label">Exams passed</div>
        </div>
      </div>

      ${state.currentUser ? `
      <!-- Section breakdown -->
      <div class="analytics-section" style="margin-bottom:2rem;">
        <h2 class="analytics-section-title">Time per Section <span class="analytics-period">last 7 days</span></h2>
        ${sectionBreakdownHtml}
      </div>` : ''}

      <!-- Activity history -->
      <div class="analytics-section">
        <h2 class="analytics-section-title">Activity History</h2>
        <div class="progress-list">${listHtml}</div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-home').addEventListener('click', () => nav.landing());
}
