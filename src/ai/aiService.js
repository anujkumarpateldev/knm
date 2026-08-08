// src/ai/aiService.js
// Central entry point for all AI calls — streams response from Supabase Edge Function.
import { supabase } from '../supabase.js';

const AI_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/**
 * Send a request to the AI proxy and stream the response.
 *
 * @param {Object}   opts
 * @param {string}   opts.module    - 'quiz' | 'writing' | 'vocab' | 'reading' | 'speaking'
 * @param {string}   opts.action    - 'hint' | 'explain' | 'grade' | 'mnemonic' | 'translate' | 'simplify' | 'evaluate'
 * @param {Object}   opts.context   - module-specific data
 * @param {string}   [opts.input]   - user's free text
 * @param {string}   [opts.model]   - 'deepseek' | 'claude' | 'auto' (default: 'auto')
 * @param {function} opts.onChunk   - called with (chunk, fullTextSoFar) for each streamed piece
 * @param {function} [opts.onDone]  - called with (fullText) when stream is complete
 * @param {function} [opts.onError] - called with (errorMessage) on failure
 */
export async function askAI({ module, action, context = {}, input = '', model = 'auto', onChunk, onDone, onError }) {
  let session;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch {
    onError?.('Unable to verify session. Please sign in.');
    return;
  }

  if (!session) {
    onError?.('Sign in to use AI features.');
    return;
  }

  let res;
  try {
    res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ module, action, context, input, model }),
    });
  } catch {
    onError?.('Network error. Check your connection and try again.');
    return;
  }

  if (!res.ok) {
    let errMsg = 'AI request failed. Please try again.';
    try {
      const errBody = await res.json();
      if (errBody.error) errMsg = errBody.error;
    } catch { /* ignore */ }
    onError?.(errMsg);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError?.('Streaming not supported in this browser.');
    return;
  }

  const decoder  = new TextDecoder();
  let   fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk?.(chunk, fullText);
    }
    onDone?.(fullText);
  } catch {
    onError?.('Stream interrupted. Please try again.');
  }
}

/**
 * Get the user's preferred AI model from localStorage.
 * @returns {'auto' | 'deepseek' | 'claude'}
 */
export function getPreferredModel() {
  return localStorage.getItem('dutchexampro_ai_model') ?? 'auto';
}

/**
 * Save the user's preferred AI model to localStorage.
 * @param {'auto' | 'deepseek' | 'claude'} model
 */
export function setPreferredModel(model) {
  localStorage.setItem('dutchexampro_ai_model', model);
}
