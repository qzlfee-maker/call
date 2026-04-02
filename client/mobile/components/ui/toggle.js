/**
 * ================================================================================
 * CRANEAPP — REUSABLE TOGGLE COMPONENT
 * ================================================================================
 * Файл: client/mobile/components/ui/toggle.js
 * Назначение: Переключатель (Switch) для настроек приложения.
 * ================================================================================
 */

export class Toggle {
    /**
     * @param {Object} options 
     * @param {string} options.label - Текст рядом с переключателем
     * @param {boolean} options.checked - Начальное состояние
     * @param {boolean} options.disabled - Активен ли элемент
     * @param {Function} options.onToggle - Коллбэк при изменении (принимает boolean)
     */
    constructor(options = {}) {
        this.options = {
            label: '',
            checked: false,
            disabled: false,
            id: `toggle-${Math.random().toString(36).substr(2, 9)}`,
            ...options
        };

        this.element = null;
        this.checkbox = null;
    }

    render() {
        const { label, checked, disabled, id } = this.options;

        const container = document.createElement('div');
        container.className = `crane-toggle-group ${disabled ? 'is-disabled' : ''}`;

        container.innerHTML = `
            ${label ? `<label class="toggle-label" for="${id}">${label}</label>` : ''}
            <div class="toggle-switch">
                <input 
                    type="checkbox" 
                    id="${id}" 
                    ${checked ? 'checked' : ''} 
                    ${disabled ? 'disabled' : ''}
                >
                <span class="toggle-slider"></span>
            </div>
        `;

        this.element = container;
        this.checkbox = container.querySelector('input');

        this._setupEventListeners();
        return container;
    }

    _setupEventListeners() {
        this.checkbox.addEventListener('change', (e) => {
            this.options.checked = e.target.checked;
            
            // Вызываем тактильный отклик (если поддерживается устройством)
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(10);
            }

            if (this.options.onToggle) {
                this.options.onToggle(this.options.checked);
            }
        });
    }

    /**
     * Программное изменение состояния
     */
    setChecked(value) {
        this.options.checked = value;
        if (this.checkbox) {
            this.checkbox.checked = value;
        }
    }

    getValue() {
        return this.options.checked;
    }
}
