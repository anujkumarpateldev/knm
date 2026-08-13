// App entry point — wires navigation registry then boots
import { loadFromStorage, setProgressSyncHook } from './src/storage.js';
import { syncProgressItem, pullAndMergeProgress } from './src/sync.js';
import { setupTheme }      from './src/theme.js';
import { showErrorView, friendlyFetchError } from './src/utils/errors.js';
import { nav }             from './src/router.js';
import { supabase }        from './src/supabase.js';
import { state }           from './src/state.js';

import { renderAuthPage, renderResetPasswordForm } from './src/views/auth.js';
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

import { renderSpeakingDashboard } from './src/views/speaking/dashboard.js';
import { renderSpeakingLearn }     from './src/views/speaking/learn.js';
import { renderSpeakingPractice }  from './src/views/speaking/practice.js';

import { renderWordJournal }  from './src/views/words/journal.js';
import { renderAddWord }      from './src/views/words/addWord.js';
import { renderWordRevision } from './src/views/words/revision.js';

import { renderAdminDashboard } from './src/views/admin/dashboard.js';
import { renderAdminUsers }     from './src/views/admin/users.js';
import { renderAdminWords }     from './src/views/admin/wordsAdmin.js';
import { renderAdminTags }      from './src/views/admin/tagsAdmin.js';
import { renderEmailComposer }  from './src/views/admin/emailComposer.js';
import { renderDeactivated }    from './src/views/deactivated.js';

import { fetchKNMModules }    from './src/data/knm.js';
import { fetchReadingData }   from './src/data/reading.js';
import { fetchSpeakingData }  from './src/data/speaking.js';

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

nav.speakingDashboard = renderSpeakingDashboard;
nav.speakingLearn     = renderSpeakingLearn;
nav.speakingPractice  = renderSpeakingPractice;

nav.wordJournal  = renderWordJournal;
nav.addWord      = renderAddWord;
nav.wordRevision = renderWordRevision;

nav.adminDashboard = renderAdminDashboard;
nav.adminUsers     = renderAdminUsers;
nav.adminWords     = renderAdminWords;
nav.adminTags      = renderAdminTags;
nav.adminEmail     = renderEmailComposer;
nav.deactivated    = renderDeactivated;

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
// Wire Supabase sync hook — every setProgress() call auto-syncs when logged in
setProgressSyncHook((domain, moduleId, itemId, value) => {
  syncProgressItem(domain, moduleId, itemId, value); // fire-and-forget
});

async function fetchUserProfile(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();  // won't error if row is missing
  state.userProfile = data ?? null;
  return data;
}

async function init() {
  loadFromStorage();
  setupTheme();
  document.getElementById('logo-home')?.addEventListener('click', renderLandingPage);

  // Check existing session
  const { data: { session } } = await supabase.auth.getSession();
  state.currentUser = session?.user ?? null;
  updateHeader(session?.user ?? null);

  if (session?.user) {
    // Fetch profile in parallel with app data — don't block the landing page on it
    fetchUserProfile(session.user.id).then(profile => {
      if (profile && !profile.is_active) {
        renderDeactivated();
        return;
      }
      // Update last_login_at silently
      supabase.from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', session.user.id);
    });
    pullAndMergeProgress(session.user.id); // fire-and-forget, non-blocking
  }

  await loadAppData();
}

async function loadAppData() {
  try {
    await Promise.all([fetchKNMModules(), fetchReadingData(), fetchSpeakingData()]);
    renderLandingPage();
  } catch (err) {
    const { title, message } = friendlyFetchError(err);
    showErrorView(title, message, loadAppData);
  }
}

// Re-load data after login (auth state change)
supabase.auth.onAuthStateChange((event, session) => {
  state.currentUser = session?.user ?? null;
  updateHeader(session?.user ?? null);
  if (event === 'SIGNED_IN') {
    fetchUserProfile(session.user.id).then(profile => {
      if (profile && !profile.is_active) {
        renderDeactivated();
        return;
      }
      supabase.from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', session.user.id);
    });
    pullAndMergeProgress(session.user.id);
    nav.landing();
  }
  if (event === 'SIGNED_OUT') {
    state.userProfile = null;
  }
  if (event === 'PASSWORD_RECOVERY') {
    renderResetPasswordForm();
  }
});

init();
