/**
 * CRANEAPP MAIN ENTRY POINT
 * Основной контроллер инициализации приложения
 */

import { authProvider } from '../client/mobile/app/providers/authProvider.js';
import { themeProvider } from '../client/mobile/app/providers/themeProvider.js';
import { socketProvider } from '../client/mobile/app/providers/socketProvider.js';
import { navigation } from '../client/mobile/app/navigation.js';

class CraneApp {
    constructor() {
        this.config = {
            apiUrl: window.location.origin + '/api',
            wsUrl: window.location.origin.replace(/^http/, 'ws')
        };
    }

    async init() {
        console.log('🏗️  Initializing Craneapp...');

        try {
            // 1. Инициализация темы (Мгновенно, чтобы избежать вспышки белого)
            themeProvider.init();

            // 2. Проверка сессии (Запрос к auth-service через Gateway)
            const user = await authProvider.checkAuth();

            if (!user) {
                // Если не авторизован — отправляем на login.html
                navigation.navigate('auth/login');
                return;
            }

            // 3. Если авторизован — подключаем WebSocket
            await socketProvider.connect(this.config.wsUrl, user.token);

            // 4. Запускаем основной роутер (загружаем chats.html по умолчанию)
            navigation.init();
            
            // Скрываем начальный загрузчик из index.html
            this.hideSplashScreen();

            console.log(`✅ Welcome back, ${user.displayName || 'User'}`);

        } catch (error) {
            console.error('❌ Critical Init Error:', error);
            this.handleCriticalError();
        }
    }

    hideSplashScreen() {
        const loader = document.querySelector('.initial-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    }

    handleCriticalError() {
        document.getElementById('app-root').innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--error);">
                <h2>Ошибка запуска</h2>
                <p>Не удалось соединиться с сервером Railway.</p>
                <button onclick="location.reload()" style="margin-top: 10px;">Повторить</button>
            </div>
        `;
    }
}

// Создаем экземпляр и запускаем
const app = new CraneApp();
window.addEventListener('DOMContentLoaded', () => app.init());

export default app;
