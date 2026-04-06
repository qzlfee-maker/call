/**
 * Global Theme Manager
 * Синхронизирует настройки темы между устройствами
 */

(function() {
    const defaultSettings = {
        theme: 'dark',
        accentColor: '#FF007F'
    };

    function getSettings() {
        const saved = localStorage.getItem('craneapp_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
    }

    function saveSettingsLocal(settings) {
        localStorage.setItem('craneapp_settings', JSON.stringify(settings));
    }

    function applyTheme() {
        const settings = getSettings();
        
        // Применяем тему
        document.documentElement.setAttribute('data-theme', settings.theme);
        
        // Применяем цвет акцента
        document.documentElement.style.setProperty('--accent-color', settings.accentColor);
        document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${settings.accentColor}, #9D00FF)`);
        
        console.log('🎨 Theme applied:', settings.theme, settings.accentColor);
    }

    // Синхронизация с сервером
    async function syncWithServer() {
        const token = localStorage.getItem('craneapp_auth_token');
        if (!token) return;

        try {
            const res = await fetch('/api/v1/users/settings', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (res.ok) {
                const data = await res.json();
                const serverSettings = data.settings || {};
                
                const localSettings = getSettings();
                
                // Объединяем: сервер имеет приоритет
                const mergedSettings = {
                    theme: serverSettings.theme || localSettings.theme,
                    accentColor: serverSettings.accentColor || localSettings.accentColor
                };
                
                saveSettingsLocal(mergedSettings);
                applyTheme();
                
                console.log('🔄 Settings synced from server');
            }
        } catch (e) {
            console.warn('⚠️ Settings sync failed:', e);
        }
    }

    // Сохранение настроек на сервер
    async function saveSettingsToServer(settings) {
        const token = localStorage.getItem('craneapp_auth_token');
        if (!token) return;

        try {
            await fetch('/api/v1/users/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(settings)
            });
            
            console.log('✅ Settings saved to server');
        } catch (e) {
            console.warn('⚠️ Failed to save settings to server:', e);
        }
    }

    // Обновить тему (для вызова снаружи)
    async function updateTheme(theme) {
        const settings = getSettings();
        settings.theme = theme;
        saveSettingsLocal(settings);
        applyTheme();
        await saveSettingsToServer(settings);
    }

    // Обновить цвет акцента (для вызова снаружи)
    async function updateAccentColor(color) {
        const settings = getSettings();
        settings.accentColor = color;
        saveSettingsLocal(settings);
        applyTheme();
        await saveSettingsToServer(settings);
    }

    // Применяем локальную тему сразу
    applyTheme();

    // Синхронизируем с сервером после загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncWithServer);
    } else {
        syncWithServer();
    }

    // Применяем при возврате на страницу
    window.addEventListener('pageshow', () => {
        applyTheme();
        syncWithServer();
    });

    // Глобальные функции
    window.applyTheme = applyTheme;
    window.syncThemeWithServer = syncWithServer;
    window.updateTheme = updateTheme;
    window.updateAccentColor = updateAccentColor;
})();