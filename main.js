// App entry point — wires navigation registry then boots
import { loadFromStorage } from './src/storage.js';
import { setupTheme }      from './src/theme.js';
import { nav }             from './src/router.js';
import { supabase }        from './src/supabase.js';
import { state }           from './src/state.js';

import { renderAuthPage }        from './src/views/auth.js';
import { renderLandingPage }     from './src/views/landing.js';
import { renderCategorySelect }  from './src/views/categorySelect.js';
import { renderProgressDashboard } from './src/views/progress.js';
import { renderQuestion }        from './src/views/quiz.js';
import { renderResults }         from './src/views/results.js';
import { startFlashcards, renderSingleFlashcard } from './src/views/flashcards.js';

import { renderKNMDashboard }  from './src/views/knm/dashboard.js';
import { startExamMode }       from './src/views/knm/exam.js';

import { renderReadingDashboard }    from './src/views/reading/dashboard.js';
import { startReadingExamMode }      from './src/views/reading/exam.js';
import { renderVocabDashboard, renderVocabCards } from './src/views/reading/vocab.js';
import { renderReadingQuizDashboard } from './src/views/reading/quizDashboard.js';

import { fetchKNMModules }  from './src/data/knm.js';
import { fetchReadingData } from './src/data/reading.js';

// ── Wire up all navigation targets ─────────────────────────────────────────
nav.auth             = renderAuthPage;
nav.landing          = renderLandingPage;
nav.categorySelect   = renderCategorySelect;
nav.progress         = renderProgressDashboard;
nav.quiz             = renderQuestion;
nav.results          = renderResults;
nav.flashcards       = startFlashcards;
nav.flashcard        = renderSingleFlashcard;
nav.knmDashboard     = renderKNMDashboard;
nav.exam             = startExamMode;
nav.readingDashboard     = renderReadingDashboard;
nav.readingExam          = startReadingExamMode;
nav.vocabDashboard       = renderVocabDashboard;
nav.vocabCards           = renderVocabCards;
nav.readingQuizDashboard = renderReadingQuizDashboard;

// ── Header: user info + hamburger menu ──────────────────────────────────────
function updateHeader(user) {
  const controls = document.querySelector('.header-controls');
  const existing = document.getElementById('user-info');
  if (existing) existing.remove();

  const username = user ? user.email.split('@')[0] : null;

  const userEl = document.createElement('div');
  userEl.id = 'user-info';
  userEl.style.cssText = 'display:flex; align-items:center; gap:0.5rem; position:relative;';

  if (user) {
    userEl.innerHTML = `
      <span class="header-username">${username}</span>
      <button id="btn-hamburger" class="hamburger-btn" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <div class="header-dropdown" id="header-dropdown">
        <div class="dropdown-user">
          <div class="dropdown-avatar">${username[0].toUpperCase()}</div>
          <div>
            <div class="dropdown-name">${username}</div>
            <div class="dropdown-email">${user.email}</div>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item dropdown-item-danger" id="btn-logout">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    `;
  } else {
    userEl.innerHTML = `
      <button id="btn-hamburger" class="hamburger-btn" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <div class="header-dropdown" id="header-dropdown">
        <div class="dropdown-guest-header">
          <p class="dropdown-guest-title">Welcome!</p>
          <p class="dropdown-guest-sub">Sign in to unlock all features</p>
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-guest-actions">
          <button class="dropdown-guest-login" id="btn-login-drop">Sign In</button>
          <button class="dropdown-guest-register" id="btn-register-drop">Register Free</button>
        </div>
      </div>
    `;
  }

  controls.prepend(userEl);

  // Toggle dropdown — stop propagation on the whole dropdown so document handler doesn't fire inside it
  const hamburger = document.getElementById('btn-hamburger');
  const dropdown  = document.getElementById('header-dropdown');

  dropdown.addEventListener('click', e => e.stopPropagation());

  hamburger.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    if (isOpen) {
      // Single-use listener — closes dropdown when clicking anywhere outside
      setTimeout(() => {
        document.addEventListener('click', function closeDropdown() {
          dropdown.classList.remove('open');
          hamburger.classList.remove('active');
          document.removeEventListener('click', closeDropdown);
        });
      }, 0);
    }
  });

  if (user) {
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await supabase.auth.signOut();
      updateHeader(null);
      renderLandingPage();
    });
  } else {
    document.getElementById('btn-login-drop').addEventListener('click', () => nav.auth());
    document.getElementById('btn-register-drop').addEventListener('click', () => {
      nav.auth();
      setTimeout(() => document.getElementById('tab-register')?.click(), 50);
    });
  }
}

// ── Boot ────────────────────────────────────────────────────────────────────
async function init() {
  loadFromStorage();
  setupTheme();
  document.getElementById('logo-home')?.addEventListener('click', renderLandingPage);

  // Check existing session
  const { data: { session } } = await supabase.auth.getSession();
  state.currentUser = session?.user ?? null;
  updateHeader(session?.user ?? null);

  try {
    await Promise.all([fetchKNMModules(), fetchReadingData()]);
    renderLandingPage();
  } catch (err) {
    document.getElementById('main-content').innerHTML = `
      <div class="results-container">
        <h2 style="color:var(--danger)">Error Loading Data</h2>
        <p class="results-subtitle">${err.message}</p>
      </div>`;
  }
}

// Re-load data after login (auth state change)
supabase.auth.onAuthStateChange((event, session) => {
  state.currentUser = session?.user ?? null;
  updateHeader(session?.user ?? null);
  if (event === 'SIGNED_IN') nav.landing();
});

init();
