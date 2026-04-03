import { authStore } from '../store/authStore.js';

/**
 * Хук для управления сообщениями в реальном времени через Socket.io.
 */
export const useMessages = (chatId, onNewMessage) => {
    let socket = null;
    const user = authStore.getUser();
    const token = authStore.getToken();

    // URL сервера на Railway или локально
    const SOCKET_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://craneapp-production.up.railway.app';

    /**
     * Инициализация соединения
     */
    const connect = () => {
        if (!token) return;

        // Подключаемся с передачей токена для авторизации на сервере
        socket = io(SOCKET_URL, {
            auth: { token },
            query: { chatId }
        });

        // Слушаем входящие сообщения
        socket.on('message:receive', (message) => {
            if (onNewMessage) onNewMessage(message);
        });

        // Слушаем статус "печатает"
        socket.on('typing:display', (data) => {
            if (data.chatId === chatId) {
                console.log(`${data.username} печатает...`);
                // Здесь можно вызвать callback для UI
            }
        });

        socket.on('connect_error', (err) => {
            console.error('Ошибка сокета:', err.message);
        });
    };

    /**
     * Отправка текстового сообщения
     * @param {string} text 
     */
    const sendMessage = (text) => {
        if (!socket || !text.trim()) return;

        const messageData = {
            chatId,
            senderId: user.id,
            text: text.trim(),
            timestamp: new Date().toISOString()
        };

        socket.emit('message:send', messageData);
        return messageData; // Возвращаем для мгновенного отображения (Optimistic UI)
    };

    /**
     * Отправка статуса "печатает"
     */
    const sendTypingStatus = (isTyping) => {
        if (!socket) return;
        socket.emit('typing:start', { chatId, isTyping });
    };

    /**
     * Закрытие соединения при уходе с экрана чата
     */
    const disconnect = () => {
        if (socket) {
            socket.disconnect();
        }
    };

    return {
        connect,
        sendMessage,
        sendTypingStatus,
        disconnect
    };
};
