// ── showErrorView ────────────────────────────────────────────────────────────
// Renders a friendly error card in #main-content.
// If retryFn is provided, a "Try Again" button is shown.
export function showErrorView(title, message, retryFn = null) {
  const warnIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  document.getElementById('main-content').innerHTML = `
    <div class="view active">
      <div class="error-view">
        <div class="error-icon">${warnIcon}</div>
        <h2 class="error-title">${title}</h2>
        <p class="error-body">${message}</p>
        ${retryFn ? `<button class="btn-primary" id="btn-error-retry">Try Again</button>` : ''}
      </div>
    </div>
  `;

  if (retryFn) {
    document.getElementById('btn-error-retry').addEventListener('click', retryFn);
  }
}

// ── friendlyFetchError ───────────────────────────────────────────────────────
// Maps raw fetch / network errors to a { title, message } pair for display.
export function friendlyFetchError(err) {
  const msg = (err?.message ?? '').toLowerCase();

  if (!navigator.onLine || msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return {
      title:   'No internet connection',
      message: 'Please check your connection and try again.',
    };
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return {
      title:   'Content not found',
      message: 'Some question files could not be loaded. Please try again.',
    };
  }
  if (msg.includes('json') || msg.includes('parse')) {
    return {
      title:   'Data error',
      message: 'A content file appears to be corrupted. Please try again or contact support.',
    };
  }
  if (msg.includes('500') || msg.includes('503') || msg.includes('server')) {
    return {
      title:   'Server unavailable',
      message: 'The server is temporarily unavailable. Please try again in a moment.',
    };
  }
  return {
    title:   'Something went wrong',
    message: 'An unexpected error occurred. Please refresh the page or try again.',
  };
}
