import { nav } from '../../router.js';

export function renderSpeakingDashboard() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="speaking-dashboard">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Speaking (Spreken)</h1>
          <p>Prepare for your A2 Dutch speaking exam.</p>
        </div>
        <button class="btn-secondary" id="btn-back-categories">Change Category</button>
      </div>

      <div class="reading-modes-grid">
        <div class="module-card reading-mode-card speaking-mode-card" id="btn-speaking-learn">
          <div class="reading-mode-icon">📚</div>
          <h3>Leren</h3>
          <p class="reading-mode-subtitle">Learning</p>
          <p style="color: var(--text-muted); margin-top: 0.75rem; font-size: 0.9rem;">
            Study sentences and scenarios by topic. Present tense, past tense, and full answer structures.
          </p>
          <div style="margin-top: 1rem;">
            <span class="tag">9 categories</span>
            <span class="tag" style="margin-left:0.5rem;">500+ sentences</span>
          </div>
        </div>

        <div class="module-card reading-mode-card speaking-mode-card" id="btn-speaking-practice">
          <div class="reading-mode-icon">🎙️</div>
          <h3>Oefenen</h3>
          <p class="reading-mode-subtitle">Practice</p>
          <p style="color: var(--text-muted); margin-top: 0.75rem; font-size: 0.9rem;">
            Record your answers to exam-style questions. Listen back, then reveal the sample answer.
          </p>
          <div style="margin-top: 1rem;">
            <span class="tag">60 questions</span>
            <span class="tag" style="margin-left:0.5rem;">3 question types</span>
          </div>
        </div>
      </div>

      <div class="speaking-formula-box">
        <div class="speaking-formula-title">Answer Formula</div>
        <div class="speaking-formula-steps">
          <div class="formula-step"><span class="formula-num">1</span><span class="formula-label">Wie</span><span class="formula-hint">Op de foto zie ik een man/vrouw.</span></div>
          <div class="formula-step"><span class="formula-num">2</span><span class="formula-label">Waar</span><span class="formula-hint">Hij/Zij is bij / in / op …</span></div>
          <div class="formula-step"><span class="formula-num">3</span><span class="formula-label">Wat</span><span class="formula-hint">Hij/Zij is aan het … / doet …</span></div>
          <div class="formula-step"><span class="formula-num">4</span><span class="formula-label">Waarom</span><span class="formula-hint">Hij/Zij doet dat omdat …</span></div>
          <div class="formula-step"><span class="formula-num">5</span><span class="formula-label">Jij</span><span class="formula-hint">Ik doe dit ook als / wanneer …</span></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back-categories').addEventListener('click', () => nav.categorySelect('PRACTICE'));
  document.getElementById('btn-speaking-learn').addEventListener('click', () => nav.speakingLearn());
  document.getElementById('btn-speaking-practice').addEventListener('click', () => nav.speakingPractice());
}
