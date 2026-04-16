const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

// Оптимизация: настройки Socket.io для производительности
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: { chunkSize: 8 * 1024, level: 5 },
    zlibInflateOptions: { chunkSize: 8 * 1024 }
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting для API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});
app.use('/api/', apiLimiter);

// ========== ОПТИМИЗИРОВАННЫЕ ХРАНИЛИЩА ==========
class UserManager {
  constructor() {
    this.users = new Map();        // socketId -> userData
    this.userSockets = new Map();  // userId -> socketId
    this.userRooms = new Map();    // userId -> Set(roomId)
  }

  add(socketId, userData) {
    this.users.set(socketId, userData);
    this.userSockets.set(userData.userId, socketId);
    this.userRooms.set(userData.userId, new Set());
  }

  remove(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.userSockets.delete(user.userId);
      this.userRooms.delete(user.userId);
      this.users.delete(socketId);
    }
    return user;
  }

  getSocketId(userId) {
    return this.userSockets.get(userId);
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  addToRoom(userId, roomId) {
    const rooms = this.userRooms.get(userId);
    if (rooms) rooms.add(roomId);
  }

  removeFromRoom(userId, roomId) {
    const rooms = this.userRooms.get(userId);
    if (rooms) rooms.delete(roomId);
  }

  getOnlineUsers() {
    return Array.from(this.userSockets.entries()).map(([userId, socketId]) => ({
      userId,
      username: this.users.get(socketId)?.username || 'Unknown',
      online: true
    }));
  }
}

class CallManager {
  constructor() {
    this.activeCalls = new Map();     // callId -> callData
    this.userCalls = new Map();       // userId -> callId
    this.waitingCalls = new Map();    // callerId -> { targetId, type, timestamp }
  }

  createCall(callerId, targetId, type) {
    const callId = `${callerId}-${targetId}-${Date.now()}`;
    this.activeCalls.set(callId, {
      callerId,
      targetId,
      type,
      startTime: Date.now(),
      participants: new Set([callerId, targetId])
    });
    this.userCalls.set(callerId, callId);
    this.userCalls.set(targetId, callId);
    return callId;
  }

  getCallByUser(userId) {
    const callId = this.userCalls.get(userId);
    return callId ? this.activeCalls.get(callId) : null;
  }

  endCall(userId) {
    const callId = this.userCalls.get(userId);
    if (!callId) return null;
    
    const call = this.activeCalls.get(callId);
    this.activeCalls.delete(callId);
    call.participants.forEach(id => this.userCalls.delete(id));
    return call;
  }

  addWaiting(callerId, data) {
    this.waitingCalls.set(callerId, { ...data, timestamp: Date.now() });
    // Автоочистка старых запросов
    setTimeout(() => this.waitingCalls.delete(callerId), 30000);
  }

  removeWaiting(callerId) {
    return this.waitingCalls.delete(callerId);
  }

  getWaiting(callerId) {
    return this.waitingCalls.get(callerId);
  }
}

class GroupManager {
  constructor() {
    this.groups = new Map();          // groupId -> groupData
    this.userGroups = new Map();      // userId -> Set(groupId)
  }

  create(groupId, hostId, name) {
    this.groups.set(groupId, {
      hostId,
      name,
      participants: new Map(),        // userId -> { username, socketId, joinedAt }
      waiting: new Map(),             // userId -> { username, requestedAt }
      createdAt: Date.now()
    });
  }

  get(groupId) {
    return this.groups.get(groupId);
  }

  addParticipant(groupId, userId, data) {
    const group = this.groups.get(groupId);
    if (group) {
      group.participants.set(userId, { ...data, joinedAt: Date.now() });
      group.waiting.delete(userId);
      
      const userGroups = this.userGroups.get(userId) || new Set();
      userGroups.add(groupId);
      this.userGroups.set(userId, userGroups);
    }
  }

  removeParticipant(groupId, userId) {
    const group = this.groups.get(groupId);
    if (group) {
      group.participants.delete(userId);
      if (group.participants.size === 0) {
        this.groups.delete(groupId);
      }
    }
    
    const userGroups = this.userGroups.get(userId);
    if (userGroups) userGroups.delete(groupId);
  }

  addToWaiting(groupId, userId, data) {
    const group = this.groups.get(groupId);
    if (group) {
      group.waiting.set(userId, { ...data, requestedAt: Date.now() });
    }
  }

  removeFromWaiting(groupId, userId) {
    const group = this.groups.get(groupId);
    if (group) group.waiting.delete(userId);
  }

  getGroupParticipants(groupId) {
    const group = this.groups.get(groupId);
    return group ? Array.from(group.participants.entries()).map(([id, data]) => ({
      userId: id,
      username: data.username
    })) : [];
  }

