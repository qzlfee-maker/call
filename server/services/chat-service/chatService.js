/**
 * Сервис управления чатами.
 * Работает с бизнес-логикой хранения и выборки диалогов.
 */

class ChatService {
    /**
     * Получить все чаты пользователя с последним сообщением (для списка)
     */
    async getChatsByUserId(userId) {
        try {
            console.log(`[ChatService] Fetching all chats for user: ${userId}`);
            
            // Имитация JOIN запроса: Chats + Participants + LastMessage
            return [
                {
                    id: "chat_1",
                    type: "private",
                    title: "Alex Server",
                    avatar: null,
                    lastMessage: { text: "Привет! Как Craneapp?", time: new Date() },
                    unreadCount: 2,
                    partnerId: "user_99"
                },
                {
                    id: "group_1",
                    type: "group",
                    title: "Crane Team",
                    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=crane",
                    lastMessage: { text: "Бэкенд на Railway готов!", time: new Date() },
                    unreadCount: 0
                }
            ];
        } catch (error) {
            throw new Error('Ошибка при получении списка чатов');
        }
    }

    /**
     * Найти существующий или создать новый приватный чат (1-на-1)
     */
    async findOrCreatePrivateChat(user1, user2) {
        try {
            // 1. Ищем чат типа 'private', где оба пользователя являются участниками
            // SELECT chat_id FROM participants WHERE user_id IN (user1, user2) 
            // GROUP BY chat_id HAVING COUNT(*) = 2
            
            const existingChat = null; // Имитация: если не нашли

            if (existingChat) return existingChat;

            // 2. Если не нашли — создаем новый
            return await this.createChat({
                type: 'private',
                members: [user1, user2],
                title: null // Для приватных имя берется из профиля собеседника
            });
        } catch (error) {
            throw new Error('Ошибка инициализации приватного чата');
        }
    }

    /**
     * Создание записи чата в БД
     */
    async createChat(chatData) {
        try {
            const newChat = {
                id: `chat_${Date.now()}`,
                createdAt: new Date(),
                ...chatData
            };

            // Имитация: запись в таблицу chats и таблицу participants
            console.log(`[ChatService] Created ${chatData.type}: ${newChat.id}`);
            
            return newChat;
        } catch (error) {
            throw new Error('Не удалось сохранить чат в базе данных');
        }
    }

    /**
     * Получить детали чата по ID
     */
    async getChatById(chatId) {
        try {
            // Имитация выборки данных чата и списка участников
            return {
                id: chatId,
                type: 'group',
                title: 'Crane Design',
                members: ['user_1', 'user_2', 'user_3'],
                settings: { notifications: true }
            };
        } catch (error) {
            throw new Error('Чат не найден');
        }
    }
}

module.exports = new ChatService();
