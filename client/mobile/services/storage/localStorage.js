/**
 * Сервис постоянного хранения данных (Persistent Storage).
 * Обертка над браузерным LocalStorage с поддержкой JSON и префиксов.
 */

const APP_PREFIX = 'crane_';

class LocalStorageService {
    /**
     * Сохранить данные
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(`${APP_PREFIX}${key}`, serializedValue);
        } catch (error) {
            console.error(`[Storage] Error saving ${key}:`, error);
            // Обработка переполнения квоты (обычно 5MB)
            if (error.name === 'QuotaExceededError') {
                this.clearOldData();
            }
        }
    }

    /**
     * Получить данные
     * @param {string} key 
     * @param {any} defaultValue 
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`${APP_PREFIX}${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`[Storage] Error reading ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Удалить конкретный ключ
     */
    remove(key) {
        localStorage.removeItem(`${APP_PREFIX}${key}`);
    }

    /**
     * Полная очистка данных приложения (например, при Logout)
     */
    clear() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(APP_PREFIX))
            .forEach(key => localStorage.removeItem(key));
        console.log('[Storage] App data cleared');
    }

    /**
     * Вспомогательный метод для очистки места
     * Удаляет старые кэшированные сообщения, оставляя токены и настройки
     */
    clearOldData() {
        console.warn('[Storage] Quota exceeded, cleaning messages cache...');
        this.remove('messages_cache');
    }

    /**
     * Проверка наличия ключа
     */
    has(key) {
        return localStorage.getItem(`${APP_PREFIX}${key}`) !== null;
    }
}

// Экспортируем синглтон
export const storage = new LocalStorageService();
