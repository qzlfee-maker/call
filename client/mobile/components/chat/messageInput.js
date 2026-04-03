/**
 * CRANEAPP - UI COMPONENT: MESSAGE INPUT
 * Путь: client/mobile/components/chat/messageInput.js
 * Описание: Поле ввода сообщения с поддержкой автовысоты и обработки событий.
 */

export class MessageInput {
    /**
     * @param {Object} options 
     * @param {Function} options.onSendMessage - Колбэк при отправке сообщения
     * @param {Function} options.onTyping - Колбэк при наборе текста (для статуса "печатает...")
     */
    constructor(options = {}) {
        this.onSendMessage = options.onSendMessage || (() => {});
        this.onTyping = options.onTyping || (() => {});
        this.element = null;
        this.textarea = null;
    }

    /**
     * Рендеринг компонента
     */
    render() {
        const container = document.createElement('div');
        container.className = 'message-input-container';

        container.innerHTML = `
            <div class="input-actions-left">
                <button class="btn-icon attachment-btn" title="Attach file">
                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.31 2.69 6 6 6s6-2.69 6-6V6h-1.5z"/></svg>
                </button>
            </div>
            <div class="input-wrapper">
                <textarea 
                    class="message-textarea" 
                    placeholder="Сообщение..." 
                    rows="1"
                ></textarea>
            </div>
            <div class="input-actions-right">
                <button class="btn-icon send-btn" id="send-message-btn" disabled>
                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        `;

        this.element = container;
        this.textarea = container.querySelector('.message-textarea');
        this.sendBtn = container.querySelector('#send-message-btn');

        this._bindEvents();
        return container;
    }

    _bindEvents() {
        // Автоматическое изменение высоты при наборе текста
        this.textarea.addEventListener('input', () => {
            this.textarea.style.height = 'auto';
            this.textarea.style.height = (this.textarea.scrollHeight) + 'px';
            
            // Активация/деактивация кнопки отправки
            const hasText = this.textarea.value.trim().length > 0;
            this.sendBtn.disabled = !hasText;
            
            this.onTyping();
        });

        // Обработка отправки по клику
        this.sendBtn.onclick = () => this._handleSend();

        // Отправка по Enter (но Shift+Enter для новой строки)
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleSend();
            }
        });
    }

    _handleSend() {
        const text = this.textarea.value.trim();
        if (text) {
            this.onSendMessage(text);
            this.textarea.value = '';
            this.textarea.style.height = 'auto';
            this.sendBtn.disabled = true;
        }
    }
}
