// src/utils/aiFill.js
// Shared AI fill logic — used by both user addWord and admin wordsAdmin
import { supabase } from '../supabase.js';

let cachedTags  = null;
let cacheAt     = 0;
let inFlight    = null;
const CACHE_MS  = 30_000; // re-fetch after 30 s or after invalidation

async function fetchTags() {
  const now = Date.now();
  // Return cached value if still fresh
  if (cachedTags !== null && now - cacheAt < CACHE_MS) return cachedTags;
  // Deduplicate concurrent in-flight requests
  if (inFlight) return inFlight;
  inFlight = supabase.from('word_dictionary').select('tags').then(({ data }) => {
    const set = new Set();
    (data ?? []).forEach(row => (row.tags ?? []).forEach(t => { if (t) set.add(t); }));
    cachedTags = [...set].sort();
    cacheAt    = Date.now();
    inFlight   = null;
    return cachedTags;
  }).catch(() => { inFlight = null; return cachedTags ?? []; });
  return inFlight;
}

export async function loadAllTags() {
  return fetchTags();
}

// Call after saving a word with new tags so next open fetches fresh
export function invalidateTagsCache() {
  cachedTags = null;
  cacheAt    = 0;
}

// Track pickers by inputId for cleanup
const _pickers = {};

export function setupTagsAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Tear down any previous picker for this id
  _pickers[inputId]?.remove();

  // Hide the raw input — we keep it only as the value store
  input.style.display = 'none';

  // ── Build picker UI ──────────────────────────────────────────────────────
  const picker = document.createElement('div');
  picker.className = 'tag-picker';
  _pickers[inputId] = picker;
  input.parentNode.insertBefore(picker, input);

  const chipsRow = document.createElement('div');
  chipsRow.className = 'tag-picker-chips';
  picker.appendChild(chipsRow);

  const textInput = document.createElement('input');
  textInput.type        = 'text';
  textInput.className   = 'tag-picker-text';
  textInput.placeholder = 'Search or type a new label…';
  picker.appendChild(textInput);

  // Dropdown lives on body to escape stacking contexts
  const dropdown = document.createElement('div');
  dropdown.className = 'tag-picker-dropdown';
  dropdown.style.display = 'none';
  document.body.appendChild(dropdown);

  let selected = [];

  // ── Helpers ───────────────────────────────────────────────────────────────
  function syncToInput() {
    // Write comma-separated value back so save handlers can read it
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    desc.set.call(input, selected.join(', '));
  }

  function renderChips() {
    chipsRow.innerHTML = '';
    selected.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `<span class="tag-chip-label">${tag}</span><button type="button" class="tag-chip-remove" data-tag="${tag}">×</button>`;
      chipsRow.appendChild(chip);
    });
  }

  function addTag(tag) {
    tag = tag.trim().toLowerCase();
    if (!tag || selected.includes(tag)) return;
    selected.push(tag);
    renderChips();
    syncToInput();
    textInput.value = '';
    renderDropdown();
  }

  function removeTag(tag) {
    selected = selected.filter(t => t !== tag);
    renderChips();
    syncToInput();
    renderDropdown();
  }

  function positionDropdown() {
    const r = picker.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top   = (r.bottom + 4) + 'px';
    dropdown.style.left  = r.left + 'px';
    dropdown.style.width = r.width + 'px';
  }

  async function renderDropdown() {
    const allTags = await fetchTags();
    const filter  = textInput.value.trim().toLowerCase();
    // Show tags that aren't selected yet, filtered by what's typed
    const visible = allTags.filter(t =>
      !selected.includes(t) && (filter === '' || t.toLowerCase().includes(filter))
    );

    if (!visible.length) { dropdown.style.display = 'none'; return; }

    positionDropdown();
    dropdown.innerHTML = visible.map(t =>
      `<div class="tag-picker-opt" data-tag="${t}">${t}</div>`
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.tag-picker-opt').forEach(opt => {
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        addTag(opt.dataset.tag);
        textInput.focus();
      });
    });
  }

  function closeDropdown() { dropdown.style.display = 'none'; }

  // ── Events ────────────────────────────────────────────────────────────────
  picker.addEventListener('click', () => textInput.focus());

  textInput.addEventListener('focus', () => renderDropdown());
  textInput.addEventListener('input', () => renderDropdown());
  textInput.addEventListener('blur',  () => setTimeout(closeDropdown, 150));
  textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = textInput.value.replace(/,\s*$/, '').trim();
      if (val) addTag(val);
    }
    if (e.key === 'Escape') closeDropdown();
    if (e.key === 'Backspace' && !textInput.value && selected.length)
      removeTag(selected[selected.length - 1]);
  });

  chipsRow.addEventListener('click', e => {
    const btn = e.target.closest('.tag-chip-remove');
    if (btn) { e.stopPropagation(); removeTag(btn.dataset.tag); }
  });

  // ── Intercept input.value setter so modal resets sync the picker ──────────
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(input, 'value', {
    get() { return proto.get.call(this); },
    set(v) {
      proto.set.call(this, v);
      selected = v ? v.split(',').map(t => t.trim()).filter(Boolean) : [];
      renderChips();
    },
    configurable: true,
  });

  // Initialise from any pre-existing value (e.g. edit modal)
  if (input.value) {
    selected = input.value.split(',').map(t => t.trim()).filter(Boolean);
    renderChips();
  }
}

