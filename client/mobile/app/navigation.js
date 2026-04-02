/**
 * ================================================================================
 * CRANEAPP — NAVIGATION ENGINE (SPA ROUTER)
 * ================================================================================
 * Файл: client/mobile/app/navigation.js
 * Назначение: Управление стэком экранов, анимациями и модальными окнами.
 * ================================================================================
 */

export class Navigation {
    constructor() {
        this.container = null;
        this.history = [];
        this.routes = {
            'login': { title: 'Вход', path: '/auth/login' },
            'register': { title: 'Регистрация', path: '/auth/register' },
            'chats': { title: 'Чаты', path: '/chats' },
            'chat': { title: 'Чат', path: '/chat/:id' },
            'profile': { title: 'Профиль', path: '/profile' },
            'settings': { title: 'Настройки', path: '/settings' },
            'call': { title: 'Звонок', path: '/call' }
        };

        this.currentRoute = null;
        this.isAnimating = false;

        // Биндинг для событий браузера
        window.onpopstate = (event) => this.handlePopState(event);
    }

    /**
     * Инициализация навигатора в конкретном DOM-элементе
     * @param {HTMLElement} targetElement 
     */
    init(targetElement) {
        this.container = targetElement;
        console.log('🚀 Navigation Engine Started');
        
        // Определяем начальный экран на основе URL или дефолта
        const path = window.location.pathname;
        this.resolveRouteFromPath(path);
    }

    /**
     * Основной метод перехода между экранами
     * @param {string} routeKey - Ключ из объекта this.routes
     * @param {Object} params - Параметры (например, chat_id)
     * @param {boolean} pushState - Нужно ли менять URL в браузере
     */
    async goTo(routeKey, params = {}, pushState = true) {
        if (this.isAnimating) return;
        if (!this.routes[routeKey]) {
            console.error(`Route ${routeKey} not found`);
            return;
        }

        const prevRoute = this.currentRoute;
        this.currentRoute = routeKey;

        // Формируем URL
        let finalPath = this.routes[routeKey].path;
        if (params.id) finalPath = finalPath.replace(':id', params.id);

        if (pushState) {
            window.history.pushState({ routeKey, params }, '', finalPath);
        }

        this.history.push({ routeKey, params });
        
        // Выполняем переход с анимацией
        await this.performTransition(routeKey, params, 'forward');
    }

    /**
     * Возврат на предыдущий экран (Back button)
     */
    async goBack() {
        if (this.history.length <= 1) return;
        
        this.isAnimating = true;
        this.history.pop(); // Удаляем текущий
        const prev = this.history[this.history.length - 1];
        
        this.currentRoute = prev.routeKey;
        window.history.replaceState({ routeKey: prev.routeKey, params: prev.params }, '', this.routes[prev.routeKey].path);

        await this.performTransition(prev.routeKey, prev.params, 'backward');
        this.isAnimating = false;
    }

    /**
     * Логика анимации и рендеринга
     */
    async performTransition(routeKey, params, direction) {
        this.isAnimating = true;

        // Создаем новый слой экрана
        const newScreen = document.createElement('div');
        newScreen.className = `screen screen-${routeKey} transition-${direction}`;
        
        // Загружаем контент экрана (динамический импорт или генерация)
        const content = await this.loadScreenContent(routeKey, params);
        newScreen.innerHTML = content;

        // Добавляем в контейнер
        this.container.appendChild(newScreen);

        // Ждем отрисовки для запуска анимации
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const oldScreen = this.container.querySelector('.screen.active');
        
        if (oldScreen) {
            oldScreen.classList.remove('active');
            oldScreen.classList.add(direction === 'forward' ? 'exit-left' : 'exit-right');
        }

        newScreen.classList.add('active');

        // Удаляем старый экран после завершения анимации (300ms согласно ui-guidelines)
        setTimeout(() => {
            if (oldScreen) oldScreen.remove();
            this.isAnimating = false;
            this.triggerLifecycle(newScreen, 'onMounted', params);
        }, 300);
    }

    /**
     * Имитация загрузки контента экрана
     * В реальной сборке здесь будет вызов функций из /screens/
     */
    async loadScreenContent(routeKey, params) {
        // Здесь мы будем подключать наши .html файлы или JS-генераторы
        // Для примера возвращаем базовую структуру
        return `
            <div class="screen-header">
                ${this.history.length > 1 ? '<button class="back-btn" onclick="app.navigation.goBack()">←</button>' : ''}
                <h1>${this.routes[routeKey].title}</h1>
            </div>
            <div class="screen-body" id="screen-body-${routeKey}">
                <div class="loader-container"><div class="crane-spinner"></div></div>
            </div>
        `;
    }

    /**
     * Вызов методов жизненного цикла экрана
     */
    triggerLifecycle(element, hook, params) {
        // Событие для конкретного экрана, чтобы он начал загружать свои данные
        const event = new CustomEvent(`screen:${hook}`, { detail: { params, element } });
        window.dispatchEvent(event);
    }

    /**
     * Управление модальными окнами (Звонки, Настройки)
     */
    openModal(modalType, data = {}) {
        const modalLayer = document.getElementById('modal-layer');
        if (!modalLayer) return;

        const modal = document.createElement('div');
        modal.className = `modal-overlay modal-${modalType}`;
        modal.innerHTML = `
            <div class="modal-container animate-bounce-in">
                <div class="modal-content" id="modal-content">
                    <p>Загрузка модального окна ${modalType}...</p>
                </div>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
        `;
        
        modalLayer.appendChild(modal);
        this.triggerLifecycle(modal, 'onModalOpen', data);
    }

    /**
     * Обработка кнопки "Назад" в браузере
     */
    handlePopState(event) {
        if (event.state && event.state.routeKey) {
            this.goTo(event.state.routeKey, event.state.params, false);
        } else {
            this.resolveRouteFromPath(window.location.pathname);
        }
    }

    /**
     * Парсинг URL для Deep Linking
     */
    resolveRouteFromPath(path) {
        if (path === '/' || path === '/chats') {
            this.goTo('chats');
        } else if (path.startsWith('/chat/')) {
            const id = path.split('/')[2];
            this.goTo('chat', { id });
        } else if (path === '/auth/login') {
            this.goTo('login');
        } else {
            this.goTo('chats'); // Fallback
        }
    }
}
