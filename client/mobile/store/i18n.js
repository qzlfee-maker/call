export const i18n = {
    currentLang: 'ru',
    
    translations: {
        ru: {
            settings: 'Настройки',
            account: 'Аккаунт',
            privacy: 'Конфиденциальность',
            devices: 'Устройства',
            passcode: 'Код-пароль',
            appearance: 'Оформление',
            language: 'Язык',
            folders: 'Папки с чатами',
            notifications: 'Уведомления',
            sounds: 'Звуки',
            data: 'Данные и память',
            advanced: 'Расширенные настройки',
            premium: 'CraneApp Premium',
            help: 'Помощь',
            about: 'О приложении',
            logout: 'Выйти',
            editProfile: 'Изменить профиль',
            dark: 'Тёмная',
            light: 'Светлая',
            auto: 'Как в системе',
            small: 'Маленький',
            medium: 'Средний',
            large: 'Большой',
            russian: 'Русский',
            english: 'English',
            spanish: 'Español',
            german: 'Deutsch',
            french: 'Français',
            showOnline: 'Показывать онлайн',
            readReceipts: 'Читать подтверждения',
            lastSeen: 'Был(а) недавно',
            photoProfile: 'Фото профиля',
            forwardMessages: 'Пересылка сообщений',
            spamFilter: 'Блокировать спам',
            notificationSound: 'Звук уведомлений',
            vibration: 'Вибрация',
            showMessageText: 'Показывать текст сообщения',
            badgeIcon: 'Счётчик на иконке',
            chatNotifications: 'Уведомления в чатах',
            channelNotifications: 'Уведомления в каналах',
            theme: 'Тема',
            accentColor: 'Цвет акцента',
            fontSize: 'Размер шрифта',
            save: 'Сохранить',
            cancel: 'Отмена',
            name: 'Имя',
            surname: 'Фамилия',
            bio: 'О себе',
            username: 'Юзернейм',
            phone: 'Номер телефона',
            email: 'Email',
            password: 'Пароль',
            changePassword: 'Сменить пароль',
            deleteAccount: 'Удалить аккаунт',
            activeSessions: 'Активные сеансы',
            terminateAll: 'Завершить все другие сеансы',
            terminate: 'Завершить',
            currentDevice: 'Сейчас онлайн',
            version: 'Версия',
            build: 'Сборка',
            developer: 'Разработчик',
            license: 'Лицензия',
            sourceCode: 'Исходный код',
            reportBug: 'Сообщить об ошибке',
            requestFeature: 'Запросить функцию',
            faq: 'Частые вопросы',
            contactSupport: 'Связаться с поддержкой'
        },
        en: {
            settings: 'Settings',
            account: 'Account',
            privacy: 'Privacy',
            devices: 'Devices',
            passcode: 'Passcode',
            appearance: 'Appearance',
            language: 'Language',
            folders: 'Chat Folders',
            notifications: 'Notifications',
            sounds: 'Sounds',
            data: 'Data and Storage',
            advanced: 'Advanced Settings',
            premium: 'CraneApp Premium',
            help: 'Help',
            about: 'About',
            logout: 'Log Out',
            editProfile: 'Edit Profile',
            dark: 'Dark',
            light: 'Light',
            auto: 'Auto',
            small: 'Small',
            medium: 'Medium',
            large: 'Large',
            russian: 'Русский',
            english: 'English',
            spanish: 'Español',
            german: 'Deutsch',
            french: 'Français',
            showOnline: 'Show Online Status',
            readReceipts: 'Read Receipts',
            lastSeen: 'Last Seen',
            photoProfile: 'Profile Photo',
            forwardMessages: 'Forward Messages',
            spamFilter: 'Spam Filter',
            notificationSound: 'Notification Sound',
            vibration: 'Vibration',
            showMessageText: 'Show Message Text',
            badgeIcon: 'Badge on Icon',
            chatNotifications: 'Chat Notifications',
            channelNotifications: 'Channel Notifications',
            theme: 'Theme',
            accentColor: 'Accent Color',
            fontSize: 'Font Size',
            save: 'Save',
            cancel: 'Cancel',
            name: 'First Name',
            surname: 'Last Name',
            bio: 'Bio',
            username: 'Username',
            phone: 'Phone Number',
            email: 'Email',
            password: 'Password',
            changePassword: 'Change Password',
            deleteAccount: 'Delete Account',
            activeSessions: 'Active Sessions',
            terminateAll: 'Terminate All Other Sessions',
            terminate: 'Terminate',
            currentDevice: 'Current',
            version: 'Version',
            build: 'Build',
            developer: 'Developer',
            license: 'License',
            sourceCode: 'Source Code',
            reportBug: 'Report a Bug',
            requestFeature: 'Request a Feature',
            faq: 'FAQ',
            contactSupport: 'Contact Support'
        },
        es: {
            settings: 'Configuración',
            account: 'Cuenta',
            privacy: 'Privacidad',
            devices: 'Dispositivos',
            passcode: 'Código',
            appearance: 'Apariencia',
            language: 'Idioma',
            notifications: 'Notificaciones',
            logout: 'Cerrar sesión',
            dark: 'Oscuro',
            light: 'Claro',
            save: 'Guardar',
            cancel: 'Cancelar'
        },
        de: {
            settings: 'Einstellungen',
            account: 'Konto',
            privacy: 'Datenschutz',
            devices: 'Geräte',
            appearance: 'Erscheinungsbild',
            language: 'Sprache',
            notifications: 'Benachrichtigungen',
            logout: 'Abmelden',
            dark: 'Dunkel',
            light: 'Hell',
            save: 'Speichern',
            cancel: 'Abbrechen'
        },
        fr: {
            settings: 'Paramètres',
            account: 'Compte',
            privacy: 'Confidentialité',
            devices: 'Appareils',
            appearance: 'Apparence',
            language: 'Langue',
            notifications: 'Notifications',
            logout: 'Se déconnecter',
            dark: 'Sombre',
            light: 'Clair',
            save: 'Enregistrer',
            cancel: 'Annuler'
        }
    },

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('craneapp_language', lang);
            this.translatePage();
        }
    },

    t(key) {
        return this.translations[this.currentLang]?.[key] || this.translations['ru'][key] || key;
    },

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = this.t(key);
            } else {
                el.textContent = this.t(key);
            }
        });
        document.documentElement.lang = this.currentLang;
    },

    init() {
        const saved = localStorage.getItem('craneapp_language');
        if (saved && this.translations[saved]) {
            this.currentLang = saved;
        }
        this.translatePage();
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        i18n.init();
    });
}