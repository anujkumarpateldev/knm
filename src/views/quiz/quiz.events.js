import { state } from '../../state.js';
import { nav } from '../../router.js';
import { speakDutch } from '../../speech.js';
import { handleAnswer } from './quiz.logic.js';
import { stopExamTimer } from '../../utils/examTimer.js';

// renderQuestion is passed as a parameter to avoid a circular import
// (quiz.render → quiz.events → quiz.render would be circular)
export function bindQuizEvents(q, isLast, ICONS, renderQuestion) {
  document.getElementById('btn-quit').addEventListener('click', () => {
    stopExamTimer();
    nav.landing();
  });

  document.getElementById('btn-finish').addEventListener('click', () => nav.results());

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (state.currentQuestionIndex > 0) {
      state.currentQuestionIndex--;
      renderQuestion();
    }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (isLast) {
      nav.results();
    } else {
      state.currentQuestionIndex++;
      renderQuestion();
    }
  });

  document.getElementById('btn-toggle-en').addEventListener('click', () => {
    const btn          = document.getElementById('btn-toggle-en');
    const translations = document.querySelectorAll('.en-translation');
    const isHidden     = translations.length > 0 && translations[0].style.display === 'none';
    translations.forEach(el => { el.style.display = isHidden ? '' : 'none'; });
    btn.innerHTML = isHidden ? `${ICONS.eyeOff} EN` : `${ICONS.eyeOn} EN`;
  });

  document.getElementById('btn-speak').addEventListener('click', () => {
    let text = q.question_nl + '. ';
    if ((q.type === 'multiple_choice' || q.type === 'reading_comprehension') && q.options) {
      q.options.forEach(opt => { text += `${opt.id}. ${opt.text_nl}. `; });
    } else if (q.type === 'true_false') {
      text += 'Waar of Niet waar?';
    }
    speakDutch(text);
  });

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn, q.correct_answer, q));
  });
}
