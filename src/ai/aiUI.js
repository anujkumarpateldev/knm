// src/ai/aiUI.js
// Reusable streaming AI response panel — inject into any view, stream chunks into it.

const SPARKLE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2 L13.5 9 L20 10 L13.5 11 L12 18 L10.5 11 L4 10 L10.5 9 Z"/>
</svg>`;

/**
 * Inject an AI panel into a container element and return control functions.
 *
 * @param {Object} opts
 * @param {string} opts.containerId  - id of the element to inject into
 * @param {string} [opts.title]      - panel title (default: 'AI Tutor')
 * @param {boolean} [opts.append]    - if true, appends inside container instead of replacing
 *
 * @returns {{ stream, done, error, setHTML, destroy } | null}
 */
export function createAIPanel({ containerId, title = 'AI Tutor', append = false }) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const panelEl = document.createElement('div');
  panelEl.className = 'ai-panel';
  panelEl.innerHTML = `
    <div class="ai-panel-header">
      <span class="ai-panel-icon">${SPARKLE_SVG}</span>
      <span class="ai-panel-title">${title}</span>
      <span class="ai-panel-spinner" id="ai-spinner-${containerId}">
        <span></span><span></span><span></span>
      </span>
    </div>
    <div class="ai-panel-body" id="ai-body-${containerId}"></div>
  `;

  if (append) {
    container.appendChild(panelEl);
  } else {
    container.innerHTML = '';
    container.appendChild(panelEl);
  }

  const bodyEl    = () => document.getElementById(`ai-body-${containerId}`);
  const spinnerEl = () => document.getElementById(`ai-spinner-${containerId}`);

  return {
    /** Append a streamed text chunk to the panel body */
    stream(chunk) {
      const el = bodyEl();
      if (!el) return;
      // Append as text — safe from XSS
      el.appendChild(document.createTextNode(chunk));
      el.scrollTop = el.scrollHeight;
    },

    /** Replace body content with arbitrary HTML (for structured responses) */
    setHTML(html) {
      const el = bodyEl();
      if (el) el.innerHTML = html;
    },

    /** Call when streaming is complete — removes spinner */
    done() {
      spinnerEl()?.remove();
    },

    /** Show an error message in the panel */
    error(msg) {
      const el = bodyEl();
      if (el) el.innerHTML = `<span class="ai-panel-error">${escapeHtml(msg)}</span>`;
      spinnerEl()?.remove();
    },

    /** Remove the panel from the DOM */
    destroy() {
      panelEl.remove();
    },
  };
}

/**
 * Create an AI trigger button (💡 Hint, 🧠 Mnemonic, etc.)
 * Handles loading state, error recovery, and one-time-use guard.
 *
 * @param {Object} opts
 * @param {string}   opts.label       - button label HTML
 * @param {string}   opts.panelId     - container id for the AI panel
 * @param {string}   opts.panelTitle  - title for the AI panel
 * @param {function} opts.getAICall   - returns { module, action, context, input } for askAI
 * @param {boolean}  [opts.reusable]  - if true, button re-enables after response (default: false)
 *
 * @returns {HTMLButtonElement}
 */
export function createAIButton({ label, panelId, panelTitle, getAICall, reusable = false }) {
  const btn = document.createElement('button');
  btn.className    = 'btn-ai';
  btn.innerHTML    = label;
  btn.dataset.used = 'false';

  btn.addEventListener('click', async () => {
    if (btn.dataset.used === 'true' && !reusable) return;
    btn.dataset.used    = 'true';
    btn.disabled        = true;
    btn.style.opacity   = '0.6';

    // Lazy-import askAI to keep the initial bundle lean
    const { askAI } = await import('./aiService.js');
    const callOpts  = getAICall();

    const panel = createAIPanel({ containerId: panelId, title: panelTitle, append: false });
    if (!panel) {
      btn.disabled = false;
      return;
    }

    askAI({
      ...callOpts,
      onChunk: (chunk) => panel.stream(chunk),
      onDone:  ()      => {
        panel.done();
        if (reusable) {
          btn.disabled      = false;
          btn.style.opacity = '';
          btn.dataset.used  = 'false';
        }
      },
      onError: (msg)   => {
        panel.error(msg);
        btn.disabled      = false;
        btn.style.opacity = '';
        btn.dataset.used  = 'false';
      },
    });
  });

  return btn;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
