const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== БАЗА ДАННЫХ (В ПАМЯТИ) ==========
const db = {
    users: new Map(), // username -> { password, userId }
    onlineUsers: new Map(), // socketId -> { userId, username }
    userSockets: new Map() // userId -> socketId
};

// ========== API РЕГИСТРАЦИИ И ВХОДА ==========
app.post('/api/auth', (req, res) => {
    const { username, password, mode } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Заполните все поля' });
    }

    if (mode === 'reg') {
        if (db.users.has(username)) {
            return res.status(400).json({ success: false, message: 'Пользователь уже существует' });
        }
        const userId = 'uid_' + Math.random().toString(36).substr(2, 9);
        db.users.set(username, { password, userId });
        return res.json({ success: true, user: { name: username, id: userId } });
    } else {
        const user = db.users.get(username);
        if (user && user.password === password) {
            return res.json({ success: true, user: { name: username, id: user.userId } });
        }
        return res.status(401).json({ success: false, message: 'Неверный ник или пароль' });
    }
});

// ========== SOCKET.IO (СИГНАЛИНГ И ЧАТ) ==========
io.on('connection', (socket) => {
    
    // Регистрация активного сокета
    socket.on('call:register', (data) => {
        const { userId, username } = data;
        db.onlineUsers.set(socket.id, { userId, username });
        db.userSockets.set(userId, socket.id);
        
        console.log(`User Online: ${username}`);
        broadcastUserList();
    });

    // --- ТЕКСТОВЫЕ СООБЩЕНИЯ (TELEGRAM LOGIC) ---
    socket.on('chat:message', (data) => {
        const { to, text } = data;
        const sender = db.onlineUsers.get(socket.id);
        const targetSocket = db.userSockets.get(to);

        if (sender && targetSocket) {
            io.to(targetSocket).emit('chat:message', {
                fromId: sender.userId,
                fromName: sender.username,
                text: text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    });

    // --- ЗВОНКИ (УСТРАНЕНИЕ БЕСКОНЕЧНОЙ ЗАГРУЗКИ) ---
    
    // 1. Инициация вызова
    socket.on('call:request', (data) => {
        const targetSocket = db.userSockets.get(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call:request', {
                from: data.from,
                fromName: data.fromName
            });
        }
    });

    // 2. Подтверждение принятия (Сигнал к началу WebRTC)
    socket.on('call:accept', (data) => {
        const targetSocket = db.userSockets.get(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call:accepted', { by: data.from });
        }
    });

    // 3. WebRTC Сигналинг (Relay)
    socket.on('call:offer', (data) => {
        const targetSocket = db.userSockets.get(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call:offer', { offer: data.offer, from: data.from });
        }
    });

    socket.on('call:answer', (data) => {
        const targetSocket = db.userSockets.get(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call:answer', { answer: data.answer });
        }
    });

    socket.on('call:ice-candidate', (data) => {
        const targetSocket = db.userSockets.get(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call:ice-candidate', { candidate: data.candidate });
        }
    });

    // 4. Завершение
    socket.on('call:end', (data) => {
        const targetSocket = db.userSockets.get(data.to);
        if (targetSocket) {
            io.to(targetSocket).emit('call:ended');
        }
    });

    // --- СИСТЕМНЫЕ СОБЫТИЯ ---
    socket.on('disconnect', () => {
        const user = db.onlineUsers.get(socket.id);
        if (user) {
            db.userSockets.delete(user.userId);
            db.onlineUsers.delete(socket.id);
            broadcastUserList();
        }
    });

    function broadcastUserList() {
        const list = Array.from(db.onlineUsers.values());
        io.emit('user-list', list);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
