/**
 * Reply Preview component — shown above input when replying
 */
export function createReplyPreview({ message, onCancel }) {
  const container = document.createElement('div');
  container.className = 'reply-preview';
  container.style.cssText = `
    display:flex;align-items:center;gap:10px;
    padding:8px 12px;
    background:var(--color-input-bg);
    border-top:1px solid var(--color-border);
    border-left:3px solid var(--color-primary);
    animation:crane-modal-in 0.15s ease;
  `;

  const bar = document.createElement('div');
  bar.style.cssText = `width:3px;height:100%;background:var(--color-primary);border-radius:2px;flex-shrink:0;align-self:stretch;`;

  const info = document.createElement('div');
  info.style.cssText = `flex:1;overflow:hidden;display:flex;flex-direction:column;gap:2px;`;

  const name = document.createElement('span');
  name.textContent = message.senderName || 'Unknown';
  name.style.cssText = `font-size:var(--font-size-xs);font-weight:700;color:var(--color-primary);`;

  const preview = document.createElement('span');
  preview.textContent = message.text?.slice(0, 80) || (message.type === 'image' ? '📷 Photo' : 'Media');
  preview.style.cssText = `font-size:var(--font-size-xs);color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;

  info.appendChild(name);
  info.appendChild(preview);

  const cancelBtn = document.createElement('button');
  cancelBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-text-secondary)"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
  cancelBtn.style.cssText = `background:none;border:none;cursor:pointer;padding:4px;border-radius:50%;display:flex;`;
  cancelBtn.addEventListener('click', onCancel);

  container.appendChild(bar);
  container.appendChild(info);
  container.appendChild(cancelBtn);

  return container;
}
