const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== Хранилище (только личные звонки) ==========
const users       = new Map(); // socketId → { username, userId, status }
const userSockets = new Map(); // userId → socketId

// Бесплатные STUN/TURN серверы
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// ========== REST API ==========
app.get('/api/ice-config', (req, res) => {
  res.json({ iceServers: ICE_SERVERS });
});

app.post('/api/register', (req, res) => {
  const { username, userId } = req.body;
  if (!username || !userId) {
    return res.status(400).json({ error: 'Username and userId required' });
  }
  res.json({ success: true });
});

app.get('/api/users', (req, res) => {
  const list = Array.from(userSockets.entries()).map(([userId, socketId]) => ({
    userId,
    username: users.get(socketId)?.username || 'Unknown',
    status: users.get(socketId)?.status || 'online'
  }));
  res.json(list);
});

app.get('/call', (req, res) => {
  res.sendFile(path.join(__dirname, 'call.html'));
});

// ========== Socket.IO ==========
io.on('connection', (socket) => {
  console.log('[socket] connect', socket.id);

  // Регистрация
  socket.on('register', ({ username, userId }) => {
    const oldSocketId = userSockets.get(userId);
    if (oldSocketId && oldSocketId !== socket.id) {
      users.delete(oldSocketId);
    }
    users.set(socket.id, { username, userId, status: 'online' });
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.username = username;
    broadcastUserList();
    console.log(`[register] ${username} (${userId})`);
  });

  // Статус
  socket.on('set-status', ({ status }) => {
    const u = users.get(socket.id);
    if (u) {
      u.status = status;
      broadcastUserList();
    }
  });

  // Исходящий звонок
  socket.on('call-user', ({ targetId, callType }) => {
    const targetSocketId = userSockets.get(targetId);
    if (targetSocketId && io.sockets.sockets.get(targetSocketId)) {
      io.to(targetSocketId).emit('incoming-call', {
        from: socket.userId,
        fromName: socket.username,
        callType
      });
      const u = users.get(socket.id);
      if (u) {
        u.status = 'busy';
        broadcastUserList();
      }
    } else {
      socket.emit('call-error', { message: 'User is offline' });
    }
  });

  // Принять звонок
  socket.on('accept-call', ({ fromId }) => {
    const callerSocketId = userSockets.get(fromId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', {
        targetId: socket.userId,
        targetName: socket.username
      });
      const u = users.get(socket.id);
      if (u) {
        u.status = 'busy';
        broadcastUserList();
      }
    }
  });

  // Отклонить звонок
  socket.on('reject-call', ({ fromId }) => {
    const callerSocketId = userSockets.get(fromId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected');
    }
    const u = users.get(socket.id);
    if (u) {
      u.status = 'online';
      broadcastUserList();
    }
  });

  // Завершить звонок
  socket.on('end-call', ({ targetId }) => {
    const targetSocketId = userSockets.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
    }
    [socket.userId, targetId].forEach(uid => {
      const sid = userSockets.get(uid);
      if (sid) {
        const u = users.get(sid);
        if (u) u.status = 'online';
      }
    });
    broadcastUserList();
  });

  // WebRTC сигналинг
  socket.on('offer', ({ targetId, offer }) => {
    const sid = userSockets.get(targetId);
    if (sid) {
      io.to(sid).emit('offer', { from: socket.userId, offer });
    }
  });

  socket.on('answer', ({ targetId, answer }) => {
    const sid = userSockets.get(targetId);
    if (sid) {
      io.to(sid).emit('answer', { from: socket.userId, answer });
    }
  });

  socket.on('ice-candidate', ({ targetId, candidate }) => {
    const sid = userSockets.get(targetId);
    if (sid) {
      io.to(sid).emit('ice-candidate', { from: socket.userId, candidate });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('[socket] disconnect', socket.id, socket.userId);
    if (socket.userId) {
      userSockets.delete(socket.userId);
      users.delete(socket.id);
      broadcastUserList();
    }
  });
});

function broadcastUserList() {
  const list = Array.from(userSockets.entries()).map(([userId, socketId]) => ({
    userId,
    username: users.get(socketId)?.username || 'Unknown',
    status: users.get(socketId)?.status || 'online'
  }));
  io.emit('user-list', list);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CraneCall server (only personal calls) running on port ${PORT}`);
});
