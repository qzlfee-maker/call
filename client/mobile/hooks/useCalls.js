import { authStore } from '../store/authStore.js';

/**
 * Хук для управления звонками WebRTC в Craneapp.
 */
export const useCalls = (onRemoteStream) => {
    let peerConnection = null;
    let localStream = null;
    const token = authStore.getToken();

    // Конфигурация STUN-серверов Google для обхода NAT
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    /**
     * Инициализация локального медиапотока
     */
    const startLocalStream = async (video = false) => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: video
            });
            return localStream;
        } catch (err) {
            console.error("Доступ к камере/микрофону запрещен:", err);
            return null;
        }
    };

    /**
     * Создание исходящего звонка
     */
    const makeCall = async (recipientId, isVideo = false) => {
        const stream = await startLocalStream(isVideo);
        if (!stream) return;

        peerConnection = new RTCPeerConnection(rtcConfig);
        
        // Добавляем наши треки в соединение
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        // Когда получаем поток от собеседника
        peerConnection.ontrack = (event) => {
            if (onRemoteStream) onRemoteStream(event.streams[0]);
        };

        // Создаем оффер (предложение)
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Отправляем сигнал через Socket (реализуем на бэкенде)
        // socket.emit('call:offer', { to: recipientId, offer, isVideo });
    };

    /**
     * Ответ на входящий звонок
     */
    const answerCall = async (callerId, offer) => {
        const stream = await startLocalStream();
        peerConnection = new RTCPeerConnection(rtcConfig);
        
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        
        peerConnection.ontrack = (event) => {
            if (onRemoteStream) onRemoteStream(event.streams[0]);
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // socket.emit('call:answer', { to: callerId, answer });
    };

    /**
     * Завершение звонка
     */
    const endCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnection) {
            peerConnection.close();
        }
        // socket.emit('call:end', { chatId });
    };

    return {
        makeCall,
        answerCall,
        endCall,
        getLocalStream: () => localStream
    };
};