  getWaitingList(groupId) {
    const group = this.groups.get(groupId);
    return group ? Array.from(group.waiting.entries()).map(([id, data]) => ({
      userId: id,
      username: data.username
    })) : [];
  }
}

// Инициализация менеджеров
const userManager = new UserManager();
const callManager = new CallManager();
const groupManager = new GroupManager();

// ========== API РОУТЫ ==========
app.post('/api/register', (req, res) => {
  const { username, userId } = req.body;
  if (!username || !userId) {
    return res.status(400).json({ error: 'Username and userId required' });
  }
  res.json({ success: true });
});

app.get('/api/users', (req, res) => {
  res.json(userManager.getOnlineUsers());
});

// ========== SOCKET.IO ОБРАБОТЧИКИ ==========
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // Регистрация с валидацией
  socket.on('register', (data) => {
    const { username, userId } = data;
    if (!username || !userId) return;
    
    // Отключаем старый сокет этого пользователя
    const oldSocketId = userManager.getSocketId(userId);
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.emit('session-taken');
        oldSocket.disconnect(true);
      }
    }

    userManager.add(socket.id, { username, userId, socketId: socket.id });
    socket.userId = userId;
    socket.username = username;
    
    broadcastUserList();
    console.log(`Registered: ${username} (${userId})`);
  });

  // ========== ЛИЧНЫЕ ЗВОНКИ ==========
  socket.on('call-user', ({ targetId, callType }) => {
    if (!socket.userId) return;
    
    const targetSocketId = userManager.getSocketId(targetId);
    if (!targetSocketId) {
      return socket.emit('call-error', { message: 'User offline' });
    }

    callManager.addWaiting(socket.userId, { targetId, callType });
    
    socket.to(targetSocketId).emit('incoming-call', {
      from: socket.userId,
      fromName: socket.username,
      callType
    });
  });

  socket.on('accept-call', ({ fromId }) => {
    const waiting = callManager.getWaiting(fromId);
    if (!waiting || waiting.targetId !== socket.userId) return;

    callManager.removeWaiting(fromId);
    const callId = callManager.createCall(fromId, socket.userId, waiting.callType);

    const callerSocketId = userManager.getSocketId(fromId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', {
        targetId: socket.userId,
        targetName: socket.username,
        callId
      });
    }
    
    socket.emit('call-connected', { callId, targetId: fromId });
  });

  socket.on('reject-call', ({ fromId }) => {
    callManager.removeWaiting(fromId);
    const callerSocketId = userManager.getSocketId(fromId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected', { message: 'Rejected' });
    }
  });

  // ========== WebRTC СИГНАЛИНГ (оптимизированный) ==========
  socket.on('offer', ({ targetId, offer, callId }) => {
    const targetSocketId = userManager.getSocketId(targetId);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('offer', {
        from: socket.userId,
        offer,
        callId
      });
    }
  });

  socket.on('answer', ({ targetId, answer, callId }) => {
    const targetSocketId = userManager.getSocketId(targetId);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('answer', {
        from: socket.userId,
        answer,
        callId
      });
    }
  });

  socket.on('ice-candidate', ({ targetId, candidate, callId }) => {
    const targetSocketId = userManager.getSocketId(targetId);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('ice-candidate', {
        from: socket.userId,
        candidate,
        callId
      });
    }
  });

  socket.on('end-call', ({ targetId, callId }) => {
    const call = callManager.endCall(socket.userId);
    if (call) {
      call.participants.forEach(id => {
        if (id !== socket.userId) {
          const socketId = userManager.getSocketId(id);
          if (socketId) io.to(socketId).emit('call-ended', { from: socket.userId });
        }
      });
    }
  });

  // ========== ГРУППОВЫЕ ЗВОНКИ ==========
  socket.on('create-group', ({ groupId, groupName }) => {
    if (!socket.userId) return;
    groupManager.create(groupId, socket.userId, groupName);
    socket.join(`group:${groupId}`);
    userManager.addToRoom(socket.userId, `group:${groupId}`);
    socket.emit('group-created', { groupId });
  });

  socket.on('join-group-request', ({ groupId }) => {
    const group = groupManager.get(groupId);
    if (!group) {
      return socket.emit('group-error', { message: 'Group not found' });
    }

    if (group.participants.has(socket.userId)) {
      return socket.emit('already-in-group');
    }

    if (group.hostId === socket.userId || group.participants.size === 0) {
      // Автодопуск хоста или первого участника
      admitToGroup(groupId, socket.userId, socket);
    } else {
      // Добавляем в ожидание
      groupManager.addToWaiting(groupId, socket.userId, {
        username: socket.username,
        socketId: socket.id
      });
      
      // Уведомляем хоста
      const hostSocketId = userManager.getSocketId(group.hostId);
      if (hostSocketId) {
        io.to(hostSocketId).emit('waiting-list-update', {
          waiting: groupManager.getWaitingList(groupId)
        });
      }
      socket.emit('waiting-for-admission');
    }
  });

  socket.on('admit-to-group', ({ groupId, userId }) => {
    const group = groupManager.get(groupId);
    if (!group || group.hostId !== socket.userId) return;

    const userSocketId = userManager.getSocketId(userId);
    if (userSocketId) {
      admitToGroup(groupId, userId, io.sockets.sockets.get(userSocketId));
    }
  });

  socket.on('reject-from-group', ({ groupId, userId }) => {
    const group = groupManager.get(groupId);
    if (!group || group.hostId !== socket.userId) return;

    groupManager.removeFromWaiting(groupId, userId);
    const userSocketId = userManager.getSocketId(userId);
    if (userSocketId) {
      io.to(userSocketId).emit('rejected-from-group');
    }
    
    // Обновляем список ожидающих
    socket.emit('waiting-list-update', {
      waiting: groupManager.getWaitingList(groupId)
    });
  });

  function admitToGroup(groupId, userId, userSocket) {
    const group = groupManager.get(groupId);
    if (!group) return;

    groupManager.addParticipant(groupId, userId, {
      username: userSocket.username,
      socketId: userSocket.id
    });
    
    userSocket.join(`group:${groupId}`);
    userManager.addToRoom(userId, `group:${groupId}`);
    
    userSocket.emit('admitted-to-group', {
      groupId,
      participants: groupManager.getGroupParticipants(groupId)
    });
    
    // Уведомляем всех участников
    io.to(`group:${groupId}`).emit('group-participants-update', {
      participants: groupManager.getGroupParticipants(groupId)
    });
  }

  socket.on('leave-group', ({ groupId }) => {
    leaveGroup(socket, groupId);
  });

  // Групповой WebRTC сигналинг
  socket.on('group-offer', ({ groupId, targetId, offer }) => {
    const targetSocketId = userManager.getSocketId(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('group-offer', {
        from: socket.userId,
        groupId,
        offer
      });
    }
  });

  socket.on('group-answer', ({ groupId, targetId, answer }) => {
    const targetSocketId = userManager.getSocketId(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('group-answer', {
        from: socket.userId,
        groupId,
        answer
      });
    }
  });

  socket.on('group-ice', ({ groupId, targetId, candidate }) => {
    const targetSocketId = userManager.getSocketId(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('group-ice', {
        from: socket.userId,
        groupId,
        candidate
      });
    }
  });

  socket.on('raise-hand', ({ groupId }) => {
    socket.to(`group:${groupId}`).emit('hand-raised', {
      userId: socket.userId,
      username: socket.username
    });
  });

  socket.on('group-chat-message', ({ groupId, message }) => {
    socket.to(`group:${groupId}`).emit('group-chat-message', {
      userId: socket.userId,
      username: socket.username,
      message,
      timestamp: Date.now()
    });
  });

  // ========== ОТКЛЮЧЕНИЕ ==========
  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', socket.id, reason);
    
    const user = userManager.remove(socket.id);
    if (user) {
      // Завершаем активный звонок
      const call = callManager.endCall(user.userId);
      if (call) {
        call.participants.forEach(id => {
          if (id !== user.userId) {
            const socketId = userManager.getSocketId(id);
            if (socketId) io.to(socketId).emit('call-ended', { from: user.userId });
          }
        });
      }

      // Удаляем из групп
      const userGroups = userManager.userRooms.get(user.userId);
      if (userGroups) {
        userGroups.forEach(roomId => {
          if (roomId.startsWith('group:')) {
            leaveGroup(socket, roomId.replace('group:', ''));
          }
        });
      }

      broadcastUserList();
    }
  });

  socket.on('disconnecting', () => {
    // Логирование комнат перед выходом
    console.log('Disconnecting from rooms:', socket.rooms);
  });
});

// Вспомогательные функции
function leaveGroup(socket, groupId) {
  const group = groupManager.get(groupId);
  if (!group) return;

  groupManager.removeParticipant(groupId, socket.userId);
  socket.leave(`group:${groupId}`);
  
  // Уведомляем остальных
  socket.to(`group:${groupId}`).emit('user-left', {
    userId: socket.userId,
    username: socket.username
  });
  
  io.to(`group:${groupId}`).emit('group-participants-update', {
    participants: groupManager.getGroupParticipants(groupId)
  });

  // Если хост вышел - назначаем нового
  if (group.hostId === socket.userId && group.participants.size > 0) {
    const newHostId = group.participants.keys().next().value;
    group.hostId = newHostId;
    const newHostSocketId = userManager.getSocketId(newHostId);
    if (newHostSocketId) {
      io.to(newHostSocketId).emit('became-host');
    }
  }
}

function broadcastUserList() {
  const users = userManager.getOnlineUsers();
  io.emit('user-list', users);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Принудительное закрытие через 10 секунд
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
