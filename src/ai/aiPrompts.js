// src/ai/aiPrompts.js
// Context builders — each module call site uses these to construct the context object
// passed to askAI(). Keeps prompt logic co-located with the data shape.

/**
 * Build context for a quiz hint (before the student answers).
 * @param {Object} question - question object from knm or reading data
 */
export function quizHintContext(question) {
  return {
    question_nl: question.question_nl,
    question_en: question.question_en,
    options: question.options?.map(o => `${o.id}. ${o.text_nl}`).join(' | '),
    type: question.type,
  };
}

/**
 * Build context for explaining a wrong answer.
 * @param {Object} question    - question object
 * @param {string} userAnswer  - the option the student chose
 */
export function quizExplainContext(question, userAnswer) {
  return {
    question_nl:    question.question_nl,
    question_en:    question.question_en,
    correct_answer: question.correct_answer,
    user_answer:    userAnswer,
    options: question.options?.map(o => `${o.id}. ${o.text_nl}`).join(' | '),
  };
}

/**
 * Build context for writing feedback / grading.
 * @param {string} task       - the writing task prompt shown to the student
 * @param {string} userText   - the student's Dutch writing
 */
export function writingGradeContext(task, userText) {
  return {
    task,
    // userText is passed as `input` to askAI(), not in context
  };
}

/**
 * Build context for a vocabulary mnemonic.
 * @param {Object} vocabItem - { dutch, english } or { word_nl, word_en }
 */
export function vocabMnemonicContext(vocabItem) {
  return {
    dutch_word:   vocabItem.dutch   ?? vocabItem.word_nl,
    english_word: vocabItem.english ?? vocabItem.word_en,
  };
}

/**
 * Build context for in-sentence word translation.
 * @param {string} word     - the Dutch word tapped
 * @param {string} sentence - the full Dutch sentence it appeared in
 */
export function vocabTranslateContext(word, sentence) {
  return { word, sentence };
}

/**
 * Build context for simplifying a Dutch reading passage.
 * @param {string} text - the Dutch source text
 */
export function readingSimplifyContext(text) {
  return { text };
}

/**
 * Build context for a reading comprehension hint.
 * @param {Object} question - reading question object
 * @param {string} passage  - the Dutch source text associated with the question
 */
export function readingHintContext(question, passage) {
  return {
    question_nl: question.question_nl,
    question_en: question.question_en,
    passage,
  };
}

/**
 * Build context for speaking answer evaluation.
 * @param {string}   questionText   - the Dutch exam question shown to the student
 * @param {string[]} expectedAnswer - array of model answer sentences
 * @param {string}   transcript     - what the student said (from SpeechRecognition or manual input)
 */
export function speakingEvalContext(questionText, expectedAnswer, transcript) {
  return {
    question:        questionText,
    expected_answer: expectedAnswer.join('\n'),
    transcript,
  };
}
