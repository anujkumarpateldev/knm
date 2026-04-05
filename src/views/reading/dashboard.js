import { state } from '../../state.js';
import { nav } from '../../router.js';
import { QUESTION_MODULES } from '../../data/reading.js';

export function renderReadingDashboard() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  const vocabCount = state.readingVocab.length;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="reading-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Reading Practice</h1>
          <p>Choose a study mode to improve your Dutch reading skills.</p>
        </div>
        <button class="btn-secondary" id="btn-back-categories">Change Category</button>
      </div>

      <div class="reading-modes-grid">
        <div class="module-card reading-mode-card" id="btn-vocab">
          <div class="reading-mode-icon">📖</div>
          <h3>Vocabulary</h3>
          <p class="reading-mode-subtitle">Woordenschat</p>
          <p style="color: var(--text-muted); margin-top: 0.75rem; font-size: 0.9rem;">
            Learn Dutch words with meanings and example sentences.
          </p>
          <div style="margin-top: 1rem;">
            <span class="tag">${vocabCount} topics</span>
            <span class="tag" style="margin-left: 0.5rem;">~100 words each</span>
          </div>
        </div>

        <div class="module-card reading-mode-card" id="btn-reading-quiz" style="cursor:pointer;">
          <div class="reading-mode-icon">📝</div>
          <h3>Reading Quiz</h3>
          <p class="reading-mode-subtitle">Leesbegrip</p>
          <p style="color: var(--text-muted); margin-top: 0.75rem; font-size: 0.9rem;">
            Answer comprehension questions based on Dutch texts.
          </p>
          <div style="margin-top: 1rem;">
            <span class="tag">${state.readingQuestions.length} topics</span>
            <span class="tag" style="margin-left: 0.5rem;">~20 questions each</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-categories').addEventListener('click', () => nav.categorySelect('PRACTICE'));
  document.getElementById('btn-vocab').addEventListener('click', () => nav.vocabDashboard());
  document.getElementById('btn-reading-quiz').addEventListener('click', () => nav.readingQuizDashboard());
}
