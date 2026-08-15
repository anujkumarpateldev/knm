// src/data/words.js
// Personal vocabulary — Supabase when logged in, localStorage for guests.
import { state } from '../state.js';
import { supabase } from '../supabase.js';

const WORDS_KEY     = 'knm_my_words';
const SRS_INTERVALS = [1, 2, 4, 7, 14, 30]; // days

function today() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Map a user_words + word_dictionary joined row → app format
function mapRow(row) {
  const dict = row.word_dictionary ?? {};
  return {
    id:             row.id,
    dictId:         row.dict_id,
    dutch:          row.custom_dutch    || dict.dutch    || '',
    english:        row.custom_english  || dict.english  || '',
    meaning:        row.custom_meaning  || dict.meaning  || '',
    example:        row.custom_example  || dict.example  || '',
    tags:           dict.tags           ?? [],
    dateAdded:      row.date_added,
    srsInterval:    row.srs_interval,
    srsRepetitions: row.srs_repetitions,
    srsNextReview:  row.srs_next_review,
  };
}

const USER_WORDS_SELECT = `
  id, dict_id, custom_dutch, custom_english, custom_meaning, custom_example,
  date_added, srs_interval, srs_repetitions, srs_next_review,
  word_dictionary ( dutch, english, meaning, example, tags )
`;

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadWords() {
  if (!state.currentUser) {
    try {
      const raw = localStorage.getItem(WORDS_KEY);
      state.myWords = raw ? JSON.parse(raw) : [];
    } catch {
      state.myWords = [];
    }
    return;
  }

  const { data, error } = await supabase
    .from('user_words')
    .select(USER_WORDS_SELECT)
    .eq('user_id', state.currentUser.id)
    .order('date_added', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) { console.error('loadWords:', error.message); return; }
  state.myWords = (data ?? []).map(mapRow);
}

// ── Add ───────────────────────────────────────────────────────────────────────
// Returns { entry } on success, { duplicate: true } if already in list, { error } on failure.
export async function addWord({ dutch, english, meaning = '', example = '', tags = [] }) {
  const dutchTrimmed = dutch.trim();

  if (!state.currentUser) {
    // Guest — localStorage only
    const duplicate = state.myWords.some(
      w => w.dutch.toLowerCase() === dutchTrimmed.toLowerCase()
    );
    if (duplicate) return { duplicate: true };

    const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry = {
      id, dutch: dutchTrimmed, english: english.trim(),
      meaning: meaning.trim(), example: example.trim(), tags,
      dateAdded: today(), srsInterval: 1,
      srsNextReview: addDays(today(), 1), srsRepetitions: 0,
    };
    state.myWords.unshift(entry);
    localStorage.setItem(WORDS_KEY, JSON.stringify(state.myWords));
    return { entry };
  }

  // ── Logged in: Supabase ────────────────────────────────────────────────────

  // 1. Check word_dictionary for existing Dutch word (case-insensitive via dutch_lower)
  const { data: existing } = await supabase
    .from('word_dictionary')
    .select('id, dutch, english, meaning, example, tags')
    .eq('dutch_lower', dutchTrimmed.toLowerCase())
    .maybeSingle();

  if (existing) {
    // 2a. Word in shared dictionary — check if user already has it
    const { data: existingUserWord } = await supabase
      .from('user_words')
      .select('id')
      .eq('user_id', state.currentUser.id)
      .eq('dict_id', existing.id)
      .maybeSingle();

    if (existingUserWord) return { duplicate: true };

    // Not in user's list yet — surface the dict data for UI confirmation
    return {
      dictExists: true,
      dictWord: {
        id:      existing.id,
        dutch:   existing.dutch,
        english: existing.english,
        meaning: existing.meaning,
        example: existing.example,
        tags:    existing.tags ?? [],
      },
    };
  }

  // 2b. New word — insert into dictionary
  const { data: newEntry, error: dictErr } = await supabase
    .from('word_dictionary')
    .insert({ dutch: dutchTrimmed, english: english.trim(), meaning: meaning.trim(), example: example.trim(), tags })
    .select('id')
    .single();
  if (dictErr) return { error: dictErr.message };

  // 3. Add to user's list
  const { data: userWord, error: uwErr } = await supabase
    .from('user_words')
    .insert({
      user_id:         state.currentUser.id,
      dict_id:         newEntry.id,
      date_added:      today(),
      srs_interval:    1,
      srs_repetitions: 0,
      srs_next_review: addDays(today(), 1),
    })
    .select(USER_WORDS_SELECT)
    .single();

  if (uwErr) return { error: uwErr.message };

  const entry = mapRow(userWord);
  state.myWords.unshift(entry);
  return { entry };
}

