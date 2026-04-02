/**
 * ================================================================================
 * CRANEAPP — REUSABLE INPUT COMPONENT
 * ================================================================================
 * Файл: client/mobile/components/ui/input.js
 * Назначение: Управляемое поле ввода с поддержкой иконок, масок и валидации.
 * ================================================================================
 */

import iconsData from '../../assets/icons/icons.json';

export class Input {
    /**
     * @param {Object} options 
     * @param {string} options.type - 'text', 'password', 'tel', 'number', 'search'
     * @param {string} options.label - Заголовок над полем
     * @param {string} options.placeholder - Подсказка внутри
     * @param {string} options.value - Начальное значение
     * @param {string} options.icon - Ключ иконки слева
     * @param {string} options.error - Сообщение об ошибке
     * @param {Function} options.onChange - Коллбэк при вводе
     */
    constructor(options = {}) {
        this.options = {
            type: 'text',
            label: '',
            placeholder: '',
            value: '',
            icon: null,
            error: null,
            id: `input-${Math.random().toString(36).substr(2, 9)}`,
            ...options
        };

        this.element = null;
        this.inputElement = null;
    }

    /**
     * Рендеринг компонента
     */
    render() {
        const { type, label, placeholder, value, icon, id } = this.options;

        const container = document.createElement('div');
        container.className = 'crane-input-group';
        container.id = `group-${id}`;

        container.innerHTML = `
            ${label ? `<label class="input-label" for="${id}">${label}</label>` : ''}
            <div class="input-wrapper">
                ${icon ? `<div class="input-icon-prefix">${this._getIconSvg(icon)}</div>` : ''}
                <input 
                    id="${id}"
                    type="${type}" 
                    class="input-field ${icon ? 'has-prefix' : ''}" 
                    placeholder="${placeholder}"
                    value="${value}"
                    autocomplete="off"
                >
                ${type === 'password' ? `<div class="input-icon-suffix password-toggle">${this._getIconSvg('more')}</div>` : ''}
                <div class="input-bottom-line"></div>
            </div>
            <div class="input-error-text">${this.options.error || ''}</div>
        `;

        this.element = container;
        this.inputElement = container.querySelector('input');

        this._setupEventListeners();
        return container;
    }

    /**
     * Настройка внутренних событий
     */
    _setupEventListeners() {
        // Обработка ввода
        this.inputElement.addEventListener('input', (e) => {
            this.options.value = e.target.value;
            if (this.options.error) this.setError(null); // Сбрасываем ошибку при вводе
            if (this.options.onChange) this.options.onChange(e.target.value);
        });

        // Эффект фокуса
        this.inputElement.addEventListener('focus', () => {
            this.element.classList.add('is-focused');
        });

        this.inputElement.addEventListener('blur', () => {
            this.element.classList.remove('is-focused');
        });

        // Переключатель видимости пароля
        const toggle = this.element.querySelector('.password-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const isPassword = this.inputElement.type === 'password';
                this.inputElement.type = isPassword ? 'text' : 'password';
                toggle.style.opacity = isPassword ? '1' : '0.5';
            });
        }
    }

    /**
     * Установка текста ошибки
     * @param {string|null} msg 
     */
    setError(msg) {
        this.options.error = msg;
        const errorDiv = this.element.querySelector('.input-error-text');
        if (msg) {
            this.element.classList.add('has-error');
            errorDiv.innerText = msg;
        } else {
            this.element.classList.remove('has-error');
            errorDiv.innerText = '';
        }
    }

    getValue() {
        return this.inputElement.value;
    }

    clear() {
        this.inputElement.value = '';
        this.options.value = '';
        this.setError(null);
    }

    _getIconSvg(iconKey) {
        // Поиск пути иконки в подгруженном JSON (логика аналогична Button)
        const path = iconsData.icons.chat[iconKey] || iconsData.icons.nav[iconKey] || iconsData.icons.actions[iconKey];
        if (!path) return '';
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"></path></svg>`;
    }
}
