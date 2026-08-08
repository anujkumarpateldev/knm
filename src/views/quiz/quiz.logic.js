import { state } from '../../state.js';
import { saveToStorage, setProgress } from '../../storage.js';
import { createAIButton } from '../../ai/aiUI.js';
import { quizExplainContext } from '../../ai/aiPrompts.js';

// Inline the two feedback icons to avoid circular dependency with quiz.render.js
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_X     = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

export function handleAnswer(selectedBtn, correctAnswer, questionData) {
  // Exam mode: track selection only, no immediate feedback
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

  // Highlight correct / wrong options
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
  document.getElementById('feedback-icon').innerHTML    = isCorrect ? ICON_CHECK : ICON_X;
  document.getElementById('feedback-title').textContent = isCorrect ? 'Correct!' : 'Incorrect';

  if (questionData.explanation) {
    document.getElementById('feedback-nl').textContent = questionData.explanation.nl || '';
    document.getElementById('feedback-en').textContent = questionData.explanation.en || '';
  } else {
    document.getElementById('feedback-nl').textContent = `Correct answer: ${correctAnswer}`;
  }

  // Show source only for KNM-style questions (reading comprehension has its own text box)
  const sourceEl = document.getElementById('feedback-source');
  if (questionData.source_text_nl && !document.querySelector('.source-text-box')) {
    sourceEl.textContent = `Source: ${questionData.source_text_nl}`;
    sourceEl.style.display = 'block';
  }

  // AI "Explain in depth" button on wrong answers (practice mode, logged in)
  if (!isCorrect && !state.isExamMode && state.currentUser) {
    if (fp) {
      const aiWrap  = document.createElement('div');
      aiWrap.id     = 'ai-explain-wrap';
      aiWrap.style.cssText = 'margin-top:0.75rem;';
      const aiPanel = document.createElement('div');
      aiPanel.id    = 'ai-explain-panel';

      const explainBtn = createAIButton({
        label:      '🔍 Explain in depth',
        panelId:    'ai-explain-panel',
        panelTitle: 'AI Explanation',
        getAICall:  () => ({
          module:  'quiz',
          action:  'explain',
          context: quizExplainContext(questionData, selectedId),
        }),
        reusable: false,
      });

      aiWrap.appendChild(explainBtn);
      fp.appendChild(aiWrap);
      fp.appendChild(aiPanel);
    }
  }

  // Update session stats and persist progress
  const moduleId = state.currentModule.module_id;
  const domain   = moduleId.startsWith('rq_') ? 'rq' : 'knm';
  if (isCorrect) {
    state.sessionStats.correct++;
    setProgress(domain, moduleId, questionData.id, true);
    saveToStorage();
  } else {
    state.sessionStats.wrong++;
    if (!state.sessionWrongQuestions.find(q => q.id === questionData.id)) {
      state.sessionWrongQuestions.push(questionData);
    }
  }

  document.getElementById('btn-next').style.display = 'flex';
}
