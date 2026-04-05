// Navigation registry.
// Functions are assigned in main.js after all view modules are imported,
// avoiding circular dependency issues while keeping views decoupled.
export const nav = {
  landing:        () => {},
  categorySelect: () => {},
  progress:       () => {},
  // KNM
  knmDashboard:   () => {},
  exam:           () => {},
  // Reading
  readingDashboard:    () => {},
  vocabDashboard:      () => {},
  vocabCards:          () => {},
  readingQuizDashboard:() => {},
  // Shared quiz flow
  quiz:           () => {},
  results:        () => {},
  flashcards:     () => {},
};
