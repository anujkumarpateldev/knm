import { state } from '../../state.js';
import { nav } from '../../router.js';
import { bindQuizEvents } from './quiz.events.js';
import { createAIButton } from '../../ai/aiUI.js';
import { quizHintContext } from '../../ai/aiPrompts.js';

const ICONS = {
  check:   `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  x:       `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  next:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  prev:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  done:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  speaker: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  eyeOn:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
};

export function renderQuestion() {
  if (state.isExamMode) {
    document.body.classList.remove('in-dashboard');
    document.body.classList.add('in-quiz');
  } else {
    document.body.classList.add('in-dashboard');
    document.body.classList.remove('in-quiz');
  }

  if (!state.currentModule?.questions?.length) {
    nav.landing();
    return;
  }
  if (state.currentQuestionIndex >= state.currentModule.questions.length) {
    nav.results();
    return;
  }

  state.hasAnsweredCurrent = false;
  const q      = state.currentModule.questions[state.currentQuestionIndex];
  const total  = state.currentModule.questions.length;
  const isLast = state.currentQuestionIndex === total - 1;

  document.getElementById('main-content').innerHTML = buildQuizHTML(q, total, isLast);

  bindQuizEvents(q, isLast, ICONS, renderQuestion);

  // AI hint button — practice mode only, only for logged-in users
  if (!state.isExamMode && state.currentUser) {
    const hintWrap = document.getElementById('ai-hint-wrap');
    if (hintWrap) {
      const hintBtn = createAIButton({
        label:      '💡 Hint',
        panelId:    'ai-hint-panel',
        panelTitle: 'AI Hint',
        getAICall:  () => ({ module: 'quiz', action: 'hint', context: quizHintContext(q) }),
        reusable:   false,
      });
      hintWrap.appendChild(hintBtn);
    }
  }
}

function buildQuizHTML(q, total, isLast) {
  const optionsHtml = buildOptionsHtml(q);
  const sourceHtml  = buildSourceHtml(q);
  const nextLabel   = isLast ? `Finish Section ${ICONS.done}` : `Next Question ${ICONS.next}`;
  const showNext    = state.isExamMode && q.userSelectedAnswer ? 'flex' : 'none';

  return `
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
            ${q.question_en ? `<p class="en-translation" style="color:var(--text-muted); display:none;">${q.question_en}</p>` : ''}
          </div>
          <div style="display:flex; flex-direction:row; gap:0.4rem; flex-shrink:0;">
            <button class="btn-secondary" id="btn-speak" title="Listen in Dutch"
              style="padding: 0.5rem; border-radius: 50%; display:flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
            <button class="btn-secondary" id="btn-toggle-en" title="Show/hide English translation"
              style="padding: 0.5rem; border-radius: 50%; display:flex; align-items:center; justify-content:center;">
              ${ICONS.eyeOn}
            </button>
          </div>
        </div>

        <div class="options-list" id="options-container">${optionsHtml}</div>

        ${!state.isExamMode && state.currentUser ? `
        <div id="ai-hint-wrap" style="margin-top:0.75rem;"></div>
        <div id="ai-hint-panel"></div>` : ''}

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
}

function buildOptionsHtml(q) {
  if ((q.type === 'multiple_choice' || q.type === 'reading_comprehension') && q.options) {
    return q.options.map(opt => {
      const sel = q.userSelectedAnswer === String(opt.id) ? 'selected' : '';
      return `
        <button class="option-btn ${sel}" data-answer-id="${opt.id}">
          <div class="option-letter">${opt.id}</div>
          <div class="option-text">${opt.text_nl}</div>
        </button>`;
    }).join('');
  }
  if (q.type === 'true_false') {
    return `
      <button class="option-btn ${q.userSelectedAnswer === 'true'  ? 'selected' : ''}" data-answer-id="true">
        <div class="option-letter">T</div><div class="option-text">Waar (True)</div>
      </button>
      <button class="option-btn ${q.userSelectedAnswer === 'false' ? 'selected' : ''}" data-answer-id="false">
        <div class="option-letter">F</div><div class="option-text">Niet waar (False)</div>
      </button>`;
  }
  return '';
}

function buildSourceHtml(q) {
  if (!q.source_text_nl) return '';
  return `
    <div class="source-text-box">
      <p class="source-text-label">Tekst / Text</p>
      <p>${q.source_text_nl}</p>
      ${q.source_text_en ? `<p class="source-text-en en-translation" style="display:none;">${q.source_text_en}</p>` : ''}
    </div>`;
}
