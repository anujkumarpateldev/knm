import { state } from '../state.js';
import { nav } from '../router.js';

export function renderProgressDashboard() {
  const sorted = [...state.activityHistory].sort((a, b) => b.timestamp - a.timestamp);

  const listHtml = sorted.length === 0
    ? `<div style="text-align:center; padding: 4rem; color: var(--text-muted);">No activity recorded yet. Try taking an exam or practising a module!</div>`
    : sorted.map(activity => {
        const date = new Date(activity.timestamp).toLocaleString();
        const scoreClass = (activity.mode === 'Exam' && activity.passed === false) ? 'score-fail' : 'score-pass';
        return `
          <div class="progress-item">
            <div class="progress-item-details">
              <h4>${activity.title} <span class="tag" style="margin-left: 0.5rem;">${activity.mode}</span></h4>
              <p>${date}</p>
            </div>
            <div class="progress-item-score ${scoreClass}">${activity.score}%</div>
          </div>`;
      }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="progress-view">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Activity History</h1>
          <p>Your recent module practice and exam results.</p>
        </div>
        <button class="btn-secondary" id="btn-back-home">Back to Home</button>
      </div>
      <div class="progress-list">${listHtml}</div>
    </div>
  `;

  document.getElementById('btn-back-home').addEventListener('click', () => nav.landing());
}