export async function runAIFill({ dutch, btn, status, fields, dutchInputId, onRetrigger }) {
  btn.disabled = true;
  btn.style.opacity = '0.6';
  status.style.display = 'block';
  status.className = 'aw-ai-status aw-ai-loading';
  status.textContent = 'AI is thinking…';

  const restore = () => { btn.disabled = false; btn.style.opacity = ''; };

  let askAI;
  try {
    ({ askAI } = await import('../ai/aiService.js'));
  } catch (e) {
    restore();
    status.className = 'aw-ai-status aw-ai-error';
    status.textContent = 'Could not load AI service.';
    return;
  }

  let fullText = '';

  try {
  await askAI({
    module: 'vocab',
    action: 'fill',
    context: { dutch_word: dutch },
    input: `For the Dutch word or phrase "${dutch}", respond with ONLY this format (no extra text):
CORRECTION: [if the word is misspelled or not a real Dutch word, write the correct Dutch word/phrase; otherwise write "none"]
ENGLISH: [English translation]
MEANING: [one-sentence definition in English]
EXAMPLE: [one natural Dutch example sentence using this word]`,
    onChunk: chunk => { fullText += chunk; },
    onDone: () => {
      const get = key => {
        const m = fullText.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
        return m?.[1]?.trim() ?? '';
      };
      const correction = get('CORRECTION');
      const english    = get('ENGLISH');
      const meaning    = get('MEANING');
      const example    = get('EXAMPLE');

      if (english && !document.getElementById(fields.english).value) document.getElementById(fields.english).value = english;
      if (meaning && !document.getElementById(fields.meaning).value)  document.getElementById(fields.meaning).value  = meaning;
      if (example && !document.getElementById(fields.example).value)  document.getElementById(fields.example).value  = example;

      btn.disabled = false; btn.style.opacity = '';

      // Show correction suggestion if AI detected a typo
      if (correction && correction.toLowerCase() !== 'none' && correction.toLowerCase() !== dutch.toLowerCase()) {
        status.className = 'aw-ai-status aw-ai-warning';
        status.innerHTML = `Did you mean <strong>${correction}</strong>?
          <button type="button" class="aw-correction-btn" id="btn-use-correction">Use "${correction}"</button>`;
        document.getElementById('btn-use-correction').addEventListener('click', () => {
          document.getElementById(dutchInputId).value = correction;
          // Clear fields so AI refills with the correct word
          document.getElementById(fields.english).value = '';
          document.getElementById(fields.meaning).value  = '';
          document.getElementById(fields.example).value  = '';
          onRetrigger();
        });
      } else {
        status.className = 'aw-ai-status aw-ai-success';
        status.textContent = 'Fields filled — review and adjust as needed.';
        setTimeout(() => { status.style.display = 'none'; }, 3500);
      }
    },
    onError: msg => {
      restore();
      status.className = 'aw-ai-status aw-ai-error';
      status.textContent = msg;
    },
  });
  } catch (e) {
    restore();
    status.className = 'aw-ai-status aw-ai-error';
    status.textContent = e?.message || 'AI request failed.';
  }
}
