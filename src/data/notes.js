// src/data/notes.js
// Personal notes — Supabase when logged in, localStorage for guests.
// sections: [{ subtitle: string, lines: string[] }]
// subtitle = '' means lines with no heading (fully flexible).
import { state } from '../state.js';
import { supabase } from '../supabase.js';

const NOTES_KEY = 'knm_my_notes';

function now() { return new Date().toISOString(); }

function mapRow(row) {
  return {
    id:         row.id,
    title:      row.title     ?? '',
    sections:   row.sections  ?? [],
    pinned:     row.pinned    ?? false,
    tags:       row.tags      ?? [],
    isPublic:   row.is_public ?? false,
    authorName: row.user_profiles?.display_name ?? null,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

function _sort(arr) {
  arr.sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt > a.updatedAt ? 1 : -1));
}

function _persist() {
  if (!state.currentUser) localStorage.setItem(NOTES_KEY, JSON.stringify(state.myNotes));
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadNotes() {
  if (!state.currentUser) {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      state.myNotes = raw ? JSON.parse(raw) : [];
    } catch { state.myNotes = []; }
    return;
  }

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, sections, pinned, tags, is_public, created_at, updated_at')
    .eq('user_id', state.currentUser.id)
    .order('pinned',      { ascending: false })
    .order('updated_at',  { ascending: false });

  if (error) { console.error('loadNotes:', error.message); return; }
  state.myNotes = (data ?? []).map(mapRow);
}

// ── Add ───────────────────────────────────────────────────────────────────────
export async function addNote({ title, sections, tags = [], pinned = false, isPublic = false }) {
  if (!state.currentUser) {
    const entry = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title, sections, tags, pinned, isPublic: false,
      createdAt: now(), updatedAt: now(),
    };
    state.myNotes.unshift(entry);
    _sort(state.myNotes);
    _persist();
    return { entry };
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: state.currentUser.id, title, sections, tags, pinned, is_public: isPublic })
    .select('id, title, sections, pinned, tags, is_public, created_at, updated_at')
    .single();

  if (error) return { error: error.message };
  const entry = mapRow(data);
  state.myNotes.unshift(entry);
  _sort(state.myNotes);
  return { entry };
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateNote(id, { title, sections, tags, pinned, isPublic }) {
  const idx = state.myNotes.findIndex(n => n.id === id);
  if (idx === -1) return { error: 'Note not found' };

  const updated = { ...state.myNotes[idx], title, sections, tags, pinned, isPublic: isPublic ?? state.myNotes[idx].isPublic, updatedAt: now() };
  state.myNotes[idx] = updated;
  _sort(state.myNotes);
  _persist();

  if (!state.currentUser) return { success: true };

  const { error } = await supabase
    .from('notes')
    .update({ title, sections, tags, pinned, is_public: updated.isPublic, updated_at: updated.updatedAt })
    .eq('id', id)
    .eq('user_id', state.currentUser.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Toggle pin ────────────────────────────────────────────────────────────────
export async function togglePin(id) {
  const note = state.myNotes.find(n => n.id === id);
  if (!note) return;
  return updateNote(id, { ...note, pinned: !note.pinned });
}

// ── Toggle public ─────────────────────────────────────────────────────────────
export async function toggleNotePublic(id) {
  const note = state.myNotes.find(n => n.id === id);
  if (!note || !state.currentUser) return;
  const newVal = !note.isPublic;
  note.isPublic = newVal;
  supabase.from('notes')
    .update({ is_public: newVal })
    .eq('id', id)
    .eq('user_id', state.currentUser.id)
    .then(() => {}).catch(() => {});
}

// ── Load public notes (all users) ─────────────────────────────────────────────
export async function loadPublicNotes() {
  if (!state.currentUser) { state.publicNotes = []; return; }
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, sections, pinned, tags, is_public, created_at, updated_at, user_profiles ( display_name )')
    .eq('is_public', true)
    .neq('user_id', state.currentUser.id)  // exclude own notes (already in My Notes)
    .order('updated_at', { ascending: false });
  if (error) { console.error('loadPublicNotes:', error.message); return; }
  state.publicNotes = (data ?? []).map(mapRow);
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteNote(id) {
  state.myNotes = state.myNotes.filter(n => n.id !== id);
  _persist();
  if (!state.currentUser) return;
  await supabase.from('notes').delete().eq('id', id).eq('user_id', state.currentUser.id);
}
