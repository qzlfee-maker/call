/**
 * CRANEAPP - UI COMPONENT: REPLY PREVIEW
 * Путь: client/mobile/components/chat/replyPreview.js
 * Описание: Панель предпросмотра ответа над полем ввода.
 */

export class ReplyPreview {
    /**
     * @param {Object} options
     * @param {string} options.userName - Имя автора оригинального сообщения
     * @param {string} options.messageText - Текст оригинального сообщения
     * @param {Function} options.onCancel - Колбэк для отмены режима ответа
     */
    constructor(options = {}) {
        this.userName = options.userName || 'User';
        this.messageText = options.messageText || '';
        this.onCancel = options.onCancel || (() => {});
        this.element = null;
    }

    /**
     * Рендеринг панели
     */
    render() {
        const container = document.createElement('div');
        container.className = 'reply-preview-bar animate-slide-up';

        container.innerHTML = `
            <div class="reply-accent-line"></div>
            <div class="reply-content">
                <span class="reply-user">${this._escape(this.userName)}</span>
                <span class="reply-text">${this._escape(this.messageText)}</span>
            </div>
            <button class="reply-close-btn" aria-label="Cancel reply">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        `;

        this.element = container;

        // Обработка закрытия
        container.querySelector('.reply-close-btn').onclick = (e) => {
            e.stopPropagation();
            this.destroy();
            this.onCancel();
        };

        return container;
    }

    /**
     * Безопасный вывод текста
     */
    _escape(str) {
        if (!str) return "";
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Удаление компонента из DOM с анимацией
     */
    destroy() {
        if (this.element) {
            this.element.classList.add('animate-slide-down');
            setTimeout(() => this.element.remove(), 200);
        }
    }
}
