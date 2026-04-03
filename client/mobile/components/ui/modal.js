/**
 * Modal / Dialog UI component
 */

const openModals = [];

function ensureStyles() {
  if (document.getElementById('crane-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'crane-modal-styles';
  style.textContent = `
    @keyframes crane-modal-in {
      from { opacity:0; transform:scale(0.92) translateY(12px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    @keyframes crane-modal-out {
      from { opacity:1; transform:scale(1) translateY(0); }
      to   { opacity:0; transform:scale(0.92) translateY(12px); }
    }
    @keyframes crane-overlay-in {
      from { opacity:0; }
      to   { opacity:1; }
    }
    .crane-modal-content {
      animation: crane-modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    .crane-modal-content.closing {
      animation: crane-modal-out 0.18s ease forwards;
    }
    .crane-modal-overlay {
      animation: crane-overlay-in 0.18s ease forwards;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Creates and shows a modal dialog
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string|HTMLElement} [options.content]
 * @param {Array} [options.actions]
 * @param {boolean} [options.closable=true]
 * @param {Function} [options.onClose]
 * @param {string} [options.size=md] sm|md|lg|fullscreen
 * @returns {{ el: HTMLElement, close: Function }}
 */
export function createModal({
  title = '',
  content = '',
  actions = [],
  closable = true,
  onClose = null,
  size = 'md',
  className = '',
}) {
  ensureStyles();

  const widthMap = { sm: '360px', md: '480px', lg: '640px', fullscreen: '100%' };
  const width = widthMap[size] || widthMap.md;

  const overlay = document.createElement('div');
  overlay.className = 'crane-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;
    z-index:1000;
    padding:16px;
    backdrop-filter:blur(4px);
  `;

  const modal = document.createElement('div');
  modal.className = `crane-modal-content ${className}`.trim();
  modal.style.cssText = `
    background:var(--color-panel);
    border:1px solid var(--color-border);
    border-radius:var(--radius-lg);
    width:${size === 'fullscreen' ? '100vw' : width};
    max-height:${size === 'fullscreen' ? '100vh' : '85vh'};
    display:flex;flex-direction:column;
    overflow:hidden;
    box-shadow:0 24px 80px rgba(0,0,0,0.5);
  `;

  // Header
  if (title || closable) {
    const header = document.createElement('div');
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:20px 24px 0;
      flex-shrink:0;
    `;

    if (title) {
      const titleEl = document.createElement('h3');
      titleEl.textContent = title;
      titleEl.style.cssText = `
        margin:0;
        font-size:var(--font-size-lg);
        color:var(--color-text);
        font-weight:600;
      `;
      header.appendChild(titleEl);
    }

    if (closable) {
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-text-secondary)"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;
        padding:4px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        transition:background var(--transition);
        margin-left:auto;
      `;
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'var(--color-hover)'; });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
      closeBtn.addEventListener('click', close);
      header.appendChild(closeBtn);
    }

    modal.appendChild(header);
  }

  // Body
  const body = document.createElement('div');
  body.style.cssText = `
    padding:20px 24px;
    flex:1;overflow-y:auto;
    color:var(--color-text);
    font-size:var(--font-size-md);
    line-height:1.6;
  `;

  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  modal.appendChild(body);

  // Footer
  if (actions.length > 0) {
    const footer = document.createElement('div');
    footer.style.cssText = `
      display:flex;justify-content:flex-end;gap:10px;
      padding:0 24px 20px;flex-shrink:0;
      flex-wrap:wrap;
    `;

    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.style.cssText = `
        padding:10px 20px;
        border-radius:var(--radius-md);
        font-size:var(--font-size-md);
        font-weight:500;
        cursor:pointer;
        border:none;
        transition:opacity var(--transition),background var(--transition);
      `;

      if (action.variant === 'danger') {
        btn.style.background = 'var(--color-danger)';
        btn.style.color = '#fff';
      } else if (action.variant === 'primary') {
        btn.style.background = 'var(--color-primary)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'var(--color-border)';
        btn.style.color = 'var(--color-text)';
      }

      btn.addEventListener('click', () => {
        action.onClick?.();
        if (action.closeOnClick !== false) close();
      });

      footer.appendChild(btn);
    });

    modal.appendChild(footer);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  openModals.push(overlay);

  if (closable) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  document.addEventListener('keydown', _escHandler);

  function _escHandler(e) {
    if (e.key === 'Escape' && closable) close();
  }

  function close() {
    modal.classList.add('closing');
    modal.addEventListener('animationend', () => {
      overlay.remove();
      const idx = openModals.indexOf(overlay);
      if (idx > -1) openModals.splice(idx, 1);
      document.removeEventListener('keydown', _escHandler);
      onClose?.();
    }, { once: true });
  }

  return { el: overlay, close, body };
}

/**
 * Shows a simple confirmation dialog
 */
export function showConfirm({ title = 'Confirm', message = '', onConfirm, onCancel, danger = false }) {
  return createModal({
    title,
    content: `<p style="color:var(--color-text-secondary);margin:0;">${message}</p>`,
    actions: [
      { label: 'Cancel', variant: 'secondary', onClick: onCancel },
      { label: 'Confirm', variant: danger ? 'danger' : 'primary', onClick: onConfirm },
    ],
  });
}

/**
 * Shows a toast notification
 */
export function showToast({ message = '', type = 'info', duration = 3000 }) {
  const colors = {
    info: 'var(--color-primary)',
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: '#ff9800',
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;left:50%;
    transform:translateX(-50%) translateY(0);
    background:var(--color-panel);
    color:var(--color-text);
    border-left:3px solid ${colors[type] || colors.info};
    padding:12px 20px;
    border-radius:var(--radius-md);
    font-size:var(--font-size-md);
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    z-index:9999;
    max-width:320px;
    text-align:center;
    animation:crane-modal-in 0.25s ease;
    transition:transform 0.3s ease,opacity 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
