import { nav } from '../../router.js';
import { speakingPractice } from '../../data/speaking.js';
import { speakingEvalContext } from '../../ai/aiPrompts.js';
import { getPreferredModel } from '../../ai/aiService.js';

let activeType    = 'single';
let questionIndex = 0;

// Per-question state keyed by `${type}-${index}`
const recordings   = {};  // Blob URLs
const transcripts  = {};  // SpeechRecognition transcripts

// MediaRecorder + SpeechRecognition state
let mediaRecorder = null;
let audioChunks   = [];
let micStream     = null;
let recognition   = null;  // SpeechRecognition instance

const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

export function renderSpeakingPractice() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  questionIndex = 0;
  renderPracticeView();
}

function getQuestions() { return speakingPractice[activeType] ?? []; }
function recordingKey()  { return `${activeType}-${questionIndex}`; }

function renderPracticeView() {
  const questions = getQuestions();
  const q         = questions[questionIndex];
  if (!q) return;

  const total        = questions.length;
  const key          = recordingKey();
  const hasRecording = !!recordings[key];
  const transcript   = transcripts[key] ?? '';

  const TYPE_LABELS = { single: 'Enkele foto', double: "Twee foto's", triple: 'Verhaal (3 foto\'s)' };
  const TYPE_HINTS  = {
    single: 'Describe the image: Who, Where, What, Why, and your personal experience.',
    double: 'Choose one image, say which you choose, describe it, and explain why.',
    triple: 'Tell a short story using: Eerst … Daarna … Dan … Tot slot …',
  };

  const questionLines = q.question.split('\n').filter(Boolean);
  const preferredModel = getPreferredModel();

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="speaking-practice">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Oefenen</h1>
          <p>Record your answer, listen back, then validate with AI.</p>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <div class="model-selector" id="model-selector">
            <span class="model-label">AI Model:</span>
            <button class="model-btn ${preferredModel === 'auto'     ? 'active' : ''}" data-model="auto">Auto</button>
            <button class="model-btn ${preferredModel === 'deepseek' ? 'active' : ''}" data-model="deepseek">DeepSeek</button>
            <button class="model-btn ${preferredModel === 'claude'   ? 'active' : ''}" data-model="claude">Claude</button>
          </div>
          <button class="btn-secondary" id="btn-back-speaking">Back</button>
        </div>
      </div>

      <div class="speaking-tabs">
        <button class="speaking-tab ${activeType === 'single' ? 'active' : ''}" data-type="single">Enkele foto <span class="tab-count">20</span></button>
        <button class="speaking-tab ${activeType === 'double' ? 'active' : ''}" data-type="double">Twee foto's <span class="tab-count">20</span></button>
        <button class="speaking-tab ${activeType === 'triple' ? 'active' : ''}" data-type="triple">Verhaal <span class="tab-count">20</span></button>
      </div>

      <div class="practice-progress-row">
        <span class="practice-counter">Vraag ${questionIndex + 1} / ${total}</span>
        <div class="practice-progress-bar">
          <div class="practice-progress-fill" style="width:${((questionIndex + 1) / total) * 100}%"></div>
        </div>
      </div>

      <div class="practice-card">
        <div class="practice-card-header">
          <span class="practice-category-badge">${q.category}</span>
          <span class="practice-type-badge">${TYPE_LABELS[activeType]}</span>
        </div>

        <div class="practice-scenario">
          <div class="practice-scenario-icon">🖼️</div>
          <p class="practice-scenario-text">${q.scenario_en}</p>
        </div>

        <div class="practice-type-hint">${TYPE_HINTS[activeType]}</div>

        <div class="practice-question-box">
          ${questionLines.map(line => `<p class="practice-question-line">${line}</p>`).join('')}
        </div>

        <!-- Recording -->
        <div class="practice-record-section">
          <div class="record-status" id="record-status">
            ${hasRecording ? '✅ Recording saved' : 'Ready to record'}
          </div>
          <div class="record-controls">
            <button class="btn-record" id="btn-record">
              <span class="record-icon">🎙️</span>
              <span id="btn-record-label">Record Answer</span>
            </button>
            ${hasRecording ? `
            <button class="btn-playback" id="btn-play"><span>▶</span> Listen</button>
            <button class="btn-rerecord" id="btn-rerecord">↺ Re-record</button>` : ''}
          </div>
          <audio id="audio-playback" style="display:none;"></audio>

          ${transcript ? `
          <div class="transcript-box">
            <div class="transcript-label">What we heard:</div>
            <p class="transcript-text" id="transcript-text">${transcript}</p>
            <button class="transcript-edit-btn" id="btn-edit-transcript">Edit</button>
          </div>` : hasRecording && !SpeechRecognition ? `
          <div class="transcript-box">
            <div class="transcript-label">Type what you said (for AI validation):</div>
            <textarea class="transcript-textarea" id="transcript-input" placeholder="Type your Dutch answer here…" rows="3"></textarea>
          </div>` : ''}
        </div>

        <!-- AI Validation -->
        ${hasRecording ? `
        <div class="practice-ai-section">
          <button class="btn-ai-validate" id="btn-ai-validate">
            ✨ Validate with AI
          </button>
          <div id="ai-feedback-panel"></div>
        </div>` : ''}

        <!-- Sample answer -->
        <div class="practice-answer-section">
          <button class="btn-reveal" id="btn-reveal">Show Sample Answer</button>
          <div class="practice-answer-box hidden" id="answer-box">
            <div class="answer-box-label">Voorbeeldantwoord</div>
            ${q.answer.map(s => `<p class="answer-sentence">${s}</p>`).join('')}
          </div>
        </div>
      </div>

      <div class="learn-card-nav" style="margin-top:1.5rem;">
        <button class="btn-secondary" id="btn-prev" ${questionIndex === 0 ? 'disabled' : ''}>← Vorige</button>
        <div class="learn-progress-dots">
          ${questions.slice(Math.max(0, questionIndex - 2), Math.min(total, questionIndex + 3)).map((_, i) => {
            const idx = Math.max(0, questionIndex - 2) + i;
            const k   = `${activeType}-${idx}`;
            return `<div class="progress-dot ${idx === questionIndex ? 'active' : recordings[k] ? 'done' : ''}"></div>`;
          }).join('')}
        </div>
        <button class="btn-primary" id="btn-next" ${questionIndex === total - 1 ? 'disabled' : ''}>Volgende →</button>
      </div>
    </div>
  `;

  // Model selector
  document.querySelectorAll('.model-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      import('../../ai/aiService.js').then(({ setPreferredModel }) => {
        setPreferredModel(btn.dataset.model);
        document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  document.getElementById('btn-back-speaking').addEventListener('click', () => {
    stopAll(); nav.speakingDashboard();
  });

  document.querySelectorAll('.speaking-tab[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      stopAll(); activeType = btn.dataset.type; questionIndex = 0; renderPracticeView();
    });
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    stopAll(); if (questionIndex > 0) { questionIndex--; renderPracticeView(); }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    stopAll(); if (questionIndex < total - 1) { questionIndex++; renderPracticeView(); }
  });

  const revealBtn = document.getElementById('btn-reveal');
  const answerBox = document.getElementById('answer-box');
  revealBtn.addEventListener('click', () => {
    answerBox.classList.toggle('hidden');
    revealBtn.textContent = answerBox.classList.contains('hidden') ? 'Show Sample Answer' : 'Hide Sample Answer';
  });

  document.getElementById('btn-record').addEventListener('click', handleRecordClick);
  document.getElementById('btn-play')?.addEventListener('click', handlePlayClick);
  document.getElementById('btn-rerecord')?.addEventListener('click', () => {
    delete recordings[recordingKey()];
    delete transcripts[recordingKey()];
    renderPracticeView();
  });

  // Transcript edit: make text editable inline
  document.getElementById('btn-edit-transcript')?.addEventListener('click', () => {
    const p   = document.getElementById('transcript-text');
    const btn = document.getElementById('btn-edit-transcript');
    if (p.contentEditable === 'true') {
      transcripts[recordingKey()] = p.textContent.trim();
      p.contentEditable = 'false';
      btn.textContent   = 'Edit';
    } else {
      p.contentEditable = 'true';
      p.focus();
      btn.textContent   = 'Save';
    }
  });

  document.getElementById('btn-ai-validate')?.addEventListener('click', () => handleAIValidate(q));
}

// ── Recording ────────────────────────────────────────────────────────────────

async function handleRecordClick() {
  const btn    = document.getElementById('btn-record');
  const label  = document.getElementById('btn-record-label');
  const status = document.getElementById('record-status');

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recognition?.stop();
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    status.textContent = '⚠️ Microphone access denied. Please allow microphone in browser settings.';
    return;
  }

  audioChunks = [];
  mediaRecorder = new MediaRecorder(micStream);
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    recordings[recordingKey()] = URL.createObjectURL(new Blob(audioChunks, { type: 'audio/webm' }));
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    mediaRecorder = null;
    renderPracticeView();
  };
  mediaRecorder.start();

  // Run SpeechRecognition in parallel if available
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'nl-NL';
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = '';
    recognition.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      const statusEl = document.getElementById('record-status');
      if (statusEl) statusEl.textContent = `🔴 Recording… "${(finalTranscript + interim).trim()}"`;
    };
    recognition.onend = () => {
      if (finalTranscript.trim()) transcripts[recordingKey()] = finalTranscript.trim();
    };
    recognition.start();

    // Need to capture finalTranscript in closure for onstop
    let finalTranscriptClosure = '';
    recognition.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscriptClosure += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      const statusEl = document.getElementById('record-status');
      if (statusEl) statusEl.textContent = `🔴 "${(finalTranscriptClosure + interim).trim()}"`;
    };
    recognition.onend = () => {
      if (finalTranscriptClosure.trim()) transcripts[recordingKey()] = finalTranscriptClosure.trim();
    };
  }

  btn.classList.add('recording');
  label.textContent  = 'Stop Recording';
  status.textContent = '🔴 Recording…';

  let secs = 0;
  const timer = setInterval(() => {
    secs++;
    const statusEl = document.getElementById('record-status');
    if (!statusEl || !mediaRecorder || mediaRecorder.state !== 'recording') { clearInterval(timer); return; }
    if (!SpeechRecognition) statusEl.textContent = `🔴 Recording… ${secs}s`;
  }, 1000);
}

function handlePlayClick() {
  const url   = recordings[recordingKey()];
  const audio = document.getElementById('audio-playback');
  const btn   = document.getElementById('btn-play');
  if (!url || !audio) return;

  if (!audio.paused) { audio.pause(); return; }

  audio.src = url;
  audio.play();
  audio.onplay  = () => { if (btn) btn.innerHTML = '<span>⏸</span> Pause'; };
  audio.onpause = () => { if (btn) btn.innerHTML = '<span>▶</span> Listen'; };
  audio.onended = () => { if (btn) btn.innerHTML = '<span>▶</span> Listen'; };

  btn.onclick = () => { audio.paused ? audio.play() : audio.pause(); };
}

function stopAll() {
  if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
  recognition?.stop();
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
}

// ── AI Validation ─────────────────────────────────────────────────────────────

async function handleAIValidate(q) {
  const key          = recordingKey();
  const btn          = document.getElementById('btn-ai-validate');
  const feedbackPanel = document.getElementById('ai-feedback-panel');

  // Get transcript — from SpeechRecognition, textarea fallback, or none
  let transcript = transcripts[key] ?? '';
  if (!transcript) {
    const textarea = document.getElementById('transcript-input');
    transcript = textarea?.value?.trim() ?? '';
  }

  if (!transcript) {
    feedbackPanel.innerHTML = `<div class="ai-feedback-error">
      ⚠️ No transcript available. Speech recognition may not be supported in your browser.
      Please type what you said in the text box above and try again.
    </div>`;
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Evaluating…';
  feedbackPanel.innerHTML = `<div class="ai-feedback-loading">
    <div class="ai-feedback-spinner"></div>
    <span>Analysing your answer…</span>
  </div>`;

  const { askAI } = await import('../../ai/aiService.js');
  const { getPreferredModel } = await import('../../ai/aiService.js');

  let fullText = '';

  askAI({
    module:  'speaking',
    action:  'evaluate',
    context: speakingEvalContext(q.question, q.answer, transcript),
    model:   getPreferredModel(),
    onChunk: (chunk) => {
      fullText += chunk;
      feedbackPanel.innerHTML = `<div class="ai-feedback-loading"><div class="ai-feedback-spinner"></div><span>Thinking…</span></div>`;
    },
    onDone: (text) => {
      btn.disabled    = false;
      btn.textContent = '✨ Validate with AI';
      renderAIFeedback(feedbackPanel, text, transcript);
    },
    onError: (msg) => {
      btn.disabled    = false;
      btn.textContent = '✨ Validate with AI';
      feedbackPanel.innerHTML = `<div class="ai-feedback-error">⚠️ ${msg}</div>`;
    },
  });
}

function renderAIFeedback(container, rawText, transcript) {
  // Try to parse JSON response from AI
  let data = null;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) data = JSON.parse(jsonMatch[0]);
  } catch { /* fallback to raw text */ }

  if (!data) {
    container.innerHTML = `<div class="ai-feedback-box">
      <div class="ai-feedback-header">✨ AI Feedback</div>
      <div class="ai-feedback-raw">${rawText.replace(/\n/g, '<br>')}</div>
    </div>`;
    return;
  }

  const verdictIcon  = { good: '🟢', partial: '🟡', retry: '🔴' };
  const verdictLabel = { good: 'Good job!', partial: 'Almost there', retry: 'Try again' };
  const icon  = verdictIcon[data.verdict]  ?? '🟡';
  const label = verdictLabel[data.verdict] ?? 'Feedback';

  const correctHtml  = (data.correct ?? []).map(c => `<li>✅ ${c}</li>`).join('');
  const missingHtml  = (data.missing ?? []).map(m => `<li>❌ ${m}</li>`).join('');

  container.innerHTML = `
    <div class="ai-feedback-box">
      <div class="ai-feedback-header">
        <span class="ai-feedback-verdict">${icon} ${label}</span>
        ${data.score ? `<span class="ai-feedback-score">${data.score}</span>` : ''}
      </div>

      <div class="ai-feedback-transcript">
        <span class="ai-feedback-section-label">You said:</span>
        <p class="ai-feedback-transcript-text">"${transcript}"</p>
      </div>

      ${correctHtml ? `
      <div class="ai-feedback-section">
        <span class="ai-feedback-section-label">What you got right</span>
        <ul class="ai-feedback-list">${correctHtml}</ul>
      </div>` : ''}

      ${missingHtml ? `
      <div class="ai-feedback-section">
        <span class="ai-feedback-section-label">What to improve</span>
        <ul class="ai-feedback-list">${missingHtml}</ul>
      </div>` : ''}

      ${data.tip ? `
      <div class="ai-feedback-tip">
        <span>💡</span> ${data.tip}
      </div>` : ''}

      ${data.encouragement ? `
      <div class="ai-feedback-encouragement">🇳🇱 ${data.encouragement}</div>` : ''}
    </div>
  `;
}
