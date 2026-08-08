// src/ai/aiService.js
// Central entry point for all AI calls — streams response from Supabase Edge Function
import { supabase } from '../supabase.js';

const AI_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/**
 * Send a request to the AI proxy and stream the response.
 *
 * @param {Object} opts
 * @param {string}   opts.module    - 'quiz' | 'writing' | 'vocab' | 'reading'
 * @param {string}   opts.action    - 'hint' | 'explain' | 'grade' | 'mnemonic' | 'translate' | 'simplify'
 * @param {Object}   opts.context   - module-specific data (question object, word, etc.)
 * @param {string}   [opts.input]   - user's free text (for writing/speaking tasks)
 * @param {function} opts.onChunk   - called with (chunk, fullTextSoFar) for each streamed piece
 * @param {function} [opts.onDone]  - called with (fullText) when stream is complete
 * @param {function} [opts.onError] - called with (errorMessage) on failure
 */
export async function askAI({ module, action, context = {}, input = '', onChunk, onDone, onError }) {
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ module, action, context, input }),
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
    } catch { /* ignore parse error */ }
    onError?.(errMsg);
    return;
  }

  // Stream the response body
  const reader  = res.body?.getReader();
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
  } catch (err) {
    onError?.('Stream interrupted. Please try again.');
  }
}
