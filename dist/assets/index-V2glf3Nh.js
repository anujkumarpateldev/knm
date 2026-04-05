(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={knmModules:[],readingVocab:[],readingQuestions:[],currentCategory:null,currentMode:null,currentModule:null,currentQuestionIndex:0,isExamMode:!1,hasAnsweredCurrent:!1,currentVocabSet:null,currentVocabIndex:0,sessionStats:{correct:0,wrong:0},sessionWrongQuestions:[],flashcardIndex:0,userProgress:{},activityHistory:[],examTimeRemaining:2700,timerInterval:null},t=`knm_study_progress`,n=`knm_activity_history`;function r(){try{let n=localStorage.getItem(t);n&&(e.userProgress=JSON.parse(n))}catch{e.userProgress={}}try{let t=localStorage.getItem(n);t&&(e.activityHistory=JSON.parse(t))}catch{e.activityHistory=[]}}function i(){localStorage.setItem(t,JSON.stringify(e.userProgress)),localStorage.setItem(n,JSON.stringify(e.activityHistory))}function a(){let e=document.getElementById(`theme-toggle`);e&&e.addEventListener(`click`,()=>{document.body.classList.toggle(`dark-theme`),e.innerHTML=document.body.classList.contains(`dark-theme`)?`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`})}var o={landing:()=>{},categorySelect:()=>{},progress:()=>{},knmDashboard:()=>{},exam:()=>{},readingDashboard:()=>{},vocabDashboard:()=>{},vocabCards:()=>{},readingQuizDashboard:()=>{},quiz:()=>{},results:()=>{},flashcards:()=>{}};function s(){e.isExamMode=!1,clearInterval(e.timerInterval),document.body.classList.add(`in-dashboard`),document.body.classList.remove(`in-quiz`);let t=document.getElementById(`exam-timer`);t&&(t.style.display=`none`),document.getElementById(`main-content`).innerHTML=`
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
            <p>45 minutes, 40 questions. Real exam simulation.</p>
          </div>
          <div class="landing-card" id="btn-progress">
            <div class="landing-card-icon" style="background-color: rgba(16, 185, 129, 0.1); color: var(--success);">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h3>Your Progress</h3>
            <p>View your latest activity and test results.</p>
          </div>
        </div>
      </div>
    </div>
  `,document.getElementById(`btn-practice-mode`).addEventListener(`click`,()=>o.categorySelect(`PRACTICE`)),document.getElementById(`btn-exam-mode`).addEventListener(`click`,()=>o.categorySelect(`EXAM`)),document.getElementById(`btn-progress`).addEventListener(`click`,()=>o.progress())}var c=[{id:`KNM`,label:`KNM`,subtitle:`Kennis van de Nederlandse Maatschappij`,available:!0,supportsPractice:!0,supportsExam:!0,icon:`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`},{id:`READING`,label:`Reading (Lezen)`,subtitle:`Vocabulary & reading comprehension`,available:!0,supportsPractice:!0,supportsExam:!1,icon:`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`},{id:`LISTENING`,label:`Listening (Luisteren)`,subtitle:`Coming soon`,available:!1,supportsPractice:!1,supportsExam:!1,icon:`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`},{id:`WRITING`,label:`Writing (Schrijven)`,subtitle:`Coming soon`,available:!1,supportsPractice:!1,supportsExam:!1,icon:`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`},{id:`SPEAKING`,label:`Speaking (Spreken)`,subtitle:`Coming soon`,available:!1,supportsPractice:!1,supportsExam:!1,icon:`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`}];function l(t){e.currentMode=t;let n=c.map(e=>{let n=t===`EXAM`?e.supportsExam:e.supportsPractice,r=!e.available||!n,i=e.available?t===`EXAM`&&!e.supportsExam?`No exam mode`:e.subtitle:`Coming soon`;return`
      <div class="landing-card category-card ${r?`disabled`:``}" data-cat-id="${e.id}">
        <div class="landing-card-icon">${e.icon}</div>
        <h3>${e.label}</h3>
        <p>${i}</p>
      </div>`}).join(``);document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="category-select">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>${t===`EXAM`?`Take Full Exam`:`Practice by Section`}</h1>
          <p>Select a category to begin.</p>
        </div>
        <button class="btn-secondary" id="btn-back-landing">Back to Home</button>
      </div>
      <div class="modules-grid">${n}</div>
    </div>
  `,document.getElementById(`btn-back-landing`).addEventListener(`click`,()=>o.landing()),document.querySelectorAll(`.category-card:not(.disabled)`).forEach(n=>{n.addEventListener(`click`,()=>{let r=n.getAttribute(`data-cat-id`);e.currentCategory=r,r===`KNM`?t===`EXAM`?o.exam():o.knmDashboard():r===`READING`&&o.readingDashboard()})})}function u(){let t=[...e.activityHistory].sort((e,t)=>t.timestamp-e.timestamp),n=t.length===0?`<div style="text-align:center; padding: 4rem; color: var(--text-muted);">No activity recorded yet. Try taking an exam or practising a module!</div>`:t.map(e=>{let t=new Date(e.timestamp).toLocaleString(),n=e.mode===`Exam`&&e.passed===!1?`score-fail`:`score-pass`;return`
          <div class="progress-item">
            <div class="progress-item-details">
              <h4>${e.title} <span class="tag" style="margin-left: 0.5rem;">${e.mode}</span></h4>
              <p>${t}</p>
            </div>
            <div class="progress-item-score ${n}">${e.score}%</div>
          </div>`}).join(``);document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="progress-view">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Activity History</h1>
          <p>Your recent module practice and exam results.</p>
        </div>
        <button class="btn-secondary" id="btn-back-home">Back to Home</button>
      </div>
      <div class="progress-list">${n}</div>
    </div>
  `,document.getElementById(`btn-back-home`).addEventListener(`click`,()=>o.landing())}var d=``;function f(e){if(!(`speechSynthesis`in window))return;if(window.speechSynthesis.speaking&&e===d){window.speechSynthesis.paused?window.speechSynthesis.resume():window.speechSynthesis.pause();return}window.speechSynthesis.cancel(),d=e;let t=new SpeechSynthesisUtterance(e);t.lang=`nl-NL`,t.rate=.9,t.onend=()=>{d=``};let n=window.speechSynthesis.getVoices().find(e=>e.lang.startsWith(`nl`));n&&(t.voice=n),window.speechSynthesis.speak(t)}var p={check:`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,x:`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,next:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,prev:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,done:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,speaker:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`};function m(){if(document.body.classList.remove(`in-dashboard`),document.body.classList.add(`in-quiz`),!e.currentModule?.questions||e.currentQuestionIndex>=e.currentModule.questions.length){o.results();return}e.hasAnsweredCurrent=!1;let t=e.currentModule.questions[e.currentQuestionIndex],n=e.currentModule.questions.length,r=e.currentQuestionIndex===n-1,i=``;t.type===`multiple_choice`&&t.options?t.options.forEach(e=>{let n=t.userSelectedAnswer===String(e.id)?`selected`:``;i+=`
        <button class="option-btn ${n}" data-answer-id="${e.id}">
          <div class="option-letter">${e.id}</div>
          <div class="option-text">${e.text_nl}</div>
        </button>`}):t.type===`true_false`&&(i=`
      <button class="option-btn ${t.userSelectedAnswer===`true`?`selected`:``}" data-answer-id="true">
        <div class="option-letter">T</div><div class="option-text">Waar (True)</div>
      </button>
      <button class="option-btn ${t.userSelectedAnswer===`false`?`selected`:``}" data-answer-id="false">
        <div class="option-letter">F</div><div class="option-text">Niet waar (False)</div>
      </button>`);let a=t.source_text_nl?`
    <div class="source-text-box">
      <p class="source-text-label">Tekst / Text</p>
      <p>${t.source_text_nl}</p>
      ${t.source_text_en?`<p class="source-text-en">${t.source_text_en}</p>`:``}
    </div>`:``,s=r?`Finish Section ${p.done}`:`Next Question ${p.next}`,c=e.isExamMode&&t.userSelectedAnswer?`flex`:`none`;document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="quiz-view">
      <div class="quiz-header">
        <button class="btn-back" id="btn-quit">${p.prev} Quit</button>
        <div>
          <div class="quiz-progress-text">Question ${e.currentQuestionIndex+1} of ${n}</div>
          ${e.isExamMode?``:`
            <div class="session-stats">
              <span style="color:var(--success)">Correct: ${e.sessionStats.correct}</span> |
              <span style="color:var(--danger)">Wrong: ${e.sessionStats.wrong}</span>
            </div>`}
        </div>
      </div>

      <div class="quiz-container">
        <div class="question-tags">
          <span class="tag">${e.currentModule.module_id}</span>
          <span class="tag">${t.difficulty||`A2`}</span>
          ${t.tags?t.tags.map(e=>`<span class="tag">${e}</span>`).join(``):``}
        </div>

        ${a}

        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2rem; gap: 1rem;">
          <div style="flex:1;">
            <h2 class="question-text" style="margin-bottom: 0.5rem;">${t.question_nl}</h2>
            ${t.question_en?`<p style="color:var(--text-muted);">${t.question_en}</p>`:``}
          </div>
          <button class="btn-secondary" id="btn-speak" title="Listen in Dutch"
            style="padding: 0.75rem; border-radius: 50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            ${p.speaker}
          </button>
        </div>

        <div class="options-list" id="options-container">${i}</div>

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
          <button class="btn-secondary" id="btn-prev" ${e.currentQuestionIndex===0?`disabled`:``}>
            ${p.prev} Previous
          </button>
          <button class="btn-secondary" id="btn-finish" style="margin-left:auto; margin-right: 1rem;">Finish Early</button>
          <button class="btn-primary"   id="btn-next"   style="display:${c}">${s}</button>
        </div>
      </div>
    </div>
  `,document.getElementById(`btn-quit`).addEventListener(`click`,()=>{clearInterval(e.timerInterval),o.landing()}),document.getElementById(`btn-finish`).addEventListener(`click`,()=>o.results()),document.getElementById(`btn-prev`).addEventListener(`click`,()=>{e.currentQuestionIndex>0&&(e.currentQuestionIndex--,m())}),document.getElementById(`btn-next`).addEventListener(`click`,()=>{r?o.results():(e.currentQuestionIndex++,m())}),document.getElementById(`btn-speak`).addEventListener(`click`,()=>{let e=t.question_nl+`. `;t.type===`multiple_choice`&&t.options?t.options.forEach(t=>{e+=`${t.id}. ${t.text_nl}. `}):t.type===`true_false`&&(e+=`Waar of Niet waar?`),f(e)}),document.querySelectorAll(`.option-btn`).forEach(e=>{e.addEventListener(`click`,()=>h(e,t.correct_answer,t))})}function h(t,n,r){if(e.isExamMode){document.querySelectorAll(`.option-btn`).forEach(e=>e.classList.remove(`selected`)),t.classList.add(`selected`),r.userSelectedAnswer=String(t.getAttribute(`data-answer-id`)),document.getElementById(`btn-next`).style.display=`flex`;return}if(e.hasAnsweredCurrent)return;e.hasAnsweredCurrent=!0;let a=t.getAttribute(`data-answer-id`),o=String(a).toLowerCase()===String(n).toLowerCase();document.querySelectorAll(`.option-btn`).forEach(e=>{e.disabled=!0;let r=e.getAttribute(`data-answer-id`);String(r).toLowerCase()===String(n).toLowerCase()?e.classList.add(`correct`):e===t&&e.classList.add(`wrong`)}),o&&t.classList.add(`selected`,`correct`),document.getElementById(`feedback-panel`).classList.add(`show`,o?`correct`:`wrong`),document.getElementById(`feedback-icon`).innerHTML=o?p.check:p.x,document.getElementById(`feedback-title`).textContent=o?`Correct!`:`Incorrect`,r.explanation?(document.getElementById(`feedback-nl`).textContent=r.explanation.nl||``,document.getElementById(`feedback-en`).textContent=r.explanation.en||``):document.getElementById(`feedback-nl`).textContent=`Correct answer: ${n}`;let s=document.getElementById(`feedback-source`);r.source_text_nl&&!document.querySelector(`.source-text-box`)&&(s.textContent=`Source: ${r.source_text_nl}`,s.style.display=`block`);let c=e.currentModule.module_id;o?(e.sessionStats.correct++,e.userProgress[c]||(e.userProgress[c]={}),e.userProgress[c][r.id]=!0,i()):(e.sessionStats.wrong++,e.sessionWrongQuestions.find(e=>e.id===r.id)||e.sessionWrongQuestions.push(r)),document.getElementById(`btn-next`).style.display=`flex`}function g(){document.body.classList.remove(`in-dashboard`,`in-quiz`),clearInterval(e.timerInterval);let t=document.getElementById(`exam-timer`);t&&(t.style.display=`none`),e.isExamMode&&(e.sessionStats={correct:0,wrong:0},e.sessionWrongQuestions=[],e.currentModule.questions.forEach(t=>{t.userSelectedAnswer&&String(t.userSelectedAnswer).toLowerCase()===String(t.correct_answer).toLowerCase()?e.sessionStats.correct++:(e.sessionStats.wrong++,e.sessionWrongQuestions.push(t))}));let n=e.currentModule.questions.length,r=n>0?Math.round(e.sessionStats.correct/n*100):100,a=e.isExamMode?r>=65:null;(e.sessionStats.correct>0||e.sessionStats.wrong>0)&&(e.activityHistory.push({mode:e.isExamMode?`Exam`:`Practice`,title:e.currentModule.module_title_en,score:r,timestamp:Date.now(),passed:a}),i());let s=`var(--danger)`,c=e.isExamMode&&!a?`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="${s}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`:`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,l=e.isExamMode?`<h3 style="margin-top: 1rem; font-size: 1.5rem; color: ${a?`var(--success)`:s};">${a?`EXAM PASSED!`:`EXAM FAILED`}</h3>`:``,u=e.isExamMode?`You scored ${e.sessionStats.correct} out of ${n} on the Full Practice Exam.`:`You correctly answered ${e.sessionStats.correct} out of ${n} questions in ${e.currentModule.module_title_en}.`,d=e.sessionWrongQuestions.length>0?`<button class="btn-primary" id="btn-flashcards" style="background-color: var(--warning); color: #fff;">
        Review Wrong Answers (${e.sessionWrongQuestions.length})
       </button>`:``;document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="results-view">
      <div class="results-container">
        <div class="results-icon">${c}</div>
        <h2>${e.isExamMode?`Exam Completed`:`Module Completed!`}</h2>
        <div class="results-score" style="${e.isExamMode&&!a?`color:${s}`:``}">${r}%</div>
        ${l}
        <p class="results-subtitle">${u}</p>
        <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <button class="btn-secondary" id="btn-home">Return to Home</button>
            <button class="btn-primary"   id="btn-retry">${e.isExamMode?`Take Another Exam`:`Retry Module`}</button>
          </div>
          ${d}
        </div>
      </div>
    </div>
  `,document.getElementById(`btn-home`).addEventListener(`click`,()=>o.landing()),document.getElementById(`btn-retry`).addEventListener(`click`,()=>{e.isExamMode?o.exam():(e.currentQuestionIndex=0,e.sessionStats={correct:0,wrong:0},e.sessionWrongQuestions=[],o.quiz())}),document.getElementById(`btn-flashcards`)?.addEventListener(`click`,()=>o.flashcards())}var _=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;function v(){document.body.classList.remove(`in-dashboard`),document.body.classList.add(`in-quiz`),e.flashcardIndex=0,y()}function y(){if(e.flashcardIndex>=e.sessionWrongQuestions.length){o.results();return}let t=e.sessionWrongQuestions[e.flashcardIndex],n=e.flashcardIndex,r=e.sessionWrongQuestions.length;document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="flashcard-view">
      <div class="quiz-header">
        <button class="btn-back" id="btn-back-results">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Back to Results
        </button>
        <div class="quiz-progress-text">Review ${n+1} of ${r}</div>
      </div>

      <div class="flashcard-container" id="flashcard" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <button class="btn-secondary" id="btn-speak-front"
              style="position:absolute; top:1rem; right:1rem; padding:0.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:2;">
              ${_}
            </button>
            <h3 style="margin-bottom: 2rem; font-size: 1.5rem;">${t.question_nl}</h3>
            ${t.question_en?`<p style="color:var(--text-muted); margin-bottom: 2rem;">${t.question_en}</p>`:``}
            ${e.isExamMode?`<p style="color:var(--danger); margin-bottom: 1rem;">Your Answer: ${t.userSelectedAnswer||`None`}</p>`:``}
            <p style="color:var(--text-muted)">Click to flip and see the answer.</p>
          </div>
          <div class="flashcard-back">
            <button class="btn-secondary" id="btn-speak-back"
              style="position:absolute; top:1rem; right:1rem; padding:0.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:2;">
              ${_}
            </button>
            <h4 style="color:var(--success); margin-bottom: 0.5rem;">Correct Answer</h4>
            <h3 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Option ${t.correct_answer}</h3>
            <p>${t.explanation?.nl??``}</p>
            <p style="color:var(--text-muted); margin-top: 1rem;">${t.explanation?.en??``}</p>
          </div>
        </div>
      </div>

      <div class="quiz-footer">
        <button class="btn-secondary" id="btn-fc-prev" ${n===0?`disabled`:``}>Previous</button>
        <button class="btn-primary"   id="btn-fc-next">
          ${n===r-1?`Finish Review`:`Next Question`}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  `,document.getElementById(`btn-back-results`).addEventListener(`click`,()=>o.results()),document.getElementById(`btn-fc-prev`).addEventListener(`click`,()=>{e.flashcardIndex--,y()}),document.getElementById(`btn-fc-next`).addEventListener(`click`,()=>{e.flashcardIndex++,y()}),document.getElementById(`btn-speak-front`).addEventListener(`click`,e=>{e.stopPropagation(),f(t.question_nl)}),document.getElementById(`btn-speak-back`).addEventListener(`click`,e=>{e.stopPropagation(),f(t.explanation?.nl??t.correct_answer)})}var b=[`module_1_werk_en_inkomen.json`,`module_2_omgangsvormen.json`,`module_3_wonen (1).json`,`module_4_gezondheid.json`,`module_5_geschiedenis.json`,`module_6_instanties.json`,`module_7_staatsinrichting.json`,`module_8_opvoeding.json`];async function x(){e.knmModules=(await Promise.all(b.map(async e=>{let t=await fetch(`/questions/${e}`);if(!t.ok)throw Error(`KNM fetch failed (${t.status}): ${e}`);let n=await t.text();try{return JSON.parse(n)}catch(t){throw Error(`KNM JSON parse failed for ${e}: ${t.message} | starts with: ${n.slice(0,60)}`)}}))).sort((e,t)=>e.module_id.localeCompare(t.module_id,void 0,{numeric:!0}))}function S(t){let n=e.userProgress[t];return n?{completed:Object.keys(n).length}:{completed:0}}function C(){e.isExamMode=!1;let t=e.knmModules.map(e=>{let t=e.questions?e.questions.length:e.total_questions||0,{completed:n}=S(e.module_id),r=t>0?Math.round(n/t*100):0;return`
      <div class="module-card" data-module-id="${e.module_id}">
        <h3>${e.module_title_en}</h3>
        <p>${e.module_title_nl}</p>
        <div class="module-progress-bar">
          <div class="module-progress-fill" style="width: ${r}%"></div>
        </div>
        <div class="module-stats">
          <span>${n} / ${t} completed</span>
          <span>${r}%</span>
        </div>
      </div>`}).join(``);document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>KNM Practice</h1>
          <p>Select a module to test your knowledge.</p>
        </div>
        <button class="btn-secondary" id="btn-back-categories">Change Category</button>
      </div>
      <div class="modules-grid">${t}</div>
    </div>
  `,document.getElementById(`btn-back-categories`).addEventListener(`click`,()=>o.categorySelect(`PRACTICE`)),document.querySelectorAll(`.module-card`).forEach(e=>{e.addEventListener(`click`,()=>w(e.getAttribute(`data-module-id`)))})}function w(t){e.currentModule=e.knmModules.find(e=>e.module_id===t),e.userProgress[t]||(e.userProgress[t]={});let n=0;if(e.currentModule.questions){for(let r=0;r<e.currentModule.questions.length;r++)if(e.userProgress[t][e.currentModule.questions[r].id]===void 0){n=r;break}}e.currentQuestionIndex=n,e.sessionStats={correct:0,wrong:0},e.sessionWrongQuestions=[],e.isExamMode=!1,o.quiz()}function T(){e.isExamMode=!0,e.examTimeRemaining=2700,e.sessionStats={correct:0,wrong:0},e.sessionWrongQuestions=[];let t=[];e.knmModules.forEach(e=>{if(e.questions){let n=[...e.questions].sort(()=>.5-Math.random());t.push(...n.slice(0,5))}}),t.sort(()=>.5-Math.random()),e.currentModule={module_id:`EXAM`,module_title_en:`KNM Full Practice Exam`,module_title_nl:`Oefenexamen KNM`,questions:t},e.userProgress.EXAM={},e.currentQuestionIndex=0;let n=document.getElementById(`exam-timer`);n&&(n.style.display=`block`,E()),clearInterval(e.timerInterval),e.timerInterval=setInterval(()=>{e.examTimeRemaining--,E(),e.examTimeRemaining<=0&&(clearInterval(e.timerInterval),o.results())},1e3),o.quiz()}function E(){let t=document.getElementById(`exam-timer`);t&&(t.textContent=`${Math.floor(e.examTimeRemaining/60).toString().padStart(2,`0`)}:${(e.examTimeRemaining%60).toString().padStart(2,`0`)}`)}var D=[{file:`dailyroutine.json`,id:`daily_routine`,title_en:`Daily Routine`,title_nl:`Dagelijkse Routine`},{file:`education.json`,id:`education`,title_en:`Education`,title_nl:`Onderwijs`},{file:`food_drink.json`,id:`food_drink`,title_en:`Food & Drink`,title_nl:`Eten & Drinken`},{file:`government_rules.json`,id:`government`,title_en:`Government & Rules`,title_nl:`Overheid & Regels`},{file:`health_body.json`,id:`health`,title_en:`Health & Body`,title_nl:`Gezondheid & Lichaam`},{file:`home.json`,id:`home`,title_en:`Home`,title_nl:`Thuis`},{file:`leisure.json`,id:`leisure`,title_en:`Leisure`,title_nl:`Vrije Tijd`},{file:`neighbourhood.json`,id:`neighbourhood`,title_en:`Neighbourhood`,title_nl:`Buurt & Omgeving`},{file:`shopping_money.json`,id:`shopping`,title_en:`Shopping & Money`,title_nl:`Winkelen & Geld`},{file:`travel_transaport.json`,id:`travel`,title_en:`Travel & Transport`,title_nl:`Reizen & Vervoer`},{file:`workjob.json`,id:`work`,title_en:`Work & Jobs`,title_nl:`Werk & Banen`}],O=[{file:`dailyroutine.json`,id:`rq_daily`,title_en:`Daily Routine`,title_nl:`Dagelijkse Routine`},{file:`education.json`,id:`rq_education`,title_en:`Education`,title_nl:`Onderwijs`},{file:`food_drink.json`,id:`rq_food`,title_en:`Food & Drink`,title_nl:`Eten & Drinken`},{file:`government_rules.json`,id:`rq_government`,title_en:`Government & Rules`,title_nl:`Overheid & Regels`},{file:`health_body.json`,id:`rq_health`,title_en:`Health & Body`,title_nl:`Gezondheid & Lichaam`},{file:`home.json`,id:`rq_home`,title_en:`Home`,title_nl:`Thuis`},{file:`leisure.json`,id:`rq_leisure`,title_en:`Leisure`,title_nl:`Vrije Tijd`},{file:`travel_transaport.json`,id:`rq_travel`,title_en:`Travel & Transport`,title_nl:`Reizen & Vervoer`},{file:`workjob.json`,id:`rq_work`,title_en:`Work & Jobs`,title_nl:`Werk & Banen`}];async function k(e,t){let n=await fetch(e);if(!n.ok)throw Error(`Fetch failed (${n.status}): ${t}`);let r=await n.text();try{return JSON.parse(r)}catch(e){throw Error(`JSON parse error for ${t}: ${e.message}`)}}async function A(){let[t,n]=await Promise.all([Promise.all(D.map(async e=>{let t=await k(`/reading/vocab/${e.file}`,e.file);return{...e,vocabulary_list:t.vocabulary_list||[]}})),Promise.all(O.map(async e=>{let t=await k(`/reading/questions/${e.file}`,e.file);return{module_id:e.id,module_title_en:e.title_en,module_title_nl:e.title_nl,questions:(t.questions||[]).map(e=>({...e,_readingQuiz:!0}))}}))]);e.readingVocab=t,e.readingQuestions=n.filter(e=>e.questions.length>0)}function j(t){let n=e.userProgress[`READING:vocab:${t}`];return n?Object.values(n).filter(Boolean).length:0}function M(t){let n=e.userProgress[t];return n?{completed:Object.keys(n).length}:{completed:0}}function N(){document.body.classList.add(`in-dashboard`),document.body.classList.remove(`in-quiz`);let t=e.readingVocab.length;document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="reading-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Reading Practice</h1>
          <p>Choose a study mode to improve your Dutch reading skills.</p>
        </div>
        <button class="btn-secondary" id="btn-back-categories">Change Category</button>
      </div>

      <div class="reading-modes-grid">
        <div class="module-card reading-mode-card" id="btn-vocab">
          <div class="reading-mode-icon">📖</div>
          <h3>Vocabulary</h3>
          <p class="reading-mode-subtitle">Woordenschat</p>
          <p style="color: var(--text-muted); margin-top: 0.75rem; font-size: 0.9rem;">
            Learn Dutch words with meanings and example sentences.
          </p>
          <div style="margin-top: 1rem;">
            <span class="tag">${t} topics</span>
            <span class="tag" style="margin-left: 0.5rem;">~100 words each</span>
          </div>
        </div>

        <div class="module-card reading-mode-card" id="btn-reading-quiz" style="cursor:pointer;">
          <div class="reading-mode-icon">📝</div>
          <h3>Reading Quiz</h3>
          <p class="reading-mode-subtitle">Leesbegrip</p>
          <p style="color: var(--text-muted); margin-top: 0.75rem; font-size: 0.9rem;">
            Answer comprehension questions based on Dutch texts.
          </p>
          <div style="margin-top: 1rem;">
            <span class="tag">${e.readingQuestions.length} topics</span>
            <span class="tag" style="margin-left: 0.5rem;">~20 questions each</span>
          </div>
        </div>
      </div>
    </div>
  `,document.getElementById(`btn-back-categories`).addEventListener(`click`,()=>o.categorySelect(`PRACTICE`)),document.getElementById(`btn-vocab`).addEventListener(`click`,()=>o.vocabDashboard()),document.getElementById(`btn-reading-quiz`).addEventListener(`click`,()=>o.readingQuizDashboard())}var P={Profession:`#6366f1`,Place:`#10b981`,Object:`#f59e0b`,Verb:`#8b5cf6`,Adjective:`#06b6d4`,Abstract:`#f43f5e`};function F(e){return`READING:vocab:${e}`}var I=new Set;function L(){document.body.classList.add(`in-dashboard`),document.body.classList.remove(`in-quiz`),I=new Set;let t=e.readingVocab.map(e=>{let t=e.vocabulary_list?.length??0,n=j(e.id),r=t>0?Math.round(n/t*100):0;return`
      <div class="module-card" data-vocab-id="${e.id}" style="cursor:pointer;">
        <h3>${e.title_en}</h3>
        <p>${e.title_nl}</p>
        <div class="module-progress-bar" style="margin-top: 1rem;">
          <div class="module-progress-fill" style="width: ${r}%"></div>
        </div>
        <div class="module-stats">
          <span>${n} / ${t} learned</span>
          <span>${r}%</span>
        </div>
      </div>`}).join(``);document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="vocab-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Vocabulary Topics</h1>
          <p>Select a topic to start learning Dutch words.</p>
        </div>
        <button class="btn-secondary" id="btn-back-reading">Back to Reading</button>
      </div>
      <div class="modules-grid">${t}</div>
    </div>
  `,document.getElementById(`btn-back-reading`).addEventListener(`click`,()=>o.readingDashboard()),document.querySelectorAll(`[data-vocab-id]`).forEach(t=>{t.addEventListener(`click`,()=>{let n=t.getAttribute(`data-vocab-id`);e.currentVocabSet=e.readingVocab.find(e=>e.id===n),e.currentVocabIndex=0,I=new Set,o.vocabCards()})})}function R(){let t=e.currentVocabSet.vocabulary_list;F(e.currentVocabSet.id),I.size;let n=t.length,r=n>0?Math.round(j(e.currentVocabSet.id)/n*100):0;e.activityHistory.push({mode:`Practice`,title:`Vocabulary – ${e.currentVocabSet.title_en}`,score:r,timestamp:Date.now(),passed:null}),i();let a=[...I].sort((e,t)=>e-t).map(e=>t[e]),s=a.length===0?`<p style="color:var(--text-muted); text-align:center; padding: 1.5rem 0;">No words marked as learned this session.</p>`:a.map(e=>{let t=P[e.type]||`var(--text-muted)`;return`
          <div class="session-word-row">
            <span class="vocab-type-badge" style="background:${t}22; color:${t}; border:1px solid ${t}44; flex-shrink:0;">
              ${e.type||`Word`}
            </span>
            <span class="session-word-nl">${e.dutch_word}</span>
            <span class="session-word-en">${e.english_word}</span>
          </div>`}).join(``),c=document.createElement(`div`);c.className=`session-modal-overlay`,c.innerHTML=`
    <div class="session-modal">
      <div class="session-modal-header">
        <div>
          <h2>Session Complete</h2>
          <p style="color:var(--text-muted); margin-top:0.25rem;">${e.currentVocabSet.title_en}</p>
        </div>
        <div class="session-modal-badge">
          <span style="font-size:2rem; font-weight:800; color:var(--success);">${a.length}</span>
          <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-top:-4px;">learned</span>
        </div>
      </div>

      ${a.length>0?`
        <p style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin-bottom:0.75rem;">
          Words learned this session
        </p>
        <div class="session-word-list">${s}</div>
      `:s}

      <div style="display:flex; gap:1rem; margin-top:1.5rem; justify-content:center; flex-wrap:wrap;">
        <button class="btn-secondary" id="modal-btn-back">Back to Topics</button>
        <button class="btn-primary"   id="modal-btn-continue">Continue Studying</button>
      </div>
    </div>
  `,document.body.appendChild(c),document.getElementById(`modal-btn-back`).addEventListener(`click`,()=>{c.remove(),o.vocabDashboard()}),document.getElementById(`modal-btn-continue`).addEventListener(`click`,()=>{c.remove(),e.currentVocabIndex=0,I=new Set,z()})}function z(){if(!e.currentVocabSet?.vocabulary_list?.length){o.vocabDashboard();return}document.body.classList.remove(`in-dashboard`),document.body.classList.add(`in-quiz`);let t=e.currentVocabSet.vocabulary_list,n=e.currentVocabIndex,r=t[n],a=t.length,s=F(e.currentVocabSet.id),c=!!e.userProgress[s]?.[`w${n}`],l=j(e.currentVocabSet.id),u=P[r.type]||`var(--text-muted)`,d=Math.round(n/a*100);document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="vocab-cards">
      <div class="quiz-header">
        <button class="btn-back" id="btn-back-vocab">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          ${e.currentVocabSet.title_en}
        </button>
        <div style="text-align:right;">
          <div class="quiz-progress-text">Word ${n+1} of ${a}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${l} learned</div>
        </div>
      </div>

      <div style="max-width: 600px; margin: 0 auto; padding: 0 1rem 2rem;">

        <div class="module-progress-bar" style="margin-bottom: 1.5rem; height: 4px; border-radius: 2px;">
          <div class="module-progress-fill" style="width: ${d}%; transition: width 0.3s ease;"></div>
        </div>

        <div class="flashcard-container vocab-flashcard" id="vocab-card"
             onclick="this.classList.toggle('flipped')">
          <div class="flashcard-inner">

            <div class="flashcard-front vocab-face">
              <span class="vocab-type-badge" style="background:${u}22; color:${u}; border:1px solid ${u}44;">
                ${r.type||`Word`}
              </span>
              <div class="vocab-dutch-word">${r.dutch_word}</div>
              ${r.example_sentence?`<div class="vocab-example">"${r.example_sentence}"</div>`:``}
              <button class="vocab-speak-btn" id="btn-speak-word" title="Listen">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              </button>
              <p class="vocab-flip-hint">Tap card to reveal meaning</p>
            </div>

            <div class="flashcard-back vocab-face">
              <span class="vocab-type-badge" style="background:${u}22; color:${u}; border:1px solid ${u}44;">
                ${r.type||`Word`}
              </span>
              <div class="vocab-english-word">${r.english_word}</div>
              ${r.meaning?`<div class="vocab-meaning">${r.meaning}</div>`:``}
              ${r.example_sentence?`<div class="vocab-example" style="margin-top:1rem;">"${r.example_sentence}"</div>`:``}
            </div>

          </div>
        </div>

        <div style="display:flex; justify-content:center; margin-top: 1.25rem;">
          <button id="btn-mark" class="${c?`btn-secondary`:`btn-primary`}"
            style="${c?``:`background:var(--success);`}">
            ${c?`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Learned`:`Mark as Learned`}
          </button>
        </div>

        <div class="quiz-footer" style="margin-top: 1.5rem;">
          <button class="btn-secondary" id="btn-vocab-prev" ${n===0?`disabled`:``}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Previous
          </button>
          <button class="btn-secondary" id="btn-end-session" style="margin: 0 auto;">End Session</button>
          <button class="btn-primary" id="btn-vocab-next">
            ${n===a-1?`Finish`:`Next`}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

      </div>
    </div>
  `,document.getElementById(`btn-back-vocab`).addEventListener(`click`,()=>o.vocabDashboard()),document.getElementById(`btn-end-session`).addEventListener(`click`,()=>R()),document.getElementById(`btn-speak-word`).addEventListener(`click`,e=>{e.stopPropagation(),f(r.example_sentence?`${r.dutch_word}. ${r.example_sentence}`:r.dutch_word)}),document.getElementById(`btn-mark`).addEventListener(`click`,t=>{t.stopPropagation(),e.userProgress[s]||(e.userProgress[s]={});let r=!c;e.userProgress[s][`w${n}`]=r,r?I.add(n):I.delete(n),i(),z()}),document.getElementById(`btn-vocab-prev`).addEventListener(`click`,()=>{e.currentVocabIndex--,z()}),document.getElementById(`btn-vocab-next`).addEventListener(`click`,()=>{n>=a-1?R():(e.currentVocabIndex++,z())})}function B(){document.body.classList.add(`in-dashboard`),document.body.classList.remove(`in-quiz`);let t=e.readingQuestions.map(e=>{let t=e.questions.length,{completed:n}=M(e.module_id),r=t>0?Math.round(n/t*100):0;return`
      <div class="module-card" data-quiz-id="${e.module_id}" style="cursor:pointer;">
        <h3>${e.module_title_en}</h3>
        <p>${e.module_title_nl}</p>
        <div class="module-progress-bar" style="margin-top: 1rem;">
          <div class="module-progress-fill" style="width: ${r}%"></div>
        </div>
        <div class="module-stats">
          <span>${n} / ${t} answered</span>
          <span>${r}%</span>
        </div>
      </div>`}).join(``);document.getElementById(`main-content`).innerHTML=`
    <div class="view active" id="reading-quiz-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Reading Quiz</h1>
          <p>Read Dutch passages and answer comprehension questions.</p>
        </div>
        <button class="btn-secondary" id="btn-back-reading">Back to Reading</button>
      </div>
      <div class="modules-grid">${t}</div>
    </div>
  `,document.getElementById(`btn-back-reading`).addEventListener(`click`,()=>o.readingDashboard()),document.querySelectorAll(`[data-quiz-id]`).forEach(e=>{e.addEventListener(`click`,()=>{V(e.getAttribute(`data-quiz-id`))})})}function V(t){let n=e.readingQuestions.find(e=>e.module_id===t);if(!n)return;e.currentModule=n,e.userProgress[t]||(e.userProgress[t]={});let r=0;for(let i=0;i<n.questions.length;i++)if(e.userProgress[t][n.questions[i].id]===void 0){r=i;break}e.currentQuestionIndex=r,e.sessionStats={correct:0,wrong:0},e.sessionWrongQuestions=[],e.isExamMode=!1,o.quiz()}o.landing=s,o.categorySelect=l,o.progress=u,o.quiz=m,o.results=g,o.flashcards=v,o.flashcard=y,o.knmDashboard=C,o.exam=T,o.readingDashboard=N,o.vocabDashboard=L,o.vocabCards=z,o.readingQuizDashboard=B;async function H(){r(),a(),document.getElementById(`logo-home`)?.addEventListener(`click`,s);try{await Promise.all([x(),A()]),s()}catch(e){document.getElementById(`main-content`).innerHTML=`
      <div class="results-container">
        <h2 style="color:var(--danger)">Error Loading Data</h2>
        <p class="results-subtitle">${e.message}</p>
      </div>`}}H();