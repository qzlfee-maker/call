/**
 * Toggle / Switch UI component
 */

/**
 * Creates a toggle switch element
 * @param {Object} options
 * @param {boolean} [options.checked=false]
 * @param {Function} [options.onChange]
 * @param {boolean} [options.disabled=false]
 * @param {string} [options.label]
 * @param {string} [options.id]
 * @returns {HTMLElement}
 */
export function createToggle({
  checked = false,
  onChange = null,
  disabled = false,
  label = '',
  id = '',
  className = '',
}) {
  const wrapper = document.createElement('label');
  wrapper.className = `crane-toggle ${className}`.trim();
  wrapper.style.cssText = `
    display:inline-flex;
    align-items:center;
    gap:12px;
    cursor:${disabled ? 'not-allowed' : 'pointer'};
    user-select:none;
    opacity:${disabled ? '0.5' : '1'};
  `;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.disabled = disabled;
  input.id = id;
  input.style.cssText = `position:absolute;opacity:0;width:0;height:0;`;

  const track = document.createElement('div');
  track.style.cssText = `
    position:relative;
    width:48px;height:26px;
    background:${checked ? 'var(--color-primary)' : 'var(--color-border)'};
    border-radius:var(--radius-full);
    transition:background var(--transition);
    flex-shrink:0;
  `;

  const thumb = document.createElement('div');
  thumb.style.cssText = `
    position:absolute;
    top:3px;
    left:${checked ? '25px' : '3px'};
    width:20px;height:20px;
    background:#fff;
    border-radius:50%;
    transition:left var(--transition);
    box-shadow:0 2px 4px rgba(0,0,0,0.3);
  `;

  track.appendChild(thumb);
  wrapper.appendChild(input);
  wrapper.appendChild(track);

  if (label) {
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size:var(--font-size-md);
      color:var(--color-text);
    `;
    wrapper.appendChild(labelEl);
  }

  const update = (isChecked) => {
    track.style.background = isChecked ? 'var(--color-primary)' : 'var(--color-border)';
    thumb.style.left = isChecked ? '25px' : '3px';
    input.checked = isChecked;
  };

  input.addEventListener('change', () => {
    if (!disabled) {
      update(input.checked);
      onChange?.(input.checked);
    }
  });

  wrapper.isChecked = () => input.checked;
  wrapper.setChecked = (val) => { update(val); };
  wrapper.toggle = () => { update(!input.checked); onChange?.(input.checked); };

  return wrapper;
}

/**
 * Creates a radio button group
 */
export function createRadioGroup({ options = [], value = null, onChange = null, name = '' }) {
  const group = document.createElement('div');
  group.className = 'crane-radio-group';
  group.style.cssText = `display:flex;flex-direction:column;gap:8px;`;

  options.forEach((opt) => {
    const item = document.createElement('label');
    item.style.cssText = `
      display:flex;align-items:center;gap:12px;
      cursor:pointer;padding:10px;
      border-radius:var(--radius-md);
      transition:background var(--transition);
    `;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = opt.value;
    radio.checked = opt.value === value;
    radio.style.cssText = `
      width:18px;height:18px;
      accent-color:var(--color-primary);
      cursor:pointer;
    `;

    const label = document.createElement('div');
    label.style.cssText = `display:flex;flex-direction:column;gap:2px;`;

    const title = document.createElement('span');
    title.textContent = opt.label;
    title.style.cssText = `font-size:var(--font-size-md);color:var(--color-text);`;
    label.appendChild(title);

    if (opt.description) {
      const desc = document.createElement('span');
      desc.textContent = opt.description;
      desc.style.cssText = `font-size:var(--font-size-xs);color:var(--color-text-secondary);`;
      label.appendChild(desc);
    }

    radio.addEventListener('change', () => {
      if (radio.checked) onChange?.(opt.value);
    });

    item.addEventListener('mouseenter', () => { item.style.background = 'var(--color-hover)'; });
    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });

    item.appendChild(radio);
    item.appendChild(label);
    group.appendChild(item);
  });

  group.getValue = () => {
    const checked = group.querySelector('input[type=radio]:checked');
    return checked ? checked.value : null;
  };

  return group;
}
