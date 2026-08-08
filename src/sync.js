import { state } from './state.js';
import { supabase } from './supabase.js';
import { saveToStorage } from './storage.js';

// ── Write ────────────────────────────────────────────────────────────────────
// Fire-and-forget: upsert a single progress item for the logged-in user.
// Called automatically via the sync hook set in main.js.
export async function syncProgressItem(domain, moduleId, itemId, value) {
  if (!state.currentUser) return;
  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id:    state.currentUser.id,
      domain,
      module_id:  moduleId,
      item_id:    itemId,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,domain,module_id,item_id' }
  );
  if (error) console.warn('[sync] upsert failed:', error.message);
}

// ── Read ─────────────────────────────────────────────────────────────────────
// Pull all progress rows from Supabase and merge into local state.
// Merge strategy: any `true` value wins — progress is never un-marked remotely.
// Runs on login and on session restore.
export async function pullAndMergeProgress(userId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('domain, module_id, item_id, value')
    .eq('user_id', userId);

  if (error) { console.warn('[sync] pull failed:', error.message); return; }
  if (!data?.length) return;

  data.forEach(row => {
    const key = `${row.domain}:${row.module_id}`;
    if (!state.userProgress[key]) state.userProgress[key] = {};
    if (row.value) state.userProgress[key][row.item_id] = true;
  });

  saveToStorage(); // persist merged result to localStorage
}
