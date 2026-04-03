/**
 * CRANEAPP - UI COMPONENT: REACTION BAR
 * Путь: client/mobile/components/chat/reactionBar.js
 * Описание: Панель выбора быстрых реакций (эмодзи) для сообщений.
 */

export class ReactionBar {
    /**
     * @param {Object} options
     * @param {string} options.messageId - ID сообщения, которому ставится реакция
     * @param {Function} options.onSelect - Колбэк при выборе эмодзи
     */
    constructor(options = {}) {
        this.messageId = options.messageId;
        this.onSelect = options.onSelect || (() => {});
        this.emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🙏'];
        this.element = null;
    }

    /**
     * Рендеринг панели реакций
     */
    render() {
        const bar = document.createElement('div');
        bar.className = 'reaction-bar animate-bounce-in';

        this.emojis.forEach(emoji => {
            const item = document.createElement('button');
            item.className = 'reaction-item';
            item.innerHTML = emoji;
            
            item.onclick = (e) => {
                e.stopPropagation();
                this.onSelect(this.messageId, emoji);
                this.destroy();
            };

            bar.appendChild(item);
        });

        // Кнопка "+" для открытия полного списка (опционально)
        const plusBtn = document.createElement('button');
        plusBtn.className = 'reaction-item btn-more';
        plusBtn.innerHTML = '<span>+</span>';
        plusBtn.onclick = (e) => {
            e.stopPropagation();
            console.log("Open full emoji picker");
        };
        bar.appendChild(plusBtn);

        this.element = bar;
        return bar;
    }

    /**
     * Удаление панели
     */
    destroy() {
        if (this.element) {
            this.element.classList.add('animate-fade-out');
            setTimeout(() => this.element.remove(), 150);
        }
    }
}
