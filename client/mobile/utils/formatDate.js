/**
 * Утилита для форматирования времени в стиле мессенджера.
 * Превращает ISO-штамп в "человекочитаемый" формат.
 */

export const formatDate = {
    /**
     * Формат для списка чатов (краткий)
     * @param {string|Date} date - ISO строка или объект даты
     */
    toChatList: (date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        const dayMs = 86400000;

        // Если это сегодня - только время (12:45)
        if (diff < dayMs && d.getDate() === now.getDate()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Если это вчера - слово "Вчера"
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) {
            return 'Вчера';
        }

        // Если в пределах недели - название дня (Пн, Вт...)
        if (diff < dayMs * 7) {
            return d.toLocaleDateString([], { weekday: 'short' });
        }

        // Если старше - краткая дата (15 мар.)
        return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    },

    /**
     * Формат для пузыря сообщения (только время)
     */
    toMessageTime: (date) => {
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },

    /**
     * Формат для разделителя дат в истории переписки
     */
    toChatDivider: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString([], { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    },

    /**
     * Формат "Был в сети..."
     */
    toLastSeen: (date) => {
        if (!date) return 'недавно';
        const d = new Date(date);
        const now = new Date();
        const diff = (now - d) / 1000; // в секундах

        if (diff < 60) return 'только что';
        if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
        
        return `в ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
};
