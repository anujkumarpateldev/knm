import { state } from '../../state.js';
import { nav } from '../../router.js';
import { getKNMModuleProgress } from '../../data/knm.js';

export function renderKNMDashboard() {
  state.isExamMode = false;

  const cardsHtml = state.knmModules.map(mod => {
    const total = mod.questions ? mod.questions.length : (mod.total_questions || 0);
    const { completed } = getKNMModuleProgress(mod.module_id);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return `
      <div class="module-card" data-module-id="${mod.module_id}">
        <h3>${mod.module_title_en}</h3>
        <p>${mod.module_title_nl}</p>
        <div class="module-progress-bar">
          <div class="module-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="module-stats">
          <span>${completed} / ${total} completed</span>
          <span>${pct}%</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>KNM Practice</h1>
          <p>Select a module to test your knowledge.</p>
        </div>
        <button class="btn-secondary" id="btn-back-categories">Change Category</button>
      </div>
      <div class="modules-grid">${cardsHtml}</div>
    </div>
  `;

  document.getElementById('btn-back-categories').addEventListener('click', () => nav.categorySelect('PRACTICE'));
  document.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', () => startKNMQuiz(card.getAttribute('data-module-id')));
  });
}

function startKNMQuiz(moduleId) {
  state.currentModule = state.knmModules.find(m => m.module_id === moduleId);
  if (!state.userProgress[moduleId]) state.userProgress[moduleId] = {};

  // Resume from first unanswered question
  let firstUnanswered = 0;
  if (state.currentModule.questions) {
    for (let i = 0; i < state.currentModule.questions.length; i++) {
      if (state.userProgress[moduleId][state.currentModule.questions[i].id] === undefined) {
        firstUnanswered = i;
        break;
      }
    }
  }

  state.currentQuestionIndex = firstUnanswered;
  state.sessionStats = { correct: 0, wrong: 0 };
  state.sessionWrongQuestions = [];
  state.isExamMode = false;
  nav.quiz();
}
