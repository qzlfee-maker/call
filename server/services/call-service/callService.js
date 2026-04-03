/**
 * Сервис управления звонками и WebRTC конфигурацией.
 * Отвечает за хранение сессий и предоставление параметров для Signaling.
 */

class CallService {
    /**
     * Создать запись о начале звонка
     */
    async createCallSession(data) {
        try {
            const newCall = {
                id: `call_${Date.now()}`,
                callerId: data.callerId,
                receiverId: data.receiverId,
                type: data.type || 'audio', // 'audio' | 'video'
                status: 'ringing',
                startedAt: new Date().toISOString(),
                duration: 0
            };

            // Имитация: запись в database/schema/calls.txt
            console.log(`[CallService] New call session created: ${newCall.id}`);
            return newCall;
        } catch (error) {
            throw new Error('Не удалось инициализировать звонок в базе');
        }
    }

    /**
     * Обновить статус звонка (Accept / End / Missed)
     */
    async updateStatus(sessionId, status, duration = 0) {
        try {
            // Имитация поиска и обновления записи
            console.log(`[CallService] Call ${sessionId} changed status to: ${status}`);
            
            return {
                id: sessionId,
                status: status,
                duration: duration,
                endedAt: status === 'ended' ? new Date().toISOString() : null
            };
        } catch (error) {
            throw new Error('Ошибка обновления статуса звонка');
        }
    }

    /**
     * Получить конфигурацию ICE-серверов для WebRTC (Signaling)
     * Это критично для работы через мобильный интернет на Railway
     */
    getIceConfig() {
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }, // Публичный STUN
                { 
                    urls: 'turn:your-turn-server.com:3478', // Ваш TURN сервер для обхода NAT
                    username: process.env.TURN_USER || 'crane_user',
                    credential: process.env.TURN_PASSWORD || 'crane_secret'
                }
            ]
        };
    }

    /**
     * Получить историю звонков пользователя (для экрана calls.html)
     */
    async getHistoryByUserId(userId) {
        try {
            console.log(`[CallService] Fetching call history for: ${userId}`);
            
            return [
                {
                    id: "call_101",
                    partnerId: "user_55",
                    partnerName: "Alex Dev",
                    type: "video",
                    status: "incoming",
                    result: "missed",
                    time: new Date()
                },
                {
                    id: "call_102",
                    partnerId: "user_88",
                    partnerName: "Crane Support",
                    type: "audio",
                    status: "outgoing",
                    result: "completed",
                    duration: 125, // в секундах
                    time: new Date(Date.now() - 86400000)
                }
            ];
        } catch (error) {
            throw new Error('Ошибка загрузки истории вызовов');
        }
    }
}

module.exports = new CallService();
