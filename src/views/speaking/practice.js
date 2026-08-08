import { nav } from '../../router.js';
import { speakingPractice } from '../../data/speaking.js';

let activeType = 'single';  // 'single' | 'double' | 'triple'
let questionIndex = 0;

// Per-question recording state: keyed by `${type}-${index}`
const recordings = {};

// MediaRecorder state
let mediaRecorder = null;
let audioChunks   = [];
let micStream     = null;

export function renderSpeakingPractice() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  questionIndex = 0;
  renderPracticeView();
}

function getQuestions() {
  return speakingPractice[activeType] ?? [];
}

function recordingKey() {
  return `${activeType}-${questionIndex}`;
}

function renderPracticeView() {
  const questions = getQuestions();
  const q = questions[questionIndex];
  if (!q) return;

  const total = questions.length;
  const key   = recordingKey();
  const hasRecording = !!recordings[key];

  const questionLines = q.question.split('\n').filter(Boolean);

  const TYPE_LABELS = { single: 'Enkele foto', double: 'Twee foto\'s', triple: 'Verhaal (3 foto\'s)' };
  const TYPE_HINTS  = {
    single: 'Describe the image: Who, Where, What, Why, and your personal experience.',
    double: 'Choose one image, say which you choose, describe it, and explain why.',
    triple: 'Tell a short story using: Eerst … Daarna … Dan … Tot slot …',
  };

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="speaking-practice">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Oefenen</h1>
          <p>Record your answer, listen back, then reveal the sample.</p>
        </div>
        <button class="btn-secondary" id="btn-back-speaking">Back to Speaking</button>
      </div>

      <!-- Type selector -->
      <div class="speaking-tabs">
        <button class="speaking-tab ${activeType === 'single' ? 'active' : ''}" data-type="single">Enkele foto <span class="tab-count">20</span></button>
        <button class="speaking-tab ${activeType === 'double' ? 'active' : ''}" data-type="double">Twee foto's <span class="tab-count">20</span></button>
        <button class="speaking-tab ${activeType === 'triple' ? 'active' : ''}" data-type="triple">Verhaal <span class="tab-count">20</span></button>
      </div>

      <!-- Progress -->
      <div class="practice-progress-row">
        <span class="practice-counter">Vraag ${questionIndex + 1} / ${total}</span>
        <div class="practice-progress-bar">
          <div class="practice-progress-fill" style="width:${((questionIndex + 1) / total) * 100}%"></div>
        </div>
      </div>

      <!-- Question card -->
      <div class="practice-card">
        <!-- Category + type hint -->
        <div class="practice-card-header">
          <span class="practice-category-badge">${q.category}</span>
          <span class="practice-type-badge">${TYPE_LABELS[activeType]}</span>
        </div>

        <!-- Scenario description -->
        <div class="practice-scenario">
          <div class="practice-scenario-icon">🖼️</div>
          <p class="practice-scenario-text">${q.scenario_en}</p>
        </div>

        <!-- Type hint -->
        <div class="practice-type-hint">${TYPE_HINTS[activeType]}</div>

        <!-- Dutch question -->
        <div class="practice-question-box">
          ${questionLines.map(line => `<p class="practice-question-line">${line}</p>`).join('')}
        </div>

        <!-- Recording section -->
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
            <button class="btn-playback" id="btn-play">
              <span>▶</span> Listen
            </button>
            <button class="btn-rerecord" id="btn-rerecord">
              ↺ Re-record
            </button>` : ''}
          </div>

          <!-- Hidden audio player -->
          <audio id="audio-playback" style="display:none;"></audio>
        </div>

        <!-- Reveal answer -->
        <div class="practice-answer-section">
          <button class="btn-reveal" id="btn-reveal">
            Show Sample Answer
          </button>
          <div class="practice-answer-box hidden" id="answer-box">
            <div class="answer-box-label">Voorbeeldantwoord</div>
            ${q.answer.map(s => `<p class="answer-sentence">${s}</p>`).join('')}
          </div>
        </div>
      </div>

      <!-- Navigation -->
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

  // Back
  document.getElementById('btn-back-speaking').addEventListener('click', () => {
    stopRecording();
    nav.speakingDashboard();
  });

  // Type tabs
  document.querySelectorAll('.speaking-tab[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      stopRecording();
      activeType = btn.dataset.type;
      questionIndex = 0;
      renderPracticeView();
    });
  });

  // Navigation
  document.getElementById('btn-prev').addEventListener('click', () => {
    stopRecording();
    if (questionIndex > 0) { questionIndex--; renderPracticeView(); }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    stopRecording();
    if (questionIndex < total - 1) { questionIndex++; renderPracticeView(); }
  });

  // Reveal answer
  const revealBtn = document.getElementById('btn-reveal');
  const answerBox = document.getElementById('answer-box');
  revealBtn.addEventListener('click', () => {
    answerBox.classList.toggle('hidden');
    revealBtn.textContent = answerBox.classList.contains('hidden') ? 'Show Sample Answer' : 'Hide Sample Answer';
  });

  // Record
  document.getElementById('btn-record').addEventListener('click', handleRecordClick);
  document.getElementById('btn-play')?.addEventListener('click', handlePlayClick);
  document.getElementById('btn-rerecord')?.addEventListener('click', () => {
    delete recordings[recordingKey()];
    renderPracticeView();
  });
}

async function handleRecordClick() {
  const btn = document.getElementById('btn-record');
  const label = document.getElementById('btn-record-label');
  const status = document.getElementById('record-status');

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    // Stop recording
    mediaRecorder.stop();
    return;
  }

  // Start recording
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    status.textContent = '⚠️ Microphone access denied. Please allow microphone in browser settings.';
    return;
  }

  audioChunks = [];
  mediaRecorder = new MediaRecorder(micStream);

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    recordings[recordingKey()] = URL.createObjectURL(blob);
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    mediaRecorder = null;
    renderPracticeView();
  };

  mediaRecorder.start();
  btn.classList.add('recording');
  label.textContent = 'Stop Recording';
  status.textContent = '🔴 Recording…';

  // Animate recording
  let secs = 0;
  const timer = setInterval(() => {
    secs++;
    if (status) status.textContent = `🔴 Recording… ${secs}s`;
    if (!mediaRecorder || mediaRecorder.state !== 'recording') clearInterval(timer);
  }, 1000);
}

function handlePlayClick() {
  const key = recordingKey();
  const url = recordings[key];
  if (!url) return;

  const audio = document.getElementById('audio-playback');
  if (!audio) return;

  audio.src = url;
  audio.play();

  const btn = document.getElementById('btn-play');
  audio.onplay = () => { if (btn) btn.innerHTML = '<span>⏸</span> Pause'; };
  audio.onpause = () => { if (btn) btn.innerHTML = '<span>▶</span> Listen'; };
  audio.onended = () => { if (btn) btn.innerHTML = '<span>▶</span> Listen'; };

  // Toggle play/pause
  btn.onclick = () => {
    if (audio.paused) audio.play();
    else audio.pause();
  };
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
}
