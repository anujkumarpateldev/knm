import { state } from '../state.js';
import { nav } from '../router.js';
import { saveToStorage } from '../storage.js';

export function renderResults() {
  document.body.classList.remove('in-dashboard', 'in-quiz');
  clearInterval(state.timerInterval);
  const timerEl = document.getElementById('exam-timer');
  if (timerEl) timerEl.style.display = 'none';

  // For exam: tally answers now (no live feedback was given)
  if (state.isExamMode) {
    state.sessionStats = { correct: 0, wrong: 0 };
    state.sessionWrongQuestions = [];
    state.currentModule.questions.forEach(q => {
      const correct = q.userSelectedAnswer &&
        String(q.userSelectedAnswer).toLowerCase() === String(q.correct_answer).toLowerCase();
      if (correct) {
        state.sessionStats.correct++;
      } else {
        state.sessionStats.wrong++;
        state.sessionWrongQuestions.push(q);
      }
    });
  }

  const total      = state.currentModule.questions.length;
  const pc         = total > 0 ? Math.round((state.sessionStats.correct / total) * 100) : 100;
  const isReadingExam = state.currentModule.module_id === 'READING_EXAM';
  const passThreshold = isReadingExam ? 72 : 65;
  const passed     = state.isExamMode ? pc >= passThreshold : null;

  // Log to activity history
  if (state.sessionStats.correct > 0 || state.sessionStats.wrong > 0) {
    state.activityHistory.push({
      mode:      state.isExamMode ? 'Exam' : 'Practice',
      title:     state.currentModule.module_title_en,
      score:     pc,
      timestamp: Date.now(),
      passed,
    });
    saveToStorage();
  }

  const failColor = 'var(--danger)';
  const iconHtml  = (state.isExamMode && !passed)
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="${failColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

  const passFailHtml = state.isExamMode
    ? `<h3 style="margin-top: 1rem; font-size: 1.5rem; color: ${passed ? 'var(--success)' : failColor};">${passed ? 'EXAM PASSED!' : 'EXAM FAILED'}</h3>`
    : '';

  const subtitle = state.isExamMode
    ? `You scored ${state.sessionStats.correct} out of ${total} on the Full Practice Exam.`
    : `You correctly answered ${state.sessionStats.correct} out of ${total} questions in ${state.currentModule.module_title_en}.`;

  const flashcardBtn = state.sessionWrongQuestions.length > 0
    ? `<button class="btn-primary" id="btn-flashcards" style="background-color: var(--warning); color: #fff;">
        Review Wrong Answers (${state.sessionWrongQuestions.length})
       </button>`
    : '';

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="results-view">
      <div class="results-container">
        <div class="results-icon">${iconHtml}</div>
        <h2>${state.isExamMode ? 'Exam Completed' : 'Module Completed!'}</h2>
        <div class="results-score" style="${state.isExamMode && !passed ? `color:${failColor}` : ''}">${pc}%</div>
        ${passFailHtml}
        <p class="results-subtitle">${subtitle}</p>
        <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <button class="btn-secondary" id="btn-home">Return to Home</button>
            <button class="btn-primary"   id="btn-retry">${state.isExamMode ? 'Take Another Exam' : 'Retry Module'}</button>
          </div>
          ${flashcardBtn}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-home').addEventListener('click', () => nav.landing());
  document.getElementById('btn-retry').addEventListener('click', () => {
    if (state.isExamMode) {
      isReadingExam ? nav.readingExam() : nav.exam();
    } else {
      state.currentQuestionIndex = 0;
      state.sessionStats = { correct: 0, wrong: 0 };
      state.sessionWrongQuestions = [];
      nav.quiz();
    }
  });
  document.getElementById('btn-flashcards')?.addEventListener('click', () => nav.flashcards());
}
