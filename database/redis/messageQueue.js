/**
 * Очередь сообщений на базе Redis (Producer/Consumer pattern).
 * Гарантирует доставку и снимает нагрузку с основной БД.
 */
const redis = require('redis');

class MessageQueue {
    constructor() {
        this.client = redis.createClient({
            url: process.env.REDIS_URL
        });
        
        this.QUEUE_NAME = 'crane_message_buffer';
        this.connect();
    }

    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
            console.log('📦 Redis Message Queue Ready');
        }
    }

    /**
     * Поместить сообщение в очередь (Producer)
     * Вызывается из messageController.js сразу после получения сокета
     */
    async enqueue(messageData) {
        try {
            const payload = JSON.stringify({
                ...messageData,
                timestamp: Date.now()
            });
            
            // Используем LPUSH для добавления в начало списка
            await this.client.lPush(this.QUEUE_NAME, payload);
            return true;
        } catch (error) {
            console.error('[Queue] Enqueue error:', error);
            return false;
        }
    }

    /**
     * Извлечь сообщение для записи в БД (Consumer)
     * Работает в фоновом режиме (Worker)
     */
    async dequeue() {
        try {
            // RPOP извлекает и удаляет последний элемент (FIFO - первый пришел, первый ушел)
            const data = await this.client.rPop(this.QUEUE_NAME);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[Queue] Dequeue error:', error);
            return null;
        }
    }

    /**
     * Получить текущий размер очереди (для мониторинга)
     */
    async getQueueLength() {
        return await this.client.lLen(this.QUEUE_NAME);
    }
}

module.exports = new MessageQueue();
