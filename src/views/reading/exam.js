import { state } from '../../state.js';
import { nav } from '../../router.js';

export function startReadingExamMode() {
  state.isExamMode = true;
  state.examTimeRemaining = 65 * 60;
  state.sessionStats = { correct: 0, wrong: 0 };
  state.sessionWrongQuestions = [];

  // Pool all questions from every reading quiz module, then pick 25 at random
  const allQuestions = state.readingQuestions.flatMap(mod => mod.questions ?? []);
  const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
  const examQuestions = shuffled.slice(0, 25);

  state.currentModule = {
    module_id: 'READING_EXAM',
    module_title_en: 'Reading Full Practice Exam',
    module_title_nl: 'Oefenexamen Lezen',
    questions: examQuestions,
  };
  state.userProgress['READING_EXAM'] = {};
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
