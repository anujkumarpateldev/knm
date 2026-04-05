import { state } from '../../state.js';
import { nav } from '../../router.js';

export function startExamMode() {
  state.isExamMode = true;
  state.examTimeRemaining = 45 * 60;
  state.sessionStats = { correct: 0, wrong: 0 };
  state.sessionWrongQuestions = [];

  // 5 random questions from each of the 8 modules
  let examQuestions = [];
  state.knmModules.forEach(mod => {
    if (mod.questions) {
      const shuffled = [...mod.questions].sort(() => 0.5 - Math.random());
      examQuestions.push(...shuffled.slice(0, 5));
    }
  });
  examQuestions.sort(() => 0.5 - Math.random());

  state.currentModule = {
    module_id: 'EXAM',
    module_title_en: 'KNM Full Practice Exam',
    module_title_nl: 'Oefenexamen KNM',
    questions: examQuestions,
  };
  state.userProgress['EXAM'] = {};
  state.currentQuestionIndex = 0;

  const timerEl = document.getElementById('exam-timer');
  if (timerEl) {
    timerEl.style.display = 'block';
    updateTimerDisplay();
  }

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.examTimeRemaining--;
    updateTimerDisplay();
    if (state.examTimeRemaining <= 0) {
      clearInterval(state.timerInterval);
      nav.results();
    }
  }, 1000);

  nav.quiz();
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('exam-timer');
  if (!timerEl) return;
  const m = Math.floor(state.examTimeRemaining / 60).toString().padStart(2, '0');
  const s = (state.examTimeRemaining % 60).toString().padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}
