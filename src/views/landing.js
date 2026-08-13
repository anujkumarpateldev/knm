import { state } from '../state.js';
import { nav } from '../router.js';
import { showAuthModal } from '../utils/authModal.js';
import { stopExamTimer } from '../utils/examTimer.js';


export function renderLandingPage() {
  stopExamTimer();
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  const timerEl = document.getElementById('exam-timer');
  if (timerEl) timerEl.style.display = 'none';

  const isLoggedIn = !!state.currentUser;
  const isAdmin    = state.userProfile?.role === 'admin';
  const marqueeMsg = `✦ Register for free &nbsp;&nbsp; ✦ Unlock AI speaking validation &nbsp;&nbsp; ✦ Track your progress &nbsp;&nbsp; ✦ It's completely free &nbsp;&nbsp; ✦ Join hundreds of learners &nbsp;&nbsp; ✦ Pass your integration exam &nbsp;&nbsp; ✦ Free forever, no credit card &nbsp;&nbsp;`;

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
            <h3>Practice by Section</h3>
            <p>Study specific topics at your own pace with instant feedback.</p>
          </div>

          <div class="landing-card fade-up fade-up-2" id="btn-exam-mode"
            style="--card-accent:#b8dff5; --card-icon-bg:var(--card-sky); --card-icon-color:#1e5f8a;">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3>Take Full Exam</h3>
            <p>65 minutes, 25 questions. Real exam simulation.</p>
          </div>

          <div class="landing-card fade-up fade-up-3" id="btn-progress"
            style="--card-accent:#fde9a2; --card-icon-bg:var(--card-sun); --card-icon-color:#92620a;">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h3>Your Progress</h3>
            <p>View your latest activity and test results.</p>
          </div>

          <div class="landing-card fade-up fade-up-4" id="btn-my-words"
            style="--card-accent:#f9b8c8; --card-icon-bg:var(--card-tulip); --card-icon-color:#7c2d52;">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </div>
            <h3>Mijn Woorden</h3>
            <p>Add words daily and revise with smart spaced repetition.</p>
          </div>

          ${isAdmin ? `
          <div class="landing-card fade-up fade-up-5" id="btn-admin"
            style="--card-accent:#e0d4f7; --card-icon-bg:#ede9fe; --card-icon-color:#6d28d9;">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Admin Panel</h3>
            <p>Manage users, words, tags and send emails.</p>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;

  document.getElementById('marquee-register-btn')?.addEventListener('click', () => {
    nav.auth();
    setTimeout(() => document.getElementById('tab-register')?.click(), 50);
  });

  document.getElementById('btn-practice-mode').addEventListener('click', () => nav.categorySelect('PRACTICE'));
  document.getElementById('btn-exam-mode').addEventListener('click', () => nav.categorySelect('EXAM'));
  document.getElementById('btn-progress').addEventListener('click', () => nav.progress());
  document.getElementById('btn-my-words').addEventListener('click', () => nav.wordJournal());
  document.getElementById('btn-admin')?.addEventListener('click', () => nav.adminDashboard());
}
