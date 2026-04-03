/**
 * Утилиты для валидации вводимых данных (Формы, Сообщения, Профиль).
 * Предотвращает отправку некорректных данных на сервер Railway.
 */

export const validators = {
    /**
     * Проверка Email
     */
    isValidEmail: (email) => {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase());
    },

    /**
     * Проверка сложности пароля
     * Минимум 8 символов, одна заглавная буква и одна цифра
     */
    isStrongPassword: (password) => {
        return password.length >= 8 && 
               /[A-Z]/.test(password) && 
               /[0-9]/.test(password);
    },

    /**
     * Проверка юзернейма (только латиница, цифры и подчеркивание)
     */
    isValidUsername: (username) => {
        const re = /^[a-zA-Z0-9_]{3,20}$/;
        return re.test(username);
    },

    /**
     * Проверка текста сообщения (не пустое и не только пробелы)
     */
    isValidMessage: (text) => {
        return text && text.trim().length > 0;
    },

    /**
     * Валидация номера телефона (международный формат)
     */
    isValidPhone: (phone) => {
        const re = /^\+?[1-9]\d{1,14}$/;
        return re.test(phone);
    },

    /**
     * Обобщенный метод для проверки полей формы
     * @param {Object} data - { email: '...', password: '...' }
     * @returns {Object} - { isValid: boolean, errors: {} }
     */
    validateForm: (data) => {
        const errors = {};
        
        if (data.email && !validators.isValidEmail(data.email)) {
            errors.email = 'Некорректный формат почты';
        }
        
        if (data.password && !validators.isStrongPassword(data.password)) {
            errors.password = 'Пароль слишком слабый';
        }

        if (data.username && !validators.isValidUsername(data.username)) {
            errors.username = '3-20 символов (латиница, цифры)';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};
