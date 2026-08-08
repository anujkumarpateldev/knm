// Speaking section data loader

export let speakingPractice = { single: [], double: [], triple: [] };
export let speakingLearnScenarios = { categories: [] };
export let speakingLearnPresent  = { categories: [] };
export let speakingLearnPast     = { categories: [] };

export async function fetchSpeakingData() {
  const [practice, scenarios, present, past] = await Promise.all([
    fetch('/speaking/practice.json').then(r => r.json()),
    fetch('/speaking/learn_scenarios.json').then(r => r.json()),
    fetch('/speaking/learn_present.json').then(r => r.json()),
    fetch('/speaking/learn_past.json').then(r => r.json()),
  ]);
  speakingPractice        = practice;
  speakingLearnScenarios  = scenarios;
  speakingLearnPresent    = present;
  speakingLearnPast       = past;
}
