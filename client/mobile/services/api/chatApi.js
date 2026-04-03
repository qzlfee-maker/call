import { authStore } from '../../store/authStore.js';

/**
 * API Сервис для управления чатами, группами и каналами.
 * Взаимодействует с chat-service на Railway.
 */

const BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api/chats' 
    : 'https://craneapp-production.up.railway.app/api/chats';

export const chatApi = {
    /**
     * Получить заголовки всех чатов текущего пользователя
     */
    fetchMyChats: async () => {
        const response = await fetch(`${BASE_URL}/all`, {
            method: 'GET',
            headers: getHeaders()
        });
        return await handleResponse(response);
    },

    /**
     * Создать новый приватный чат (Direct Message)
     * @param {string} userId - ID собеседника
     */
    createPrivateChat: async (userId) => {
        const response = await fetch(`${BASE_URL}/private`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ recipientId: userId })
        });
        return await handleResponse(response);
    },

    /**
     * Создать групповой чат
     * @param {Object} groupData - { title, description, members: [] }
     */
    createGroup: async (groupData) => {
        const response = await fetch(`${BASE_URL}/group`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(groupData)
        });
        return await handleResponse(response);
    },

    /**
     * Покинуть чат или удалить его
     * @param {string} chatId 
     */
    deleteChat: async (chatId) => {
        const response = await fetch(`${BASE_URL}/${chatId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return await handleResponse(response);
    },

    /**
     * Получить детальную информацию о чате (участники, настройки)
     * @param {string} chatId 
     */
    getChatDetails: async (chatId) => {
        const response = await fetch(`${BASE_URL}/${chatId}/details`, {
            method: 'GET',
            headers: getHeaders()
        });
        return await handleResponse(response);
    }
};

/**
 * Вспомогательная функция для формирования заголовков с JWT токеном
 */
function getHeaders() {
    const token = authStore.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Универсальный обработчик HTTP ответов
 */
async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.message || 'Ошибка API чатов');
        error.status = response.status;
        throw error;
    }
    return data;
}
