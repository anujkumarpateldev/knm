// App entry point — wires navigation registry then boots
import { loadFromStorage } from './src/storage.js';
import { setupTheme }      from './src/theme.js';
import { nav }             from './src/router.js';
import { supabase }        from './src/supabase.js';

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

// ── Header: user info + logout ──────────────────────────────────────────────
function updateHeader(user) {
  const controls = document.querySelector('.header-controls');
  const existing = document.getElementById('user-info');
  if (existing) existing.remove();

  const userEl = document.createElement('div');
  userEl.id = 'user-info';
  userEl.style.cssText = 'display:flex; align-items:center; gap:0.75rem;';

  if (user) {
    userEl.innerHTML = `
      <span style="font-size:0.8rem; color:var(--text-muted); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${user.email}</span>
      <button id="btn-logout" class="btn-secondary" style="padding:0.4rem 0.75rem; font-size:0.8rem;">Logout</button>
    `;
    controls.prepend(userEl);
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await supabase.auth.signOut();
      updateHeader(null);
      renderLandingPage();
    });
  } else {
    userEl.innerHTML = `
      <button id="btn-login" class="btn-secondary" style="padding:0.4rem 0.75rem; font-size:0.8rem;">Login / Register</button>
    `;
    controls.prepend(userEl);
    document.getElementById('btn-login').addEventListener('click', () => nav.auth());
  }
}

// ── Boot ────────────────────────────────────────────────────────────────────
async function init() {
  loadFromStorage();
  setupTheme();
  document.getElementById('logo-home')?.addEventListener('click', renderLandingPage);

  // Check existing session
  const { data: { session } } = await supabase.auth.getSession();
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
  updateHeader(session?.user ?? null);
  if (event === 'SIGNED_IN') nav.landing();
});

init();
