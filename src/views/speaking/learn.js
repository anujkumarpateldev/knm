import { nav } from '../../router.js';
import { speakingLearnPresent, speakingLearnPast, speakingLearnScenarios } from '../../data/speaking.js';

// Active tab: 'present' | 'past' | 'scenarios'
let activeTab = 'present';
// Active category id (null = grid view)
let activeCategoryId = null;
// Card index within category
let cardIndex = 0;
// Flip state
let flipped = false;

export function renderSpeakingLearn() {
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  activeCategoryId = null;
  cardIndex = 0;
  flipped = false;
  renderLearnView();
}

function getActiveData() {
  if (activeTab === 'present')   return speakingLearnPresent.categories;
  if (activeTab === 'past')      return speakingLearnPast.categories;
  if (activeTab === 'scenarios') return speakingLearnScenarios.categories;
  return [];
}

function getActiveCategory() {
  return getActiveData().find(c => c.id === activeCategoryId) ?? null;
}

const CATEGORY_ICONS = {
  apotheek:   '💊', supermarkt: '🛒', keuken: '🍳', werk: '💼',
  school:     '🎓', transport:  '🚌', restaurant: '☕', problemen: '🆘',
  dagelijks:  '🌤️',
  basic_actions: '🏃', talking: '💬', taking_giving: '🤝', at_home: '🏠',
  kitchen:    '🍳', living_room: '🛋️', bathroom: '🚿', supermarket: '🛒',
  clothing:   '👕', doctor:     '💊', work:       '💼', reception: '📋',
  transport_travel: '✈️',
  basic: '🏃', kitchen_food: '🍳', living_room_free: '🛋️', bathroom_bedroom: '🚿',
  shopping_supermarket: '🛒', clothing_store: '👗', doctor_pharmacy: '💊',
  work_office: '💼', transport_travel2: '✈️',
};

function speakLearnText(text, btn) {
  if (!window.speechSynthesis) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (btn) btn.textContent = '🔊 Listen';
    return;
  }

  const utterance  = new SpeechSynthesisUtterance(text);
  utterance.lang   = 'nl-NL';
  utterance.rate   = 0.85;
  utterance.onstart = () => { if (btn) btn.textContent = '⏹ Stop'; };
  utterance.onend   = () => { if (btn) btn.textContent = '🔊 Listen'; };
  utterance.onerror = () => { if (btn) btn.textContent = '🔊 Listen'; };

  window.speechSynthesis.speak(utterance);
}

function renderLearnView() {
  const categories = getActiveData();

  if (activeCategoryId) {
    renderCategoryCards();
    return;
  }

  const cardsHtml = categories.map(cat => {
    const count = cat.sentences?.length ?? cat.scenarios?.length ?? 0;
    const icon  = CATEGORY_ICONS[cat.id] ?? '📖';
    return `
      <div class="module-card speaking-cat-card" data-cat-id="${cat.id}" style="cursor:pointer;">
        <div class="speaking-cat-icon">${icon}</div>
        <h3>${cat.name}</h3>
        ${cat.name_en ? `<p style="color:var(--text-muted);font-size:0.85rem;">${cat.name_en}</p>` : ''}
        <div class="module-stats" style="margin-top:0.75rem;">
          <span class="tag">${count} ${activeTab === 'scenarios' ? 'scenarios' : 'sentences'}</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="speaking-learn">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>Leren</h1>
          <p>Choose a category to study.</p>
        </div>
        <button class="btn-secondary" id="btn-back-speaking">Back to Speaking</button>
      </div>

      <div class="speaking-tabs">
        <button class="speaking-tab ${activeTab === 'present'   ? 'active' : ''}" data-tab="present">Heden</button>
        <button class="speaking-tab ${activeTab === 'past'      ? 'active' : ''}" data-tab="past">Verleden</button>
        <button class="speaking-tab ${activeTab === 'scenarios' ? 'active' : ''}" data-tab="scenarios">Scenario's</button>
      </div>

      <div class="modules-grid" id="category-grid">${cardsHtml}</div>
    </div>
  `;

  document.getElementById('btn-back-speaking').addEventListener('click', () => nav.speakingDashboard());

  document.querySelectorAll('.speaking-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      activeCategoryId = null;
      renderLearnView();
    });
  });

  document.querySelectorAll('.speaking-cat-card').forEach(card => {
    card.addEventListener('click', () => {
      activeCategoryId = card.dataset.catId;
      cardIndex = 0;
      flipped = false;
      renderCategoryCards();
    });
  });
}

