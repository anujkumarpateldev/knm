// KNM StudyMode - Main Application Logic

const FILES = [
  'module_1_werk_en_inkomen.json',
  'module_2_omgangsvormen.json',
  'module_3_wonen (1).json',
  'module_4_gezondheid.json',
  'module_5_geschiedenis.json',
  'module_6_instanties.json',
  'module_7_staatsinrichting.json',
  'module_8_opvoeding.json'
];

let modulesData = [];
let currentModule = null;
let currentQuestionIndex = 0;
let userProgress = {}; // { [moduleId]: { [questionId]: boolean (true if answered correctly on first try) } }

let isExamMode = false;
let examTimeRemaining = 45 * 60;
let timerInterval = null;

let sessionStats = { correct: 0, wrong: 0 };
let sessionWrongQuestions = [];
let flashcardIndex = 0;

// DOM Elements
const appContent = document.getElementById('main-content');
const themeToggle = document.getElementById('theme-toggle');

// Initialize App
async function init() {
  loadProgress();
  setupTheme();
  
  const logoHome = document.getElementById('logo-home');
  if (logoHome) {
    logoHome.addEventListener('click', renderLandingPage);
  }
  
  try {
    await fetchModules();
    renderLandingPage();
  } catch (err) {
    appContent.innerHTML = `<div class="results-container">
      <h2 style="color:var(--danger)">Error Loading Data</h2>
      <p class="results-subtitle">${err.message}</p>
    </div>`;
  }
}

// Data Fetching
async function fetchModules() {
  const promises = FILES.map(file => 
    fetch(`/questions/${file}`).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
  );
  
  const results = await Promise.all(promises);
  // Sort by module ID naturally (M1, M2, M3...)
  modulesData = results.sort((a, b) => a.module_id.localeCompare(b.module_id, undefined, {numeric: true}));
}

// Progress Management
function loadProgress() {
  const saved = localStorage.getItem('knm_study_progress');
  if (saved) {
    try {
      userProgress = JSON.parse(saved);
    } catch (e) {
      userProgress = {};
    }
  }
}

function saveProgress() {
  localStorage.setItem('knm_study_progress', JSON.stringify(userProgress));
}

function getModuleProgress(moduleId) {
  if (!userProgress[moduleId]) return { completed: 0, total: 0 };
  const answeredIds = Object.keys(userProgress[moduleId]);
  return { completed: answeredIds.length };
}

// Theme Management
function setupTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    themeToggle.innerHTML = document.body.classList.contains('dark-theme') ? sunIcon : moonIcon;
  });
}

