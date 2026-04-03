/**
 * Обработчик сигналов WebRTC через Socket.io.
 * Обеспечивает "рукопожатие" (Handshake) между звонящим и принимающим.
 */

class WebRTCHandler {
    constructor(io) {
        this.io = io;
        this.namespace = io.of('/calls'); // Выделенный неймспейс для звонков
        this.setupListeners();
    }

    setupListeners() {
        this.namespace.on('connection', (socket) => {
            const userId = socket.handshake.query.userId;
            if (userId) socket.join(`user_${userId}`);

            console.log(`[WebRTC] User connected for signaling: ${userId}`);

            /**
             * 1. Отправка предложения (Offer)
             * Отправляется звонящим в сторону получателя
             */
            socket.on('call:offer', ({ to, offer, type }) => {
                console.log(`[WebRTC] Offer from ${userId} to ${to}`);
                this.namespace.to(`user_${to}`).emit('call:offer', {
                    from: userId,
                    offer,
                    type // 'audio' | 'video'
                });
            });

            /**
             * 2. Ответ на предложение (Answer)
             * Отправляется получателем обратно звонящему
             */
            socket.on('call:answer', ({ to, answer }) => {
                console.log(`[WebRTC] Answer from ${userId} to ${to}`);
                this.namespace.to(`user_${to}`).emit('call:answer', {
                    from: userId,
                    answer
                });
            });

            /**
             * 3. ICE Candidates
             * Обмен данными о сетевых маршрутах (STUN/TURN результаты)
             */
            socket.on('call:ice-candidate', ({ to, candidate }) => {
                this.namespace.to(`user_${to}`).emit('call:ice-candidate', {
                    from: userId,
                    candidate
                });
            });

            /**
             * 4. Завершение или отказ (Hangup / Reject)
             */
            socket.on('call:terminate', ({ to, reason }) => {
                console.log(`[WebRTC] Call terminated between ${userId} and ${to}. Reason: ${reason}`);
                this.namespace.to(`user_${to}`).emit('call:terminate', {
                    from: userId,
                    reason
                });
                socket.leave(`call_room_${userId}_${to}`);
            });

            socket.on('disconnect', () => {
                console.log(`[WebRTC] Signaling socket disconnected: ${userId}`);
            });
        });
    }
}

/**
 * Инициализация обработчика. 
 * Вызывается в основном файле сервера при подключении Socket.io.
 */
module.exports = (io) => new WebRTCHandler(io);
