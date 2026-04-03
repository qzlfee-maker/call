import { storage } from '../services/storage/localStorage.js';

/**
 * Хранилище сообщений для активных чатов.
 * Поддерживает кэширование последних сообщений для быстрого открытия.
 */

class MessageStore {
    constructor() {
        // Структура: { [chatId]: [messages] }
        this._messagesByChat = storage.get('messages_cache', {});
        this._listeners = [];
    }

    /**
     * Получить сообщения для конкретного чата
     */
    getMessages(chatId) {
        return this._messagesByChat[chatId] || [];
    }

    /**
     * Массовая установка сообщений (например, после загрузки истории с Railway)
     */
    setMessages(chatId, messages, isAppend = false) {
        if (isAppend) {
            // Добавляем старые сообщения в начало (для пагинации вверх)
            const current = this._messagesByChat[chatId] || [];
            this._messagesByChat[chatId] = [...messages, ...current];
        } else {
            // Полная перезагрузка или первая загрузка
            this._messagesByChat[chatId] = messages;
        }
        
        this._saveAndNotify();
    }

    /**
     * Добавить одно сообщение (входящее или только что отправленное)
     */
    addMessage(message) {
        const { chatId } = message;
        if (!this._messagesByChat[chatId]) {
            this._messagesByChat[chatId] = [];
        }

        // Проверка на дубликаты (чтобы избежать повторов при медленном сокете)
        const exists = this._messagesByChat[chatId].find(m => m.id === message.id || m.tempId === message.tempId);
        if (exists) {
            // Если сообщение уже есть (например, подтверждение отправки), обновляем его
            Object.assign(exists, message);
        } else {
            this._messagesByChat[chatId].push(message);
        }

        this._saveAndNotify();
    }

    /**
     * Обновить статус прочтения
     */
    markAsRead(chatId, messageIds) {
        const messages = this._messagesByChat[chatId];
        if (messages) {
            messages.forEach(m => {
                if (messageIds.includes(m.id)) m.status = 'read';
            });
            this._saveAndNotify();
        }
    }

    /**
     * Удаление сообщения из локального стора
     */
    removeMessage(chatId, messageId) {
        if (this._messagesByChat[chatId]) {
            this._messagesByChat[chatId] = this._messagesByChat[chatId]
                .filter(m => m.id !== messageId);
            this._saveAndNotify();
        }
    }

    /**
     * Очистка кэша сообщений (при выходе или нехватке места)
     */
    clear() {
        this._messagesByChat = {};
        storage.remove('messages_cache');
        this._notify();
    }

    _saveAndNotify() {
        // Сохраняем в localStorage только последние 20 сообщений каждого чата для кэша
        const cacheToSave = {};
        for (const [id, msgs] of Object.entries(this._messagesByChat)) {
            cacheToSave[id] = msgs.slice(-20);
        }
        storage.set('messages_cache', cacheToSave);
        this._notify();
    }

    subscribe(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    }

    _notify() {
        this._listeners.forEach(callback => callback(this._messagesByChat));
    }
}

export const messageStore = new MessageStore();
