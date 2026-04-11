import { state } from '../state.js';
import { nav } from '../router.js';
import { showAuthModal } from '../utils/authModal.js';

export function renderLandingPage() {
  state.isExamMode = false;
  clearInterval(state.timerInterval);
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  const timerEl = document.getElementById('exam-timer');
  if (timerEl) timerEl.style.display = 'none';

  const locked = `<div class="landing-card-lock"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="10" height="8" rx="1.5"/><path d="M4 5V3.5a3 3 0 0 1 6 0V5"/></svg></div>`;
  const isLoggedIn = !!state.currentUser;

  const marqueeMsg = `✦ Register for free &nbsp;&nbsp; ✦ Unlock full exam simulation &nbsp;&nbsp; ✦ Track your progress &nbsp;&nbsp; ✦ It's completely free &nbsp;&nbsp; ✦ Join hundreds of learners &nbsp;&nbsp; ✦ Pass your integration exam &nbsp;&nbsp; ✦ Free forever, no credit card &nbsp;&nbsp;`;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="landing-page">

      ${!isLoggedIn ? `
      <div class="marquee-banner" id="marquee-banner">
        <div class="marquee-track">
          <span>${marqueeMsg}</span>
          <span aria-hidden="true">${marqueeMsg}</span>
        </div>
        <button class="marquee-cta" id="marquee-register-btn">Register Free →</button>
      </div>` : ''}

      <div class="landing-container">
        <div class="landing-eyebrow fade-up">
          <span>🇳🇱</span> A2 Integration Exam Prep
        </div>
        <h1 class="landing-title fade-up fade-up-1">
          Master your<br><em>Dutch exam</em>
        </h1>
        <p class="landing-subtitle fade-up fade-up-2">
          Structured practice, full exam simulations, and real-time progress tracking — everything you need to pass.
        </p>

        <div class="landing-options">
          <div class="landing-card fade-up fade-up-1" id="btn-practice-mode"
            style="--card-accent:#c8f0e0; --card-icon-bg:var(--card-mint); --card-icon-color:#2d6a4f;">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </div>
            <div class="landing-card-label">Free access</div>
            <h3>Practice by Section</h3>
            <p>Study specific topics at your own pace with instant feedback.</p>
          </div>

          <div class="landing-card fade-up fade-up-2" id="btn-exam-mode"
            style="--card-accent:#b8dff5; --card-icon-bg:var(--card-sky); --card-icon-color:#1e5f8a;">
            ${!isLoggedIn ? locked : ''}
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="landing-card-label">Members only</div>
            <h3>Take Full Exam</h3>
            <p>65 minutes, 25 questions. Real exam simulation.</p>
          </div>

          <div class="landing-card fade-up fade-up-3" id="btn-progress"
            style="--card-accent:#fde9a2; --card-icon-bg:var(--card-sun); --card-icon-color:#92620a;">
            ${!isLoggedIn ? locked : ''}
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div class="landing-card-label">Members only</div>
            <h3>Your Progress</h3>
            <p>View your latest activity and test results.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('marquee-register-btn')?.addEventListener('click', () => {
    nav.auth();
    setTimeout(() => document.getElementById('tab-register')?.click(), 50);
  });

  document.getElementById('btn-practice-mode').addEventListener('click', () => nav.categorySelect('PRACTICE'));
  document.getElementById('btn-exam-mode').addEventListener('click', () => {
    if (state.currentUser) nav.categorySelect('EXAM');
    else showAuthModal();
  });
  document.getElementById('btn-progress').addEventListener('click', () => {
    if (state.currentUser) nav.progress();
    else showAuthModal();
  });
}
