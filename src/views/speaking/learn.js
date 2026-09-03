import { nav } from '../../router.js';
import { speakingLearnPresent, speakingLearnPast, speakingLearnScenarios } from '../../data/speaking.js';
import { trackEnter } from '../../utils/tracker.js';

// Active tab: 'present' | 'past' | 'scenarios'
let activeTab = 'present';
// Active category id (null = grid view)
let activeCategoryId = null;
// Card index within category
let cardIndex = 0;
// Flip state
let flipped = false;
// Keyboard handler reference — kept module-level so it can be removed
let keyNavHandler = null;
// Card direction: 'nl-en' (Dutch front) | 'en-nl' (English front). Sentences only.
let learnDirection = localStorage.getItem('knm_learn_direction') || 'nl-en';

export function renderSpeakingLearn() {
  trackEnter('speaking_learn');
  document.body.classList.add('in-dashboard');
  document.body.classList.remove('in-quiz');
  if (keyNavHandler) { document.removeEventListener('keydown', keyNavHandler); keyNavHandler = null; }
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

      ${activeTab !== 'scenarios' ? `
      <div class="rev-direction-bar">
        <span class="rev-direction-label">Card direction</span>
        <div class="rev-direction-toggle">
          <button class="rev-dir-btn ${learnDirection === 'nl-en' ? 'active' : ''}" id="dir-nl-en">
            🇳🇱 Dutch <span class="rev-dir-arrow">→</span> English 🇬🇧
          </button>
          <button class="rev-dir-btn ${learnDirection === 'en-nl' ? 'active' : ''}" id="dir-en-nl">
            🇬🇧 English <span class="rev-dir-arrow">→</span> Dutch 🇳🇱
          </button>
        </div>
      </div>` : ''}

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

  document.getElementById('dir-nl-en')?.addEventListener('click', () => {
    learnDirection = 'nl-en';
    localStorage.setItem('knm_learn_direction', 'nl-en');
    renderLearnView();
  });
  document.getElementById('dir-en-nl')?.addEventListener('click', () => {
    learnDirection = 'en-nl';
    localStorage.setItem('knm_learn_direction', 'en-nl');
    renderLearnView();
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

  // Front/back depend on direction (sentences only; scenarios always nl-en)
  let frontHtml, backHtml;
  let frontSpeakText = null; // text to speak on front card (Dutch only)
  let backSpeakText  = null; // text to speak on back card

  if (isScenario) {
    // Scenarios: always Dutch questions → Dutch answer (direction toggle N/A)
    const qHtml    = (item.questions ?? []).map(q => `<li>${q}</li>`).join('');
    const speakText = (item.questions ?? []).join(' ');
    frontSpeakText  = speakText || null;
    frontHtml = `
      ${item.image ? `<img src="${item.image}" alt="${item.title ?? ''}" class="learn-card-img" loading="lazy">` : ''}
      <div class="learn-card-title">${item.title ?? ''}</div>
      ${item.scenario_en ? `<p class="learn-card-scene">${item.scenario_en}</p>` : ''}
      ${qHtml ? `<ul class="learn-card-questions">${qHtml}</ul>` : ''}
      ${speakText ? `<button class="btn-speak-card" id="btn-speak-card" title="Listen">🔊 Listen</button>` : ''}`;
    const answerText = (item.answer ?? []).join(' ');
    backSpeakText = answerText || null;
    backHtml = (item.answer ?? []).map(s => `<p class="learn-answer-sentence">${s}</p>`).join('')
      + (answerText ? `<button class="btn-speak-card" id="btn-speak-card-back" title="Listen">🔊 Listen</button>` : '');
  } else if (learnDirection === 'en-nl') {
    // English front → Dutch back
    frontHtml = `
      ${item.image ? `<img src="${item.image}" alt="${item.english}" class="learn-card-img" loading="lazy">` : ''}
      <div class="learn-card-english">${item.english}</div>`;
    backSpeakText = item.dutch;
    backHtml = `
      <div class="learn-card-dutch">${item.dutch}</div>
      <button class="btn-speak-card" id="btn-speak-card-back" title="Listen">🔊 Listen</button>`;
  } else {
    // Dutch front → English back (default nl-en)
    frontSpeakText = item.dutch;
    frontHtml = `
      ${item.image ? `<img src="${item.image}" alt="${item.dutch}" class="learn-card-img" loading="lazy">` : ''}
      <div class="learn-card-dutch">${item.dutch}</div>
      <button class="btn-speak-card" id="btn-speak-card" title="Listen">🔊 Listen</button>`;
    backHtml = `<div class="learn-card-english">${item.english}</div>`;
  }

  const frontHint = isScenario ? 'Tap to see answer'
    : learnDirection === 'en-nl' ? 'Tap to see Dutch'
    : 'Tap to see English';

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

      ${!isScenario ? `
      <div class="rev-direction-bar" style="margin-bottom:0.75rem;">
        <span class="rev-direction-label">Card direction</span>
        <div class="rev-direction-toggle">
          <button class="rev-dir-btn ${learnDirection === 'nl-en' ? 'active' : ''}" id="dir-nl-en">
            🇳🇱 Dutch <span class="rev-dir-arrow">→</span> English 🇬🇧
          </button>
          <button class="rev-dir-btn ${learnDirection === 'en-nl' ? 'active' : ''}" id="dir-en-nl">
            🇬🇧 English <span class="rev-dir-arrow">→</span> Dutch 🇳🇱
          </button>
        </div>
      </div>` : ''}

      <div class="learn-card-wrap">
        <div class="learn-flashcard ${flipped ? 'flipped' : ''}" id="learn-card">
          <div class="learn-card-front">
            ${frontHtml}
            <div class="learn-card-hint">${frontHint}</div>
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
      document.removeEventListener('keydown', keyNavHandler); keyNavHandler = null;
      activeTab = btn.dataset.tab;
      activeCategoryId = null;
      renderLearnView();
    });
  });

  document.getElementById('dir-nl-en')?.addEventListener('click', () => {
    learnDirection = 'nl-en';
    localStorage.setItem('knm_learn_direction', 'nl-en');
    flipped = false;
    renderCategoryCards();
  });
  document.getElementById('dir-en-nl')?.addEventListener('click', () => {
    learnDirection = 'en-nl';
    localStorage.setItem('knm_learn_direction', 'en-nl');
    flipped = false;
    renderCategoryCards();
  });

  document.getElementById('learn-card').addEventListener('click', (e) => {
    if (e.target.closest('#btn-speak-card') || e.target.closest('#btn-speak-card-back')) return;
    flipped = !flipped;
    document.getElementById('learn-card').classList.toggle('flipped', flipped);
  });

  document.getElementById('btn-speak-card')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (frontSpeakText) speakLearnText(frontSpeakText, e.currentTarget);
  });

  document.getElementById('btn-speak-card-back')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (backSpeakText) speakLearnText(backSpeakText, e.currentTarget);
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    if (cardIndex > 0) { cardIndex--; flipped = false; renderCategoryCards(); }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    if (cardIndex < total - 1) { cardIndex++; flipped = false; renderCategoryCards(); }
  });

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  if (keyNavHandler) document.removeEventListener('keydown', keyNavHandler);
  keyNavHandler = (e) => {
    if (e.key === 'ArrowRight' && cardIndex < total - 1) {
      window.speechSynthesis?.cancel();
      cardIndex++; flipped = false; renderCategoryCards();
    } else if (e.key === 'ArrowLeft' && cardIndex > 0) {
      window.speechSynthesis?.cancel();
      cardIndex--; flipped = false; renderCategoryCards();
    } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      flipped = !flipped;
      document.getElementById('learn-card')?.classList.toggle('flipped', flipped);
    }
  };
  document.addEventListener('keydown', keyNavHandler);

  // ── Swipe gestures (Tinder-style) ───────────────────────────────────────────
  const card = document.getElementById('learn-card');
  let touchStartX = 0;
  let touchStartY = 0;
  let currentX = 0;
  let isDragging = false;

  card.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    currentX = 0;
    isDragging = false;
    card.style.transition = 'none';
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    // Only hijack horizontal swipes
    if (!isDragging && Math.abs(dx) < Math.abs(dy)) return;
    isDragging = true;
    currentX = dx;
    const rotate = dx * 0.08;
    const opacity = Math.max(0.4, 1 - Math.abs(dx) / 400);
    card.style.transform = `${flipped ? 'rotateY(180deg) ' : ''}translateX(${dx}px) rotate(${rotate}deg)`;
    card.style.opacity = opacity;
  }, { passive: true });

  card.addEventListener('touchend', () => {
    card.style.transition = '';
    card.style.opacity = '';
    const threshold = window.innerWidth * 0.3;

    if (isDragging && currentX < -threshold && cardIndex < total - 1) {
      // Swipe left → next
      card.style.transform = `translateX(-150%) rotate(-20deg)`;
      card.style.opacity = '0';
      setTimeout(() => {
        window.speechSynthesis?.cancel();
        cardIndex++; flipped = false; renderCategoryCards();
      }, 220);
    } else if (isDragging && currentX > threshold && cardIndex > 0) {
      // Swipe right → previous
      card.style.transform = `translateX(150%) rotate(20deg)`;
      card.style.opacity = '0';
      setTimeout(() => {
        window.speechSynthesis?.cancel();
        cardIndex--; flipped = false; renderCategoryCards();
      }, 220);
    } else {
      // Snap back
      card.style.transform = flipped ? 'rotateY(180deg)' : '';
    }
    isDragging = false;
  });

  // Clean up keyboard listener when navigating away
  const origBack = document.getElementById('btn-back-cats').onclick;
  document.getElementById('btn-back-cats').addEventListener('click', () => {
    document.removeEventListener('keydown', keyNavHandler); keyNavHandler = null;
  }, { once: true });
}
