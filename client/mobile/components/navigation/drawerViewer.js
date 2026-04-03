/**
 * CRANEAPP - UI COMPONENT: DRAWER MENU
 * Путь: client/mobile/components/navigation/drawerMenu.js
 * Описание: Боковая панель навигации (Side Menu) с профилем пользователя.
 */

export class DrawerMenu {
    /**
     * @param {Object} options
     * @param {Object} options.user - Данные текущего пользователя {name, phone, avatar}
     * @param {Array} options.items - Список пунктов меню [{id, icon, label, onClick}]
     */
    constructor(options = {}) {
        this.user = options.user || { name: 'User', phone: '+7 000 ...', avatar: '' };
        this.items = options.items || [];
        this.overlay = null;
        this.drawer = null;
    }

    /**
     * Рендеринг и открытие меню
     */
    show() {
        // Создаем фон-затемнение
        this.overlay = document.createElement('div');
        this.overlay.className = 'drawer-overlay fade-in';

        // Создаем саму панель
        this.drawer = document.createElement('aside');
        this.drawer.className = 'drawer-content slide-in-left';

        this.drawer.innerHTML = `
            <div class="drawer-header">
                <div class="drawer-user-info">
                    <img src="${this.user.avatar || '/assets/images/default-avatar.png'}" class="drawer-avatar" alt="Avatar">
                    <div class="drawer-text">
                        <span class="drawer-name">${this._escape(this.user.name)}</span>
                        <span class="drawer-phone">${this._escape(this.user.phone)}</span>
                    </div>
                </div>
            </div>
            <div class="drawer-body">
                <nav class="drawer-nav"></nav>
            </div>
            <div class="drawer-footer">
                <span class="version-tag">Craneapp v1.0.4</span>
            </div>
        `;

        const nav = this.drawer.querySelector('.drawer-nav');
        
        // Рендерим пункты меню
        this.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'drawer-item';
            el.innerHTML = `
                <span class="drawer-item-icon">${item.icon}</span>
                <span class="drawer-item-label">${item.label}</span>
            `;
            el.onclick = () => {
                item.onClick();
                this.close();
            };
            nav.appendChild(el);
        });

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.drawer);

        // Закрытие при клике на оверлей
        this.overlay.onclick = () => this.close();
    }

    close() {
        if (!this.drawer) return;
        this.drawer.classList.add('slide-out-left');
        this.overlay.classList.add('fade-out');

        setTimeout(() => {
            this.drawer.remove();
            this.overlay.remove();
            this.drawer = null;
            this.overlay = null;
        }, 300);
    }

    _escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
