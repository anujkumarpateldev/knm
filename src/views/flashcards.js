import { state } from '../state.js';
import { nav } from '../router.js';
import { speakDutch } from '../speech.js';

const SPEAKER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

export function startFlashcards() {
  document.body.classList.remove('in-dashboard');
  document.body.classList.add('in-quiz');
  state.flashcardIndex = 0;
  renderSingleFlashcard();
}

export function renderSingleFlashcard() {
  if (state.flashcardIndex >= state.sessionWrongQuestions.length) {
    nav.results();
    return;
  }

  const q     = state.sessionWrongQuestions[state.flashcardIndex];
  const idx   = state.flashcardIndex;
  const total = state.sessionWrongQuestions.length;

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="flashcard-view">
      <div class="quiz-header">
        <button class="btn-back" id="btn-back-results">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Back to Results
        </button>
        <div class="quiz-progress-text">Review ${idx + 1} of ${total}</div>
      </div>

      <div class="flashcard-container" id="flashcard" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <button class="btn-secondary" id="btn-speak-front"
              style="position:absolute; top:1rem; right:1rem; padding:0.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:2;">
              ${SPEAKER_ICON}
            </button>
            <h3 style="margin-bottom: 2rem; font-size: 1.5rem;">${q.question_nl}</h3>
            ${q.question_en ? `<p style="color:var(--text-muted); margin-bottom: 2rem;">${q.question_en}</p>` : ''}
            ${state.isExamMode ? `<p style="color:var(--danger); margin-bottom: 1rem;">Your Answer: ${q.userSelectedAnswer || 'None'}</p>` : ''}
            <p style="color:var(--text-muted)">Click to flip and see the answer.</p>
          </div>
          <div class="flashcard-back">
            <button class="btn-secondary" id="btn-speak-back"
              style="position:absolute; top:1rem; right:1rem; padding:0.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:2;">
              ${SPEAKER_ICON}
            </button>
            <h4 style="color:var(--success); margin-bottom: 0.5rem;">Correct Answer</h4>
            <h3 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Option ${q.correct_answer}</h3>
            <p>${q.explanation?.nl ?? ''}</p>
            <p style="color:var(--text-muted); margin-top: 1rem;">${q.explanation?.en ?? ''}</p>
          </div>
        </div>
      </div>

      <div class="quiz-footer">
        <button class="btn-secondary" id="btn-fc-prev" ${idx === 0 ? 'disabled' : ''}>Previous</button>
        <button class="btn-primary"   id="btn-fc-next">
          ${idx === total - 1 ? 'Finish Review' : 'Next Question'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-back-results').addEventListener('click', () => nav.results());
  document.getElementById('btn-fc-prev').addEventListener('click', () => {
    state.flashcardIndex--;
    renderSingleFlashcard();
  });
  document.getElementById('btn-fc-next').addEventListener('click', () => {
    state.flashcardIndex++;
    renderSingleFlashcard();
  });

  // Stop propagation so clicks on speaker don't flip card
  document.getElementById('btn-speak-front').addEventListener('click', e => {
    e.stopPropagation();
    speakDutch(q.question_nl);
  });
  document.getElementById('btn-speak-back').addEventListener('click', e => {
    e.stopPropagation();
    speakDutch(q.explanation?.nl ?? q.correct_answer);
  });
}
