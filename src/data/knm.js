import { state } from '../state.js';

const FILES = [
  'module_1_werk_en_inkomen.json',
  'module_2_omgangsvormen.json',
  'module_3_wonen (1).json',
  'module_4_gezondheid.json',
  'module_5_geschiedenis.json',
  'module_6_instanties.json',
  'module_7_staatsinrichting.json',
  'module_8_opvoeding.json',
];

export async function fetchKNMModules() {
  const results = await Promise.all(
    FILES.map(async file => {
      const res = await fetch(`/questions/${file}`);
      if (!res.ok) throw new Error(`KNM fetch failed (${res.status}): ${file}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`KNM JSON parse failed for ${file}: ${e.message} | starts with: ${text.slice(0, 60)}`);
      }
    })
  );
  state.knmModules = results.sort((a, b) =>
    a.module_id.localeCompare(b.module_id, undefined, { numeric: true })
  );
}

// KNM progress uses bare module IDs (M1, M2 …) for backward-compat with saved data
export function getKNMModuleProgress(moduleId) {
  const prog = state.userProgress[moduleId];
  if (!prog) return { completed: 0 };
  return { completed: Object.keys(prog).length };
}
