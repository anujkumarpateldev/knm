// Navigation registry.
// Functions are assigned in main.js after all view modules are imported,
// avoiding circular dependency issues while keeping views decoupled.
export const nav = {
  auth:           () => {},
  landing:        () => {},
  categorySelect: () => {},
  progress:       () => {},
  // KNM
  knmDashboard:   () => {},
  exam:           () => {},
  // Reading
  readingDashboard:    () => {},
  readingExam:         () => {},
  vocabDashboard:      () => {},
  vocabCards:          () => {},
  readingQuizDashboard:() => {},
  // Shared quiz flow
  quiz:           () => {},
  results:        () => {},
  flashcards:     () => {},
  // Personal word journal
  wordJournal:    () => {},
  addWord:        () => {},
  wordRevision:   () => {},
  // Admin
  adminDashboard: () => {},
  adminUsers:     () => {},
  adminWords:     () => {},
  adminTags:      () => {},
  adminEmail:     () => {},
  // Deactivated screen
  deactivated:    () => {},
  // Static pages
  privacy:  () => {},
  terms:    () => {},
  help:     () => {},
  contact:  () => {},
  // Account
  profile:  () => {},
};
