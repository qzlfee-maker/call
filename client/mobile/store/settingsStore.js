import { storage } from '../services/storage/localStorage.js';

/**
 * Хранилище настроек приложения.
 * Управляет темами, локализацией и предпочтениями пользователя.
 */

class SettingsStore {
    constructor() {
        // Значения по умолчанию
        const defaults = {
            theme: 'dark', // 'light', 'dark', 'telegram'
            language: 'ru',
            notifications: {
                enabled: true,
                sound: true,
                preview: true
            },
            powerSaving: false,
            fontSize: 'medium' // 'small', 'medium', 'large'
        };

        // Загружаем из хранилища или используем дефолты
        this._settings = storage.get('app_settings', defaults);
        this._listeners = [];

        // Применяем тему сразу при инициализации
        this.applyTheme(this._settings.theme);
    }

    /**
     * Получить все настройки
     */
    getSettings() {
        return this._settings;
    }

    /**
     * Обновить конкретное свойство настроек
     * @param {string} key - Путь к свойству (например, 'theme' или 'notifications.sound')
     * @param {any} value 
     */
    update(key, value) {
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            this._settings[parent][child] = value;
        } else {
            this._settings[key] = value;
        }

        // Если изменилась тема — применяем её к DOM
        if (key === 'theme') {
            this.applyTheme(value);
        }

        storage.set('app_settings', this._settings);
        this._notify();
    }

    /**
     * Динамическое переключение CSS-переменных темы
     * Связано с папкой theme/themes/
     */
    async applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        
        // В Craneapp мы используем CSS-переменные для Glassmorphism.
        // Вы можете подгружать JSON с цветами и инжектить их в :root
        try {
            const themeResponse = await fetch(`../../theme/themes/${themeName}Theme.json`);
            const themeData = await themeResponse.json();
            
            const root = document.querySelector(':root');
            Object.entries(themeData.colors).forEach(([variable, color]) => {
                root.style.setProperty(`--${variable}`, color);
            });
        } catch (e) {
            console.warn(`Не удалось загрузить конфиг темы ${themeName}, используем CSS-fallback`);
        }
    }

    /**
     * Сброс до заводских настроек
     */
    reset() {
        storage.remove('app_settings');
        window.location.reload();
    }

    subscribe(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    }

    _notify() {
        this._listeners.forEach(callback => callback(this._settings));
    }
}

export const settingsStore = new SettingsStore();
