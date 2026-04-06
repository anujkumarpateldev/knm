// App entry point — wires navigation registry then boots
import { loadFromStorage } from './src/storage.js';
import { setupTheme }      from './src/theme.js';
import { nav }             from './src/router.js';

import { renderLandingPage }   from './src/views/landing.js';
import { renderCategorySelect } from './src/views/categorySelect.js';
import { renderProgressDashboard } from './src/views/progress.js';
import { renderQuestion }      from './src/views/quiz.js';
import { renderResults }       from './src/views/results.js';
import { startFlashcards, renderSingleFlashcard } from './src/views/flashcards.js';

import { renderKNMDashboard }  from './src/views/knm/dashboard.js';
import { startExamMode }       from './src/views/knm/exam.js';

import { renderReadingDashboard } from './src/views/reading/dashboard.js';
import { startReadingExamMode } from './src/views/reading/exam.js';
import { renderVocabDashboard, renderVocabCards } from './src/views/reading/vocab.js';
import { renderReadingQuizDashboard } from './src/views/reading/quizDashboard.js';

import { fetchKNMModules }  from './src/data/knm.js';
import { fetchReadingData } from './src/data/reading.js';

// ── Wire up all navigation targets ─────────────────────────────────────────
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

// ── Boot ────────────────────────────────────────────────────────────────────
async function init() {
  loadFromStorage();
  setupTheme();
  document.getElementById('logo-home')?.addEventListener('click', renderLandingPage);

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

init();
