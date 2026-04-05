import { state } from '../../state.js';
import { nav } from '../../router.js';
import { getReadingQuizProgress } from '../../data/reading.js';

export function renderReadingQuizDashboard() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  const cardsHtml = state.readingQuestions.map(mod => {
    const total     = mod.questions.length;
    const { completed } = getReadingQuizProgress(mod.module_id);
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
    return `
      <div class="module-card" data-quiz-id="${mod.module_id}" style="cursor:pointer;">
        <h3>${mod.module_title_en}</h3>
        <p>${mod.module_title_nl}</p>
        <div class="module-progress-bar" style="margin-top: 1rem;">
          <div class="module-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="module-stats">
          <span>${completed} / ${total} answered</span>
          <span>${pct}%</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="reading-quiz-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Reading Quiz</h1>
          <p>Read Dutch passages and answer comprehension questions.</p>
        </div>
        <button class="btn-secondary" id="btn-back-reading">Back to Reading</button>
      </div>
      <div class="modules-grid">${cardsHtml}</div>
    </div>
  `;

  document.getElementById('btn-back-reading').addEventListener('click', () => nav.readingDashboard());

  document.querySelectorAll('[data-quiz-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-quiz-id');
      startReadingQuiz(id);
    });
  });
}

function startReadingQuiz(moduleId) {
  const mod = state.readingQuestions.find(m => m.module_id === moduleId);
  if (!mod) return;

  state.currentModule = mod;
  if (!state.userProgress[moduleId]) state.userProgress[moduleId] = {};

  // Resume from first unanswered question
  let firstUnanswered = 0;
  for (let i = 0; i < mod.questions.length; i++) {
    if (state.userProgress[moduleId][mod.questions[i].id] === undefined) {
      firstUnanswered = i;
      break;
    }
  }

  state.currentQuestionIndex  = firstUnanswered;
  state.sessionStats          = { correct: 0, wrong: 0 };
  state.sessionWrongQuestions = [];
  state.isExamMode            = false;
  nav.quiz();
}
