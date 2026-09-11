/**
 * アプリ内モーダルダイアログ / トースト
 * window.alert / confirm はLINEアプリ内ブラウザ等で表示が抑制されることがあるため、
 * 自前のモーダルで統一する。
 */

function showDialog({ title, message, buttons }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    const box = document.createElement('div');
    box.className = 'dialog-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    const titleEl = document.createElement('div');
    titleEl.className = 'dialog-title';
    titleEl.textContent = title;
    box.appendChild(titleEl);

    if (message) {
      const messageEl = document.createElement('div');
      messageEl.className = 'dialog-message';
      messageEl.textContent = message;
      box.appendChild(messageEl);
    }

    const buttonRow = document.createElement('div');
    buttonRow.className = 'dialog-buttons';
    for (const button of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `dialog-button ${button.className ?? ''}`;
      btn.textContent = button.text;
      btn.addEventListener('click', () => {
        overlay.remove();
        resolve(button.value);
      });
      buttonRow.appendChild(btn);
    }
    box.appendChild(buttonRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

/** @returns {Promise<void>} */
export function showAlert(title, message) {
  return showDialog({
    title,
    message,
    buttons: [{ text: 'OK', value: undefined, className: 'dialog-button-primary' }],
  });
}

/**
 * @param {string} title
 * @param {string} message
 * @param {{ confirmText?: string, destructive?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
export function showConfirm(title, message, options) {
  return showDialog({
    title,
    message,
    buttons: [
      { text: 'キャンセル', value: false, className: '' },
      {
        text: options?.confirmText ?? 'OK',
        value: true,
        className: options?.destructive ? 'dialog-button-destructive' : 'dialog-button-primary',
      },
    ],
  });
}

/** 画面下部に短時間表示する通知 */
export function showToast(message, durationMs = 1800) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}
