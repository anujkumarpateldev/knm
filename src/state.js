// Global application state — single source of truth
export const state = {
  // Loaded data
  knmModules: [],
  readingVocab: [],      // [{ id, title_en, title_nl, vocabulary_list }]
  readingQuestions: [],  // reserved for future reading quiz

  // Navigation context
  currentCategory: null,  // 'KNM' | 'READING'
  currentMode: null,      // 'PRACTICE' | 'EXAM'

  // Quiz state
  currentModule: null,
  currentQuestionIndex: 0,
  isExamMode: false,
  hasAnsweredCurrent: false,

  // Vocab state
  currentVocabSet: null,   // { id, title_en, title_nl, vocabulary_list }
  currentVocabIndex: 0,

  // Session tracking
  sessionStats: { correct: 0, wrong: 0 },
  sessionWrongQuestions: [],
  flashcardIndex: 0,

  // Persistence
  userProgress: {},       // { 'M1': { Q001: true }, 'READING:vocab:daily': { w0: true } }
  activityHistory: [],    // [{ mode, title, score, timestamp, passed }]

  // Exam timer
  examTimeRemaining: 45 * 60,
  timerInterval: null,
};
