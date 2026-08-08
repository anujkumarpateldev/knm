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

export function startExamMode() {
  state.isExamMode = true;
  state.sessionStats = { correct: 0, wrong: 0 };
  state.sessionWrongQuestions = [];

  // 5 random questions from each of the 8 modules
  let examQuestions = [];
  state.knmModules.forEach(mod => {
    if (mod.questions) {
      examQuestions.push(...shuffle(mod.questions).slice(0, 5));
    }
  });
  examQuestions = shuffle(examQuestions);

  state.currentModule = {
    module_id: 'EXAM',
    module_title_en: 'KNM Full Practice Exam',
    module_title_nl: 'Oefenexamen KNM',
    questions: examQuestions,
  };
  state.userProgress['knm:EXAM'] = {};
  state.currentQuestionIndex = 0;

  const timerEl = document.getElementById('exam-timer');
  if (timerEl) {
    timerEl.style.display = 'block';
    timerEl.textContent = formatTime(45 * 60);
    timerEl.className = '';
  }

  startExamTimer(
    45 * 60,
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
