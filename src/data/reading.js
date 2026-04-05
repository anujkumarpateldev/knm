import { state } from '../state.js';

// Vocab modules — 11 topics
export const VOCAB_MODULES = [
  { file: 'dailyroutine.json',    id: 'daily_routine', title_en: 'Daily Routine',      title_nl: 'Dagelijkse Routine' },
  { file: 'education.json',       id: 'education',     title_en: 'Education',          title_nl: 'Onderwijs' },
  { file: 'food_drink.json',      id: 'food_drink',    title_en: 'Food & Drink',       title_nl: 'Eten & Drinken' },
  { file: 'government_rules.json',id: 'government',    title_en: 'Government & Rules', title_nl: 'Overheid & Regels' },
  { file: 'health_body.json',     id: 'health',        title_en: 'Health & Body',      title_nl: 'Gezondheid & Lichaam' },
  { file: 'home.json',            id: 'home',          title_en: 'Home',               title_nl: 'Thuis' },
  { file: 'leisure.json',         id: 'leisure',       title_en: 'Leisure',            title_nl: 'Vrije Tijd' },
  { file: 'neighbourhood.json',   id: 'neighbourhood', title_en: 'Neighbourhood',      title_nl: 'Buurt & Omgeving' },
  { file: 'shopping_money.json',  id: 'shopping',      title_en: 'Shopping & Money',   title_nl: 'Winkelen & Geld' },
  { file: 'travel_transaport.json',id: 'travel',       title_en: 'Travel & Transport', title_nl: 'Reizen & Vervoer' },
  { file: 'workjob.json',         id: 'work',          title_en: 'Work & Jobs',        title_nl: 'Werk & Banen' },
];

// Reading quiz modules — 9 topics (files with questions)
export const QUESTION_MODULES = [
  { file: 'dailyroutine.json',    id: 'rq_daily',      title_en: 'Daily Routine',      title_nl: 'Dagelijkse Routine' },
  { file: 'education.json',       id: 'rq_education',  title_en: 'Education',          title_nl: 'Onderwijs' },
  { file: 'food_drink.json',      id: 'rq_food',       title_en: 'Food & Drink',       title_nl: 'Eten & Drinken' },
  { file: 'government_rules.json',id: 'rq_government', title_en: 'Government & Rules', title_nl: 'Overheid & Regels' },
  { file: 'health_body.json',     id: 'rq_health',     title_en: 'Health & Body',      title_nl: 'Gezondheid & Lichaam' },
  { file: 'home.json',            id: 'rq_home',       title_en: 'Home',               title_nl: 'Thuis' },
  { file: 'leisure.json',         id: 'rq_leisure',    title_en: 'Leisure',            title_nl: 'Vrije Tijd' },
  { file: 'travel_transaport.json',id: 'rq_travel',    title_en: 'Travel & Transport', title_nl: 'Reizen & Vervoer' },
  { file: 'workjob.json',         id: 'rq_work',       title_en: 'Work & Jobs',        title_nl: 'Werk & Banen' },
];

async function fetchJson(url, label) {
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${label}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON parse error for ${label}: ${e.message}`);
  }
}

export async function fetchReadingData() {
  const [vocabResults, questionResults] = await Promise.all([
    // Vocab
    Promise.all(VOCAB_MODULES.map(async mod => {
      const data = await fetchJson(`/reading/vocab/${mod.file}`, mod.file);
      return { ...mod, vocabulary_list: data.vocabulary_list || [] };
    })),
    // Reading quiz questions
    Promise.all(QUESTION_MODULES.map(async mod => {
      const data = await fetchJson(`/reading/questions/${mod.file}`, mod.file);
      return {
        module_id:       mod.id,
        module_title_en: mod.title_en,
        module_title_nl: mod.title_nl,
        questions:       (data.questions || []).map(q => ({ ...q, _readingQuiz: true })),
      };
    })),
  ]);

  state.readingVocab      = vocabResults;
  state.readingQuestions  = questionResults.filter(m => m.questions.length > 0);
}

export function getVocabLearnedCount(moduleId) {
  const prog = state.userProgress[`READING:vocab:${moduleId}`];
  if (!prog) return 0;
  return Object.values(prog).filter(Boolean).length;
}

export function getReadingQuizProgress(moduleId) {
  const prog = state.userProgress[moduleId];
  if (!prog) return { completed: 0 };
  return { completed: Object.keys(prog).length };
}
