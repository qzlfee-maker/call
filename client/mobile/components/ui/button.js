export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
  SUCCESS: 'success',
  GHOST: 'ghost',
  ICON: 'icon',
};

export const BUTTON_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
};

const variantStyles = {
  primary: {
    background: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    hoverBg: 'color-mix(in srgb, var(--color-primary) 85%, #fff)',
  },
  secondary: {
    background: 'var(--color-panel)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    hoverBg: 'var(--color-hover)',
  },
  danger: {
    background: 'var(--color-danger)',
    color: '#fff',
    border: 'none',
    hoverBg: 'color-mix(in srgb, var(--color-danger) 85%, #fff)',
  },
  success: {
    background: 'var(--color-success)',
    color: '#0f0f18',
    border: 'none',
    hoverBg: 'color-mix(in srgb, var(--color-success) 85%, #fff)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    hoverBg: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
  },
  icon: {
    background: 'transparent',
    color: 'var(--color-text)',
    border: 'none',
    hoverBg: 'var(--color-hover)',
  },
};

const sizeStyles = {
  sm: { padding: '6px 14px', fontSize: 'var(--font-size-sm)', height: '32px', borderRadius: 'var(--radius-sm)' },
  md: { padding: '10px 20px', fontSize: 'var(--font-size-md)', height: '42px', borderRadius: 'var(--radius-md)' },
  lg: { padding: '14px 28px', fontSize: 'var(--font-size-lg)', height: '52px', borderRadius: 'var(--radius-md)' },
};

/**
 * Creates a button element
 * @param {Object} options
 * @param {string} options.label
 * @param {string} [options.variant=primary]
 * @param {string} [options.size=md]
 * @param {Function} options.onClick
 * @param {boolean} [options.disabled=false]
 * @param {boolean} [options.loading=false]
 * @param {string} [options.icon]
 * @param {string} [options.ariaLabel]
 * @param {boolean} [options.fullWidth=false]
 * @returns {HTMLButtonElement}
 */
export function createButton({
  label = '',
  variant = BUTTON_VARIANTS.PRIMARY,
  size = BUTTON_SIZES.MD,
  onClick,
  disabled = false,
  loading = false,
  icon = null,
  ariaLabel = null,
  fullWidth = false,
  className = '',
}) {
  const btn = document.createElement('button');
  const vs = variantStyles[variant] || variantStyles.primary;
  const ss = sizeStyles[size] || sizeStyles.md;

  btn.type = 'button';
  btn.disabled = disabled || loading;
  btn.setAttribute('aria-label', ariaLabel || label);
  btn.className = `crane-btn crane-btn--${variant} crane-btn--${size} ${className}`.trim();

  Object.assign(btn.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    background: vs.background,
    color: vs.color,
    border: vs.border || 'none',
    padding: variant === BUTTON_VARIANTS.ICON ? '8px' : ss.padding,
    fontSize: ss.fontSize,
    height: variant === BUTTON_VARIANTS.ICON ? 'auto' : ss.height,
    borderRadius: variant === BUTTON_VARIANTS.ICON ? 'var(--radius-full)' : ss.borderRadius,
    fontWeight: '500',
    transition: 'background var(--transition), opacity var(--transition), transform var(--transition)',
    opacity: disabled ? '0.5' : '1',
    width: fullWidth ? '100%' : 'auto',
    userSelect: 'none',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden',
  });

  if (loading) {
    const spinner = _createSpinner(vs.color);
    btn.appendChild(spinner);
  } else {
    if (icon) {
      const iconEl = document.createElement('img');
      iconEl.src = icon;
      iconEl.style.cssText = `width:20px;height:20px;pointer-events:none;`;
      iconEl.alt = '';
      btn.appendChild(iconEl);
    }
    if (label) {
      const span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(span);
    }
  }

  btn.addEventListener('mouseenter', () => {
    if (!btn.disabled) btn.style.background = vs.hoverBg;
  });

  btn.addEventListener('mouseleave', () => {
    if (!btn.disabled) btn.style.background = vs.background;
  });

  btn.addEventListener('mousedown', () => {
    if (!btn.disabled) btn.style.transform = 'scale(0.97)';
  });

  btn.addEventListener('mouseup', () => {
    btn.style.transform = 'scale(1)';
  });

  btn.addEventListener('click', (e) => {
    if (!btn.disabled && !loading && typeof onClick === 'function') {
      _ripple(btn, e);
      onClick(e);
    }
  });

  return btn;
}

function _createSpinner(color) {
  const spinner = document.createElement('span');
  spinner.style.cssText = `
    display:inline-block;
    width:16px;height:16px;
    border:2px solid ${color}44;
    border-top-color:${color};
    border-radius:50%;
    animation:crane-spin 0.7s linear infinite;
  `;

  if (!document.getElementById('crane-btn-styles')) {
    const style = document.createElement('style');
    style.id = 'crane-btn-styles';
    style.textContent = `@keyframes crane-spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(style);
  }

  return spinner;
}

function _ripple(btn, event) {
  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const rect = btn.getBoundingClientRect();

  Object.assign(circle.style, {
    position: 'absolute',
    width: `${diameter}px`,
    height: `${diameter}px`,
    left: `${event.clientX - rect.left - diameter / 2}px`,
    top: `${event.clientY - rect.top - diameter / 2}px`,
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '50%',
    transform: 'scale(0)',
    animation: 'crane-ripple 0.5s linear',
    pointerEvents: 'none',
  });

  if (!document.getElementById('crane-ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'crane-ripple-styles';
    style.textContent = `@keyframes crane-ripple{to{transform:scale(2.5);opacity:0}}`;
    document.head.appendChild(style);
  }

  btn.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
}

/**
 * Updates button loading state
 */
export function setButtonLoading(btn, loading) {
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.7' : '1';
  btn.style.cursor = loading ? 'not-allowed' : 'pointer';
}

/**
 * Updates button label
 */
export function setButtonLabel(btn, label) {
  const span = btn.querySelector('span');
  if (span) span.textContent = label;
}
