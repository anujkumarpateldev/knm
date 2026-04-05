import { state } from '../state.js';
import { nav } from '../router.js';

export function renderLandingPage() {
  state.isExamMode = false;
  clearInterval(state.timerInterval);
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  const timerEl = document.getElementById('exam-timer');
  if (timerEl) timerEl.style.display = 'none';

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="landing-page">
      <div class="landing-container">
        <h1 class="landing-title">Welcome to KNM A2</h1>
        <p class="landing-subtitle">Prepare for your Dutch integration exam based on the Knowledge of Dutch Society curriculum.</p>
        <div class="landing-options">
          <div class="landing-card" id="btn-practice-mode">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </div>
            <h3>Practice by Section</h3>
            <p>Study specific topics at your own pace with instant feedback.</p>
          </div>
          <div class="landing-card" id="btn-exam-mode">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3>Take Full Exam</h3>
            <p>45 minutes, 40 questions. Real exam simulation.</p>
          </div>
          <div class="landing-card" id="btn-progress">
            <div class="landing-card-icon" style="background-color: rgba(16, 185, 129, 0.1); color: var(--success);">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h3>Your Progress</h3>
            <p>View your latest activity and test results.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-practice-mode').addEventListener('click', () => nav.categorySelect('PRACTICE'));
  document.getElementById('btn-exam-mode').addEventListener('click',    () => nav.categorySelect('EXAM'));
  document.getElementById('btn-progress').addEventListener('click',     () => nav.progress());
}
