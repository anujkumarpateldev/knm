import { state } from '../../state.js';
import { nav } from '../../router.js';
import { startExamTimer, formatTime } from '../../utils/examTimer.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function startReadingExamMode() {
  state.isExamMode = true;
  state.sessionStats = { correct: 0, wrong: 0 };
  state.sessionWrongQuestions = [];

  // Pool all questions from every reading quiz module, then pick 25 at random
  const allQuestions = state.readingQuestions.flatMap(mod => mod.questions ?? []);
  const examQuestions = shuffle(allQuestions).slice(0, 25);

  state.currentModule = {
    module_id: 'READING_EXAM',
    module_title_en: 'Reading Full Practice Exam',
    module_title_nl: 'Oefenexamen Lezen',
    questions: examQuestions,
  };
  state.userProgress['rq:READING_EXAM'] = {};
  state.currentQuestionIndex = 0;

  const timerEl = document.getElementById('exam-timer');
  if (timerEl) {
    timerEl.style.display = 'block';
    timerEl.textContent = formatTime(65 * 60);
    timerEl.className = '';
  }

  startExamTimer(
    65 * 60,
    (remaining) => {
      updateTimerDisplay(remaining);
      if (remaining === 300) showTimerToast('5 minutes remaining!');
      if (remaining === 60)  showTimerToast('1 minute remaining!');
    },
    () => nav.results()
  );

  nav.quiz();
}

function updateTimerDisplay(remaining) {
  const timerEl = document.getElementById('exam-timer');
  if (!timerEl) return;
  timerEl.textContent = formatTime(remaining);
  timerEl.classList.toggle('timer-warning',  remaining <= 300 && remaining > 60);
  timerEl.classList.toggle('timer-critical', remaining <= 60);
}

function showTimerToast(message) {
  const existing = document.getElementById('timer-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'timer-toast';
  toast.className = 'timer-toast';
  toast.textContent = `⏱ ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 5000);
}
