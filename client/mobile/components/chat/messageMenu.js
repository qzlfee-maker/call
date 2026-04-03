/**
 * CRANEAPP - UI COMPONENT: MESSAGE MENU
 * Путь: client/mobile/components/chat/messageMenu.js
 * Описание: Контекстное меню для управления конкретным сообщением.
 */

export class MessageMenu {
    /**
     * @param {Object} options
     * @param {string} options.messageId - ID целевого сообщения
     * @param {Object} options.position - Координаты появления {x, y}
     * @param {Object} options.handlers - Обработчики действий {onReply, onCopy, onDelete, onEdit}
     */
    constructor(options = {}) {
        this.messageId = options.messageId;
        this.position = options.position || { x: 0, y: 0 };
        this.handlers = options.handlers || {};
        this.element = null;
    }

    /**
     * Рендеринг меню
     */
    render() {
        const menu = document.createElement('div');
        menu.className = 'message-context-menu animate-pop-in';
        
        // Позиционирование
        menu.style.left = `${this.position.x}px`;
        menu.style.top = `${this.position.y}px`;

        const items = [
            { id: 'reply', text: 'Ответить', icon: '↩️', action: this.handlers.onReply },
            { id: 'copy', text: 'Копировать', icon: '📋', action: this.handlers.onCopy },
            { id: 'edit', text: 'Изменить', icon: '✏️', action: this.handlers.onEdit },
            { id: 'delete', text: 'Удалить', icon: '🗑️', action: this.handlers.onDelete, danger: true }
        ];

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = `menu-item ${item.danger ? 'item-danger' : ''}`;
            row.innerHTML = `
                <span class="item-icon">${item.icon}</span>
                <span class="item-text">${item.text}</span>
            `;
            
            row.onclick = (e) => {
                e.stopPropagation();
                if (item.action) item.action(this.messageId);
                this.destroy();
            };
            
            menu.appendChild(row);
        });

        this.element = menu;
        this._bindGlobalEvents();
        return menu;
    }

    /**
     * Закрытие при клике вне меню
     */
    _bindGlobalEvents() {
        const closeHandler = () => {
            this.destroy();
            document.removeEventListener('click', closeHandler);
        };
        // Таймаут, чтобы клик открытия не закрыл меню сразу
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }

    destroy() {
        if (this.element) {
            this.element.classList.add('animate-fade-out');
            setTimeout(() => this.element.remove(), 150);
        }
    }
}
