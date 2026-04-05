import { state } from '../state.js';
import { nav } from '../router.js';
import { saveToStorage } from '../storage.js';
import { speakDutch } from '../speech.js';

const ICONS = {
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  x:     `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  next:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  prev:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  done:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  speaker: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
};

export function renderQuestion() {
  document.body.classList.remove('in-dashboard');
  document.body.classList.add('in-quiz');

  if (!state.currentModule?.questions || state.currentQuestionIndex >= state.currentModule.questions.length) {
    nav.results();
    return;
  }

  state.hasAnsweredCurrent = false;
  const q     = state.currentModule.questions[state.currentQuestionIndex];
  const total = state.currentModule.questions.length;
  const isLast = state.currentQuestionIndex === total - 1;

  // Build answer options
  let optionsHtml = '';
  if ((q.type === 'multiple_choice' || q.type === 'reading_comprehension') && q.options) {
    q.options.forEach(opt => {
      const sel = q.userSelectedAnswer === String(opt.id) ? 'selected' : '';
      optionsHtml += `
        <button class="option-btn ${sel}" data-answer-id="${opt.id}">
          <div class="option-letter">${opt.id}</div>
          <div class="option-text">${opt.text_nl}</div>
        </button>`;
    });
  } else if (q.type === 'true_false') {
    optionsHtml = `
      <button class="option-btn ${q.userSelectedAnswer === 'true'  ? 'selected' : ''}" data-answer-id="true">
        <div class="option-letter">T</div><div class="option-text">Waar (True)</div>
      </button>
      <button class="option-btn ${q.userSelectedAnswer === 'false' ? 'selected' : ''}" data-answer-id="false">
        <div class="option-letter">F</div><div class="option-text">Niet waar (False)</div>
      </button>`;
  }

  // Reading comprehension: show passage above the question
  const sourceHtml = q.source_text_nl ? `
    <div class="source-text-box">
      <p class="source-text-label">Tekst / Text</p>
      <p>${q.source_text_nl}</p>
      ${q.source_text_en ? `<p class="source-text-en">${q.source_text_en}</p>` : ''}
    </div>` : '';

  const nextLabel = isLast
    ? `Finish Section ${ICONS.done}`
    : `Next Question ${ICONS.next}`;
  const showNext = state.isExamMode && q.userSelectedAnswer ? 'flex' : 'none';

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="quiz-view">
      <div class="quiz-header">
        <button class="btn-back" id="btn-quit">${ICONS.prev} Quit</button>
        <div>
          <div class="quiz-progress-text">Question ${state.currentQuestionIndex + 1} of ${total}</div>
          ${!state.isExamMode ? `
            <div class="session-stats">
              <span style="color:var(--success)">Correct: ${state.sessionStats.correct}</span> |
              <span style="color:var(--danger)">Wrong: ${state.sessionStats.wrong}</span>
            </div>` : ''}
        </div>
      </div>

      <div class="quiz-container">
        <div class="question-tags">
          <span class="tag">${state.currentModule.module_id}</span>
          <span class="tag">${q.difficulty || 'A2'}</span>
          ${q.tags ? q.tags.map(t => `<span class="tag">${t}</span>`).join('') : ''}
        </div>

        ${sourceHtml}

        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2rem; gap: 1rem;">
          <div style="flex:1;">
            <h2 class="question-text" style="margin-bottom: 0.5rem;">${q.question_nl}</h2>
            ${q.question_en ? `<p style="color:var(--text-muted);">${q.question_en}</p>` : ''}
          </div>
          <button class="btn-secondary" id="btn-speak" title="Listen in Dutch"
            style="padding: 0.75rem; border-radius: 50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            ${ICONS.speaker}
          </button>
        </div>

        <div class="options-list" id="options-container">${optionsHtml}</div>

        <div id="feedback-panel" class="feedback-container">
          <div class="feedback-header">
            <span id="feedback-icon"></span>
            <span id="feedback-title"></span>
          </div>
          <p class="feedback-text" id="feedback-nl"></p>
          <p class="feedback-text" id="feedback-en" style="color:var(--text-muted)"></p>
          <div class="feedback-source" id="feedback-source" style="display:none"></div>
        </div>

        <div class="quiz-footer">
          <button class="btn-secondary" id="btn-prev" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>
            ${ICONS.prev} Previous
          </button>
          <button class="btn-secondary" id="btn-finish" style="margin-left:auto; margin-right: 1rem;">Finish Early</button>
          <button class="btn-primary"   id="btn-next"   style="display:${showNext}">${nextLabel}</button>
        </div>
      </div>
    </div>
  `;

  // Wire up events
  document.getElementById('btn-quit').addEventListener('click', () => {
    clearInterval(state.timerInterval);
    nav.landing();
  });
  document.getElementById('btn-finish').addEventListener('click', () => nav.results());
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (state.currentQuestionIndex > 0) { state.currentQuestionIndex--; renderQuestion(); }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (isLast) { nav.results(); } else { state.currentQuestionIndex++; renderQuestion(); }
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

function handleAnswer(selectedBtn, correctAnswer, questionData) {
  // Exam mode: just track selection, no immediate feedback
  if (state.isExamMode) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    selectedBtn.classList.add('selected');
    questionData.userSelectedAnswer = String(selectedBtn.getAttribute('data-answer-id'));
    document.getElementById('btn-next').style.display = 'flex';
    return;
  }

  if (state.hasAnsweredCurrent) return;
  state.hasAnsweredCurrent = true;

  const selectedId = selectedBtn.getAttribute('data-answer-id');
  const isCorrect  = String(selectedId).toLowerCase() === String(correctAnswer).toLowerCase();

  // Highlight correct/wrong options
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    const id = btn.getAttribute('data-answer-id');
    if (String(id).toLowerCase() === String(correctAnswer).toLowerCase()) btn.classList.add('correct');
    else if (btn === selectedBtn) btn.classList.add('wrong');
  });
  if (isCorrect) selectedBtn.classList.add('selected', 'correct');

  // Show feedback panel
  const fp = document.getElementById('feedback-panel');
  fp.classList.add('show', isCorrect ? 'correct' : 'wrong');
  document.getElementById('feedback-icon').innerHTML  = isCorrect ? ICONS.check : ICONS.x;
  document.getElementById('feedback-title').textContent = isCorrect ? 'Correct!' : 'Incorrect';

  if (questionData.explanation) {
    document.getElementById('feedback-nl').textContent = questionData.explanation.nl || '';
    document.getElementById('feedback-en').textContent = questionData.explanation.en || '';
  } else {
    document.getElementById('feedback-nl').textContent = `Correct answer: ${correctAnswer}`;
  }

  // Show source only for KNM-style questions (reading comprehension has its own text box at top)
  const sourceEl = document.getElementById('feedback-source');
  if (questionData.source_text_nl && !document.querySelector('.source-text-box')) {
    sourceEl.textContent = `Source: ${questionData.source_text_nl}`;
    sourceEl.style.display = 'block';
  }

  // Update session progress
  const moduleId = state.currentModule.module_id;
  if (isCorrect) {
    state.sessionStats.correct++;
    if (!state.userProgress[moduleId]) state.userProgress[moduleId] = {};
    state.userProgress[moduleId][questionData.id] = true;
    saveToStorage();
  } else {
    state.sessionStats.wrong++;
    if (!state.sessionWrongQuestions.find(q => q.id === questionData.id)) {
      state.sessionWrongQuestions.push(questionData);
    }
  }

  document.getElementById('btn-next').style.display = 'flex';
}