function renderLandingPage() {
  isExamMode = false;
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  document.getElementById('exam-timer').style.display = 'none';
  clearInterval(timerInterval);
  
  let html = `
    <div class="view active" id="landing-page">
      <div class="landing-container">
        <h1 class="landing-title">Welcome to KNM A2</h1>
        <p class="landing-subtitle">Prepare for your Dutch integration exam based on the Knowledge of Dutch Society curriculum.</p>
        <div class="landing-options">
          <div class="landing-card" id="btn-practice-mode">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </div>
            <h3>Practice by Section</h3>
            <p>Study specific topics at your own pace with instant feedback.</p>
          </div>
          <div class="landing-card" id="btn-exam-mode">
            <div class="landing-card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3>Take Full Exam</h3>
            <p>45 minutes, 40 questions. Real KNM exam simulation.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  appContent.innerHTML = html;
  
  document.getElementById('btn-practice-mode').addEventListener('click', renderDashboard);
  document.getElementById('btn-exam-mode').addEventListener('click', startExamMode);
}

function startExamMode() {
  isExamMode = true;
  examTimeRemaining = 45 * 60;
  sessionStats = { correct: 0, wrong: 0 };
  sessionWrongQuestions = [];
  
  let examQuestions = [];
  modulesData.forEach(mod => {
    if (mod.questions) {
      let shuffled = [...mod.questions].sort(() => 0.5 - Math.random());
      let selected = shuffled.slice(0, 5);
      examQuestions.push(...selected);
    }
  });
  
  examQuestions.sort(() => 0.5 - Math.random());
  
  currentModule = {
    module_id: 'EXAM',
    module_title_en: 'Full Practice Exam',
    module_title_nl: 'Oefenexamen',
    questions: examQuestions
  };
  
  userProgress['EXAM'] = {}; 
  currentQuestionIndex = 0;
  
  document.getElementById('exam-timer').style.display = 'block';
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    examTimeRemaining--;
    updateTimerDisplay();
    if (examTimeRemaining <= 0) {
      clearInterval(timerInterval);
      renderResults();
    }
  }, 1000);
  
  renderQuestion();
}

function updateTimerDisplay() {
  const m = Math.floor(examTimeRemaining / 60).toString().padStart(2, '0');
  const s = (examTimeRemaining % 60).toString().padStart(2, '0');
  document.getElementById('exam-timer').textContent = `${m}:${s}`;
}

function renderDashboard() {
  isExamMode = false;
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  document.getElementById('exam-timer').style.display = 'none';
  clearInterval(timerInterval);
  
  let html = `
    <div class="view active" id="dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Practice by Section</h1>
          <p>Select a module to test your knowledge.</p>
        </div>
        <button class="btn-secondary" id="btn-back-landing">Back to Home</button>
      </div>
      <div class="modules-grid">
  `;

  modulesData.forEach(mod => {
    const total = mod.questions ? mod.questions.length : mod.total_questions;
    const progress = getModuleProgress(mod.module_id);
    const completePercent = total > 0 ? Math.round((progress.completed / total) * 100) : 0;
    
    html += `
      <div class="module-card" data-module-id="${mod.module_id}">
        <h3>${mod.module_title_en}</h3>
        <p>${mod.module_title_nl}</p>
        <div class="module-progress-bar">
          <div class="module-progress-fill" style="width: ${completePercent}%"></div>
        </div>
        <div class="module-stats">
          <span>${progress.completed} / ${total} completed</span>
          <span>${completePercent}%</span>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;
  
  appContent.innerHTML = html;
  
  document.getElementById('btn-back-landing').addEventListener('click', renderLandingPage);
  document.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', () => {
      const modId = card.getAttribute('data-module-id');
      startQuiz(modId);
    });
  });
}

function startQuiz(moduleId) {
  currentModule = modulesData.find(m => m.module_id === moduleId);
  if (!userProgress[moduleId]) userProgress[moduleId] = {};
  
  // Find first uncompleted question, or start from 0 if all completed
  let firstUnanswered = 0;
  if (currentModule.questions) {
    for (let i = 0; i < currentModule.questions.length; i++) {
      if (userProgress[moduleId][currentModule.questions[i].id] === undefined) {
        firstUnanswered = i;
        break;
      }
    }
  }
  
  currentQuestionIndex = firstUnanswered;
  sessionStats = { correct: 0, wrong: 0 };
  sessionWrongQuestions = [];
  renderQuestion();
}

let hasAnsweredCurrent = false;

