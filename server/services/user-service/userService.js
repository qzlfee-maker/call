/**
 * Сервис для работы с данными пользователей.
 * Взаимодействует с БД (users.txt / SQL / NoSQL).
 */

class UserService {
    /**
     * Поиск пользователя по ID
     * @param {string} userId 
     * @param {boolean} publicOnly - Вернуть только публичные поля (для чужих профилей)
     */
    async getUserById(userId, publicOnly = false) {
        try {
            // Имитация: const user = await db.users.findUnique({ where: { id: userId } });
            console.log(`[UserService] Fetching user: ${userId}`);
            
            const user = {
                id: userId,
                username: "crane_user",
                email: "user@craneapp.io",
                phone: "+79991234567",
                bio: "Using Craneapp!",
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=crane",
                status: "online",
                lastSeen: new Date().toISOString()
            };

            if (publicOnly) {
                // Удаляем чувствительные данные для публичного просмотра
                const { email, phone, ...publicData } = user;
                return publicData;
            }

            return user;
        } catch (error) {
            throw new Error(`Ошибка при поиске пользователя: ${error.message}`);
        }
    }

    /**
     * Обновление данных пользователя
     */
    async updateUser(userId, updates) {
        try {
            // Имитация: return await db.users.update({ where: { id: userId }, data: updates });
            console.log(`[UserService] Updating user ${userId} with:`, updates);
            
            // Возвращаем обновленный объект (имитация)
            return { id: userId, ...updates };
        } catch (error) {
            throw new Error(`Не удалось обновить данные: ${error.message}`);
        }
    }

    /**
     * Поиск пользователей по текстовому запросу
     */
    async searchUsers(query) {
        try {
            // Имитация: return await db.users.findMany({ 
            //    where: { username: { contains: query, mode: 'insensitive' } } 
            // });
            console.log(`[UserService] Searching for: ${query}`);
            
            return [
                { id: "101", username: query + "_fan", avatar: null, status: "offline" },
                { id: "102", username: "official_" + query, avatar: null, status: "online" }
            ];
        } catch (error) {
            throw new Error(`Ошибка поиска: ${error.message}`);
        }
    }

    /**
     * Обновить время последнего входа (Presence System)
     */
    async updateLastSeen(userId) {
        try {
            const now = new Date().toISOString();
            // await db.users.update({ where: { id: userId }, data: { lastSeen: now, status: 'online' } });
            return now;
        } catch (error) {
            console.error('[UserService] Failed to update heartbeat');
        }
    }
}

module.exports = new UserService();