function renderCategoryCards() {
  const cat = getActiveCategory();
  if (!cat) { renderLearnView(); return; }

  const items = cat.sentences ?? cat.scenarios ?? [];
  const total = items.length;
  const item  = items[cardIndex];
  if (!item) return;

  const isScenario = activeTab === 'scenarios';

  // Front: Dutch sentence or scenario question
  // Back:  English translation or full answer
  let frontHtml, backHtml;

  if (isScenario) {
    const qHtml = (item.questions ?? []).map(q => `<li>${q}</li>`).join('');
    const speakText = (item.questions ?? []).join(' ');
    frontHtml = `
      <div class="learn-card-title">${item.title ?? ''}</div>
      ${item.scenario_en ? `<p class="learn-card-scene">${item.scenario_en}</p>` : ''}
      ${qHtml ? `<ul class="learn-card-questions">${qHtml}</ul>` : ''}
      ${speakText ? `<button class="btn-speak-card" id="btn-speak-card" title="Listen">🔊 Listen</button>` : ''}`;
    backHtml = (item.answer ?? []).map(s => `<p class="learn-answer-sentence">${s}</p>`).join('');
  } else {
    frontHtml = `
      <div class="learn-card-dutch">${item.dutch}</div>
      <button class="btn-speak-card" id="btn-speak-card" title="Listen">🔊 Listen</button>`;
    backHtml  = `<div class="learn-card-english">${item.english}</div>`;
  }

  document.getElementById('main-content').innerHTML = `
    <div class="view active" id="speaking-learn-cards">
      <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1>${cat.name}</h1>
          <p>${cardIndex + 1} / ${total}</p>
        </div>
        <button class="btn-secondary" id="btn-back-cats">Back to Categories</button>
      </div>

      <div class="speaking-tabs">
        <button class="speaking-tab ${activeTab === 'present'   ? 'active' : ''}" data-tab="present">Heden</button>
        <button class="speaking-tab ${activeTab === 'past'      ? 'active' : ''}" data-tab="past">Verleden</button>
        <button class="speaking-tab ${activeTab === 'scenarios' ? 'active' : ''}" data-tab="scenarios">Scenario's</button>
      </div>

      <div class="learn-card-wrap">
        <div class="learn-flashcard ${flipped ? 'flipped' : ''}" id="learn-card">
          <div class="learn-card-front">
            ${frontHtml}
            <div class="learn-card-hint">${isScenario ? 'Tap to see answer' : 'Tap to see translation'}</div>
          </div>
          <div class="learn-card-back">
            ${backHtml}
            <div class="learn-card-hint">Tap to flip back</div>
          </div>
        </div>
      </div>

      <div class="learn-card-nav">
        <button class="btn-secondary" id="btn-prev" ${cardIndex === 0 ? 'disabled' : ''}>← Vorige</button>
        <div class="learn-progress-dots">
          ${items.slice(Math.max(0, cardIndex - 2), Math.min(total, cardIndex + 3)).map((_, i) => {
            const idx = Math.max(0, cardIndex - 2) + i;
            return `<div class="progress-dot ${idx === cardIndex ? 'active' : idx < cardIndex ? 'done' : ''}"></div>`;
          }).join('')}
        </div>
        <button class="btn-primary" id="btn-next" ${cardIndex === total - 1 ? 'disabled' : ''}>Volgende →</button>
      </div>
    </div>
  `;

  document.getElementById('btn-back-cats').addEventListener('click', () => {
    activeCategoryId = null;
    renderLearnView();
  });

  document.querySelectorAll('.speaking-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      activeCategoryId = null;
      renderLearnView();
    });
  });

  document.getElementById('learn-card').addEventListener('click', (e) => {
    if (e.target.closest('#btn-speak-card')) return; // don't flip on speak button
    flipped = !flipped;
    document.getElementById('learn-card').classList.toggle('flipped', flipped);
  });

  document.getElementById('btn-speak-card')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = isScenario
      ? (item.questions ?? []).join(' ')
      : item.dutch;
    speakLearnText(text, e.currentTarget);
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    if (cardIndex > 0) { cardIndex--; flipped = false; renderCategoryCards(); }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    if (cardIndex < total - 1) { cardIndex++; flipped = false; renderCategoryCards(); }
  });
}