function renderQuestion() {
  document.body.classList.remove('in-dashboard');
  document.body.classList.add('in-quiz');
  if (!currentModule || !currentModule.questions || currentQuestionIndex >= currentModule.questions.length) {
    renderResults();
    return;
  }

  hasAnsweredCurrent = false;
  const q = currentModule.questions[currentQuestionIndex];
  const total = currentModule.questions.length;
  
  let optionsHtml = '';
  
  if (q.type === 'multiple_choice' && q.options) {
    q.options.forEach((opt) => {
      const isSel = q.userSelectedAnswer === String(opt.id) ? 'selected' : '';
      optionsHtml += `
        <button class="option-btn ${isSel}" data-answer-id="${opt.id}">
          <div class="option-letter">${opt.id}</div>
          <div class="option-text">${opt.text_nl}</div>
        </button>
      `;
    });
  } else if (q.type === 'true_false') {
    const isTrueSel = q.userSelectedAnswer === 'true' ? 'selected' : '';
    const isFalseSel = q.userSelectedAnswer === 'false' ? 'selected' : '';
    optionsHtml += `
      <button class="option-btn ${isTrueSel}" data-answer-id="true">
        <div class="option-letter">T</div>
        <div class="option-text">Waar (True)</div>
      </button>
      <button class="option-btn ${isFalseSel}" data-answer-id="false">
        <div class="option-letter">F</div>
        <div class="option-text">Niet waar (False)</div>
      </button>
    `;
  }

  let html = `
    <div class="view active" id="quiz-view">
      <div class="quiz-header">
        <button class="btn-back" id="btn-back-dash">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Home
        </button>
        <div>
          <div class="quiz-progress-text">Question ${currentQuestionIndex + 1} of ${total}</div>
          ${isExamMode ? '' : `<div class="session-stats">
            <span style="color:var(--success)">Correct: ${sessionStats.correct}</span> | 
            <span style="color:var(--danger)">Wrong: ${sessionStats.wrong}</span>
          </div>`}
        </div>
      </div>
      
      <div class="quiz-container">
        <div class="question-tags">
          <span class="tag">${currentModule.module_id}</span>
          <span class="tag">${q.difficulty || 'medium'}</span>
          ${q.tags ? q.tags.map(t => `<span class="tag">${t}</span>`).join('') : ''}
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2rem; gap: 1rem;">
          <div style="flex:1;">
            <h2 class="question-text" style="margin-bottom: 0.5rem;">${q.question_nl}</h2>
            ${q.question_en ? `<p style="color:var(--text-muted);">${q.question_en}</p>` : ''}
          </div>
          <button class="btn-secondary" id="btn-speak" title="Listen in Dutch" style="padding: 0.75rem; border-radius: 50%; display:flex; align-items:center; justify-content:center;">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </button>
        </div>
        
        <div class="options-list" id="options-container">
          ${optionsHtml}
        </div>
        
        <div id="feedback-panel" class="feedback-container">
          <div class="feedback-header">
            <span id="feedback-icon"></span>
            <span id="feedback-title"></span>
          </div>
          <p class="feedback-text" id="feedback-msg-nl"></p>
          <p class="feedback-text" id="feedback-msg-en" style="color:var(--text-muted)"></p>
          <div class="feedback-source" id="feedback-source" style="display:none"></div>
        </div>
        
        <div class="quiz-footer">
          <button class="btn-secondary" id="btn-prev" ${currentQuestionIndex === 0 ? 'disabled' : ''}>Previous Question</button>
          <button class="btn-secondary" id="btn-finish" style="margin-left:auto; margin-right: 1rem;">Finish Early</button>
          <button class="btn-primary" id="btn-next" style="display:${isExamMode && q.userSelectedAnswer ? 'flex' : 'none'}">
             Next Question <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  appContent.innerHTML = html;

  // Next Button State (Exam mode dynamic)
  const nextBtn = document.getElementById('btn-next');
  if (currentQuestionIndex === currentModule.questions.length - 1) {
    nextBtn.innerHTML = 'Finish Section <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  // Events
  document.getElementById('btn-back-dash').addEventListener('click', () => {
    clearInterval(timerInterval);
    renderLandingPage();
  });
  
  document.getElementById('btn-finish').addEventListener('click', renderResults);
  
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestion();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex >= currentModule.questions.length - 1) {
      renderResults();
    } else {
      currentQuestionIndex++;
      renderQuestion();
    }
  });

  const optionBtns = document.querySelectorAll('.option-btn');
  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn, q.correct_answer, q));
  });
  
  document.getElementById('btn-speak').addEventListener('click', () => {
    let readableText = q.question_nl + ". ";
    if (q.type === 'multiple_choice' && q.options) {
      q.options.forEach(opt => {
        readableText += opt.id + ". " + opt.text_nl + ". ";
      });
    } else if (q.type === 'true_false') {
      readableText += "Waar of Niet waar? ";
    }
    speakDutch(readableText);
  });
}

let lastSpokenText = "";

function speakDutch(text) {
  if (!('speechSynthesis' in window)) return;
  
  if (window.speechSynthesis.speaking && text === lastSpokenText) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }
    return;
  }
  
  window.speechSynthesis.cancel();
  lastSpokenText = text;
  
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'nl-NL';
  msg.rate = 0.9;
  
  msg.onend = () => {
    lastSpokenText = "";
  };
  
  const voices = window.speechSynthesis.getVoices();
  const dutchVoice = voices.find(v => v.lang.startsWith('nl'));
  if (dutchVoice) {
    msg.voice = dutchVoice;
  }
  
  window.speechSynthesis.speak(msg);
}

function handleAnswer(selectedBtn, correctAnswer, questionData) {
  if (isExamMode) {
    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    selectedBtn.classList.add('selected');
    questionData.userSelectedAnswer = String(selectedBtn.getAttribute('data-answer-id'));
    const nextBtn = document.getElementById('btn-next');
    nextBtn.style.display = 'flex';
    return;
  }

  if (hasAnsweredCurrent) return;
  hasAnsweredCurrent = true;
  
  const selectedId = selectedBtn.getAttribute('data-answer-id');
  const isCorrect = String(selectedId).toLowerCase() === String(correctAnswer).toLowerCase();
  
  // Update UI for all buttons
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    const btnId = btn.getAttribute('data-answer-id');
    if (String(btnId).toLowerCase() === String(correctAnswer).toLowerCase()) {
      btn.classList.add('correct');
    } else if (btn === selectedBtn) {
      btn.classList.add('wrong');
    }
  });

  if (isCorrect) {
    selectedBtn.classList.add('selected', 'correct');
  }
  
  // Show Feedback
  const fp = document.getElementById('feedback-panel');
  fp.classList.add('show', isCorrect ? 'correct' : 'wrong');
  
  const icon = isCorrect 
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    
  document.getElementById('feedback-icon').innerHTML = icon;
  document.getElementById('feedback-title').textContent = isCorrect ? 'Correct!' : 'Incorrect';
  
  if (questionData.explanation) {
    document.getElementById('feedback-msg-nl').textContent = questionData.explanation.nl || '';
    document.getElementById('feedback-msg-en').textContent = questionData.explanation.en || '';
  } else {
    document.getElementById('feedback-msg-nl').textContent = `The correct answer was: ${correctAnswer}`;
  }
  
  const sourceEl = document.getElementById('feedback-source');
  if (questionData.source_text_nl) {
    sourceEl.textContent = `Source info: ${questionData.source_text_nl}`;
    sourceEl.style.display = 'block';
  }

  // Save Progress
  if (isCorrect) {
    sessionStats.correct++;
    userProgress[currentModule.module_id][questionData.id] = true;
    saveProgress();
  } else {
    sessionStats.wrong++;
    if (!sessionWrongQuestions.find(q => q.id === questionData.id)) {
      sessionWrongQuestions.push(questionData);
    }
  }

  // Show Next Button
  const nextBtn = document.getElementById('btn-next');
  nextBtn.style.display = 'flex';
}

function renderResults() {
  document.body.classList.remove('in-dashboard');
  document.body.classList.remove('in-quiz');
  clearInterval(timerInterval);
  document.getElementById('exam-timer').style.display = 'none';

  if (isExamMode) {
    sessionStats.correct = 0;
    sessionStats.wrong = 0;
    sessionWrongQuestions = [];
    currentModule.questions.forEach(q => {
      if(q.userSelectedAnswer && String(q.userSelectedAnswer).toLowerCase() === String(q.correct_answer).toLowerCase()) {
         sessionStats.correct++;
      } else {
         sessionStats.wrong++;
         sessionWrongQuestions.push(q);
      }
    });
  }

  const modId = currentModule.module_id;
  const total = currentModule.questions.length;
  // If exam mode, rely only on session Stats. Else rely on progress for module stats
  const pc = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 100;
  
  let subtitleText = isExamMode 
     ? `You scored ${sessionStats.correct} out of ${total} on the Full Practice Exam.`
     : `You have correctly answered ${sessionStats.correct} out of ${total} questions this session.`;
     
  let passFailHtml = isExamMode ? `<h3 style="margin-top: 1rem; margin-bottom: 0.5rem; font-size: 1.5rem; color: ${pc >= 65 ? 'var(--success)' : 'var(--danger)'};">${pc >= 65 ? 'EXAM PASSED!' : 'EXAM FAILED'}</h3>` : '';

  let html = `
    <div class="view active" id="results-view">
      <div class="results-container">
        <div class="results-icon">
          ${isExamMode && pc < 65 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' 
            : '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'}
        </div>
        <h2>${isExamMode ? 'Exam Completed' : 'Module Completed!'}</h2>
        <div class="results-score" style="${isExamMode && pc < 65 ? 'color: var(--danger)' : ''}">${pc}%</div>
        ${passFailHtml}
        <p class="results-subtitle">${subtitleText}</p>
        
        <div class="results-actions" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <button class="btn-secondary" id="btn-results-dash">Return to Home</button>
            <button class="btn-primary" id="btn-results-retry">${isExamMode ? 'Take Another Exam' : 'Retry Module'}</button>
          </div>
          ${sessionWrongQuestions.length > 0 ? `<button class="btn-primary" id="btn-results-flashcards" style="background-color: var(--warning); color: #fff;">Review Wrong Answers (${sessionWrongQuestions.length})</button>` : ''}
        </div>
      </div>
    </div>
  `;
  
  appContent.innerHTML = html;
  
  document.getElementById('btn-results-dash').addEventListener('click', renderLandingPage);
  document.getElementById('btn-results-retry').addEventListener('click', () => {
    if (isExamMode) {
      startExamMode();
    } else {
      currentQuestionIndex = 0;
      sessionStats = { correct: 0, wrong: 0 };
      sessionWrongQuestions = [];
      renderQuestion();
    }
  });
  
  const btnFlashcards = document.getElementById('btn-results-flashcards');
  if (btnFlashcards) {
    btnFlashcards.addEventListener('click', startFlashcards);
  }
}

function startFlashcards() {
  document.body.classList.remove('in-dashboard');
  document.body.classList.add('in-quiz');
  flashcardIndex = 0;
  renderSingleFlashcard();
}

function renderSingleFlashcard() {
  if (flashcardIndex >= sessionWrongQuestions.length) {
    renderResults();
    return;
  }
  
  const q = sessionWrongQuestions[flashcardIndex];
  
  // Show user's actual selection safely, or say "None selected"
  const userAns = q.userSelectedAnswer || 'None';
  
  let html = `
    <div class="view active" id="flashcard-view">
      <div class="quiz-header">
        <button class="btn-back" id="btn-back-results">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Back to Results
        </button>
        <div>
          <div class="quiz-progress-text">Review ${flashcardIndex + 1} of ${sessionWrongQuestions.length}</div>
        </div>
      </div>
      
      <div class="flashcard-container" id="flashcard" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <button class="btn-secondary" id="btn-fc-speak" title="Listen in Dutch" style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem; border-radius: 50%; display:flex; align-items:center; justify-content:center; z-index: 2;" onclick="event.stopPropagation(); speakDutch('${q.question_nl.replace(/'/g, "\\'")}');">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
            <h3 style="margin-bottom: 2rem; font-size: 1.5rem;">${q.question_nl}</h3>
            ${q.question_en ? `<p style="color:var(--text-muted); margin-bottom: 2rem;">${q.question_en}</p>` : ''}
            ${isExamMode ? `<p style="color:var(--danger); margin-bottom: 1rem;">Your Answer: ${userAns}</p>` : ''}
            <p style="color:var(--text-muted)">Click to flip and see the answer.</p>
          </div>
          <div class="flashcard-back">
            <button class="btn-secondary" id="btn-fc-speak-back" title="Listen to Explanation" style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem; border-radius: 50%; display:flex; align-items:center; justify-content:center; z-index: 2;" onclick="event.stopPropagation(); speakDutch('${(q.explanation && q.explanation.nl) ? q.explanation.nl.replace(/'/g, "\\'") : ''}');">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
            <h4 style="color:var(--success); margin-bottom: 0.5rem;">Correct Answer</h4>
            <h3 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Option ${q.correct_answer}</h3>
            <p>${q.explanation ? q.explanation.nl : ''}</p>
            <p style="color:var(--text-muted); margin-top: 1rem;">${q.explanation ? q.explanation.en : ''}</p>
          </div>
        </div>
      </div>
      
      <div class="quiz-footer">
        <button class="btn-secondary" id="btn-fc-prev" ${flashcardIndex === 0 ? 'disabled' : ''}>Previous</button>
        <button class="btn-primary" id="btn-fc-next">${flashcardIndex === sessionWrongQuestions.length - 1 ? 'Finish Review' : 'Next Question'} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
      </div>
    </div>
  `;
  appContent.innerHTML = html;
  
  document.getElementById('btn-back-results').addEventListener('click', renderResults);
  document.getElementById('btn-fc-prev').addEventListener('click', () => { flashcardIndex--; renderSingleFlashcard(); });
  document.getElementById('btn-fc-next').addEventListener('click', () => { flashcardIndex++; renderSingleFlashcard(); });
}

// Start
document.addEventListener('DOMContentLoaded', init);