// ── Add from existing dictionary entry ────────────────────────────────────────
export async function confirmAddFromDict(dictId) {
  if (!state.currentUser) return { error: 'Not logged in' };

  const { data: userWord, error } = await supabase
    .from('user_words')
    .insert({
      user_id:         state.currentUser.id,
      dict_id:         dictId,
      date_added:      today(),
      srs_interval:    1,
      srs_repetitions: 0,
      srs_next_review: addDays(today(), 1),
    })
    .select(USER_WORDS_SELECT)
    .single();

  if (error) return { error: error.message };

  const entry = mapRow(userWord);
  state.myWords.unshift(entry);
  return { entry };
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateWord(id, { dutch, english, meaning, example, tags }) {
  const idx = state.myWords.findIndex(w => w.id === id);
  if (idx === -1) return { error: 'Word not found' };
  const w = state.myWords[idx];

  if (!state.currentUser) {
    state.myWords[idx] = { ...w, dutch, english, meaning, example, tags };
    localStorage.setItem(WORDS_KEY, JSON.stringify(state.myWords));
    return { success: true };
  }

  const { error: uwErr } = await supabase
    .from('user_words')
    .update({ custom_dutch: dutch, custom_english: english, custom_meaning: meaning, custom_example: example })
    .eq('id', id)
    .eq('user_id', state.currentUser.id);

  if (uwErr) return { error: uwErr.message };

  if (w.dictId) {
    await supabase.from('word_dictionary').update({ tags }).eq('id', w.dictId);
  }

  state.myWords[idx] = { ...w, dutch, english, meaning, example, tags };
  return { success: true };
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteWord(id) {
  state.myWords = state.myWords.filter(w => w.id !== id);

  if (!state.currentUser) {
    localStorage.setItem(WORDS_KEY, JSON.stringify(state.myWords));
    return;
  }

  await supabase
    .from('user_words')
    .delete()
    .eq('id', id)
    .eq('user_id', state.currentUser.id);
}

// ── Review (SRS) ──────────────────────────────────────────────────────────────
export function reviewWord(id, result) {
  const idx = state.myWords.findIndex(w => w.id === id);
  if (idx === -1) return;
  const w = state.myWords[idx];

  let reps = w.srsRepetitions;
  let interval;
  if (result === 'forgot') {
    reps = 0;
    interval = 1;
  } else if (result === 'vague') {
    interval = SRS_INTERVALS[Math.min(reps, SRS_INTERVALS.length - 1)];
  } else {
    reps = Math.min(reps + 1, SRS_INTERVALS.length - 1);
    interval = SRS_INTERVALS[reps];
  }

  const nextReview = addDays(today(), interval);
  state.myWords[idx] = { ...w, srsRepetitions: reps, srsInterval: interval, srsNextReview: nextReview };

  if (!state.currentUser) {
    localStorage.setItem(WORDS_KEY, JSON.stringify(state.myWords));
    return;
  }

  // Fire-and-forget — don't block the UI
  supabase.from('user_words').update({
    srs_interval:    interval,
    srs_repetitions: reps,
    srs_next_review: nextReview,
  }).eq('id', id).eq('user_id', state.currentUser.id);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getDueWords() {
  const t = today();
  return state.myWords.filter(w => w.srsNextReview <= t);
}

export function getWordsByDate(dateStr) {
  return state.myWords.filter(w => w.dateAdded === dateStr);
}

export function getUniqueDates() {
  const counts = {};
  state.myWords.forEach(w => { counts[w.dateAdded] = (counts[w.dateAdded] || 0) + 1; });
  return Object.entries(counts)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, count]) => ({ date, count }));
}
