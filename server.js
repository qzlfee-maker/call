const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Хранилище пользователей
const users = new Map(); // socketId -> { username, userId }
const userSockets = new Map(); // userId -> socketId
const waitingCalls = new Map(); // callerId -> { targetId, type }

// Регистрация пользователя
app.post('/api/register', (req, res) => {
  const { username, userId } = req.body;
  if (!username || !userId) {
    return res.status(400).json({ error: 'Username and userId required' });
  }
  res.json({ success: true, message: 'Registered successfully' });
});

// Получение списка пользователей
app.get('/api/users', (req, res) => {
  const userList = Array.from(userSockets.entries()).map(([id, socketId]) => ({
    userId: id,
    username: users.get(socketId)?.username || 'Unknown',
    online: true
  }));
  res.json(userList);
});

// WebSocket сигналинг
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Регистрация пользователя
  socket.on('register', (data) => {
    const { username, userId } = data;
    users.set(socket.id, { username, userId });
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.username = username;
    
    // Рассылаем обновлённый список пользователей
    broadcastUserList();
    console.log(`User registered: ${username} (${userId})`);
  });
  
  // Начать звонок
  socket.on('call-user', (data) => {
    const { targetId, callType } = data;
    const targetSocketId = userSockets.get(targetId);
    
    if (targetSocketId && io.sockets.sockets.get(targetSocketId)) {
      waitingCalls.set(socket.userId, { targetId, callType });
      
      io.to(targetSocketId).emit('incoming-call', {
        from: socket.userId,
        fromName: socket.username,
        callType: callType
      });
      
      console.log(`Call from ${socket.username} to ${targetId}`);
    } else {
      socket.emit('call-error', { message: 'User is offline' });
    }
  });
  
  // Принять звонок
  socket.on('accept-call', (data) => {
    const { fromId } = data;
    const callerSocketId = userSockets.get(fromId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', {
        targetId: socket.userId,
        targetName: socket.username
      });
    }
  });
  
  // Отклонить звонок
  socket.on('reject-call', (data) => {
    const { fromId } = data;
    const callerSocketId = userSockets.get(fromId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected', {
        message: 'User rejected the call'
      });
    }
  });
  
  // WebRTC сигналинг
  socket.on('offer', (data) => {
    const { targetId, offer } = data;
    const targetSocketId = userSockets.get(targetId);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('offer', {
        from: socket.userId,
        offer: offer
      });
    }
  });
  
  socket.on('answer', (data) => {
    const { targetId, answer } = data;
    const targetSocketId = userSockets.get(targetId);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('answer', {
        from: socket.userId,
        answer: answer
      });
    }
  });
  
  socket.on('ice-candidate', (data) => {
    const { targetId, candidate } = data;
    const targetSocketId = userSockets.get(targetId);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        from: socket.userId,
        candidate: candidate
      });
    }
  });
  
  // Завершить звонок
  socket.on('end-call', (data) => {
    const { targetId } = data;
    const targetSocketId = userSockets.get(targetId);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended', {
        from: socket.userId
      });
    }
  });
  
  // Отключение пользователя
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userId) {
      userSockets.delete(socket.userId);
      users.delete(socket.id);
      broadcastUserList();
    }
  });
});

function broadcastUserList() {
  const userList = Array.from(userSockets.entries()).map(([userId, socketId]) => ({
    userId: userId,
    username: users.get(socketId)?.username || 'Unknown',
    online: true
  }));
  io.emit('user-list', userList);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});