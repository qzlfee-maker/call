const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Хранилища
const users = new Map();           // socketId -> { username, userId }
const userSockets = new Map();     // userId -> socketId
const groups = new Map();          // groupId -> { hostId, name, participants, waiting, ... }

app.post('/api/register', (req, res) => {
  const { username, userId } = req.body;
  if (!username || !userId) return res.status(400).json({ error: 'Missing fields' });
  res.json({ success: true });
});

app.get('/api/users', (req, res) => {
  const list = Array.from(userSockets.entries()).map(([uid, sid]) => ({
    userId: uid, username: users.get(sid)?.username || 'Unknown', online: true
  }));
  res.json(list);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('register', ({ username, userId }) => {
    users.set(socket.id, { username, userId });
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.username = username;
    broadcastUserList();
    console.log(`Registered: ${username} (${userId})`);
  });

  // ========== 1-на-1 звонки ==========
  socket.on('call-user', ({ targetId, callType }) => {
    const target = userSockets.get(targetId);
    if (target && io.sockets.sockets.get(target)) {
      io.to(target).emit('incoming-call', { from: socket.userId, fromName: socket.username, callType });
    } else socket.emit('call-error', { message: 'User offline' });
  });
  socket.on('accept-call', ({ fromId }) => {
    const caller = userSockets.get(fromId);
    if (caller) io.to(caller).emit('call-accepted', { targetId: socket.userId, targetName: socket.username });
  });
  socket.on('reject-call', ({ fromId }) => {
    const caller = userSockets.get(fromId);
    if (caller) io.to(caller).emit('call-rejected');
  });
  socket.on('offer', ({ targetId, offer }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('offer', { from: socket.userId, offer });
  });
  socket.on('answer', ({ targetId, answer }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('answer', { from: socket.userId, answer });
  });
  socket.on('ice-candidate', ({ targetId, candidate }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('ice-candidate', { from: socket.userId, candidate });
  });
  socket.on('end-call', ({ targetId }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('call-ended');
  });

  // ========== ГРУППОВЫЕ КОНФЕРЕНЦИИ ==========
  socket.on('create-group', ({ groupName }) => {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    groups.set(groupId, {
      hostId: socket.userId,
      name: groupName,
      participants: new Set([socket.userId]),
      waiting: new Set(),
      chatHistory: []
    });
    socket.join(groupId);
    socket.emit('group-created', { groupId, groupName });
    broadcastGroups();
  });

  socket.on('join-group-request', ({ groupId }) => {
    const group = groups.get(groupId);
    if (!group) return;
    if (group.hostId === socket.userId) {
      // хост уже внутри
      group.participants.add(socket.userId);
      socket.join(groupId);
      socket.emit('group-joined', { groupId, groupName: group.name, isHost: true });
      io.to(groupId).emit('group-participants-update', {
        participants: Array.from(group.participants).map(uid => ({ userId: uid, username: users.get(userSockets.get(uid))?.username }))
      });
    } else {
      // отправляем в зал ожидания
      group.waiting.add(socket.userId);
      io.to(userSockets.get(group.hostId)).emit('waiting-list-update', {
        groupId, waiting: Array.from(group.waiting).map(uid => ({ userId: uid, username: users.get(userSockets.get(uid))?.username }))
      });
      socket.emit('waiting-room', { groupId, groupName: group.name });
    }
  });

  socket.on('admit-user', ({ groupId, userId }) => {
    const group = groups.get(groupId);
    if (!group || group.hostId !== socket.userId) return;
    if (group.waiting.has(userId)) {
      group.waiting.delete(userId);
      group.participants.add(userId);
      const targetSocket = userSockets.get(userId);
      if (targetSocket) {
        io.to(targetSocket).emit('admitted-to-group', { groupId, groupName: group.name });
        io.sockets.sockets.get(targetSocket)?.join(groupId);
      }
      io.to(groupId).emit('group-participants-update', {
        participants: Array.from(group.participants).map(uid => ({ userId: uid, username: users.get(userSockets.get(uid))?.username }))
      });
      // обновляем зал ожидания для хоста
      io.to(userSockets.get(group.hostId)).emit('waiting-list-update', {
        groupId, waiting: Array.from(group.waiting).map(uid => ({ userId: uid, username: users.get(userSockets.get(uid))?.username }))
      });
    }
  });

  socket.on('reject-user', ({ groupId, userId }) => {
    const group = groups.get(groupId);
    if (!group || group.hostId !== socket.userId) return;
    if (group.waiting.has(userId)) {
      group.waiting.delete(userId);
      const targetSocket = userSockets.get(userId);
      if (targetSocket) io.to(targetSocket).emit('rejected-from-group', { groupId });
      io.to(userSockets.get(group.hostId)).emit('waiting-list-update', {
        groupId, waiting: Array.from(group.waiting).map(uid => ({ userId: uid, username: users.get(userSockets.get(uid))?.username }))
      });
    }
  });

  socket.on('group-offer', ({ groupId, targetId, offer }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('group-offer', { from: socket.userId, offer, groupId });
  });
  socket.on('group-answer', ({ groupId, targetId, answer }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('group-answer', { from: socket.userId, answer, groupId });
  });
  socket.on('group-ice', ({ groupId, targetId, candidate }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('group-ice', { from: socket.userId, candidate, groupId });
  });

  // Функции во время звонка
  socket.on('raise-hand', ({ groupId }) => {
    const group = groups.get(groupId);
    if (group && group.hostId !== socket.userId) {
      io.to(userSockets.get(group.hostId)).emit('hand-raised', { userId: socket.userId, username: socket.username, groupId });
    }
  });

  socket.on('group-chat-message', ({ groupId, message }) => {
    const group = groups.get(groupId);
    if (group) {
      group.chatHistory.push({ from: socket.userId, username: socket.username, message, time: Date.now() });
      io.to(groupId).emit('group-chat-message', { from: socket.userId, username: socket.username, message });
    }
  });

  socket.on('start-screen-share', ({ groupId, targetId, offer }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('screen-share-offer', { from: socket.userId, offer, groupId });
  });
  socket.on('screen-share-answer', ({ groupId, targetId, answer }) => {
    const target = userSockets.get(targetId);
    if (target) io.to(target).emit('screen-share-answer', { from: socket.userId, answer, groupId });
  });

  socket.on('leave-group', ({ groupId }) => {
    const group = groups.get(groupId);
    if (group) {
      group.participants.delete(socket.userId);
      group.waiting.delete(socket.userId);
      socket.leave(groupId);
      io.to(groupId).emit('group-participants-update', {
        participants: Array.from(group.participants).map(uid => ({ userId: uid, username: users.get(userSockets.get(uid))?.username }))
      });
      if (group.participants.size === 0 && group.waiting.size === 0) groups.delete(groupId);
      else if (group.hostId === socket.userId && group.participants.size > 0) {
        // переназначаем хоста
        const newHost = Array.from(group.participants)[0];
        group.hostId = newHost;
        io.to(groupId).emit('new-host', { newHost });
      }
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      userSockets.delete(user.userId);
      users.delete(socket.id);
      // удаляем из всех групп
      for (let [groupId, group] of groups.entries()) {
        if (group.participants.has(user.userId) || group.waiting.has(user.userId)) {
          group.participants.delete(user.userId);
          group.waiting.delete(user.userId);
          io.to(groupId).emit('group-participants-update', {
            participants: Array.from(group.participants).map(uid => ({ userId: uid, username: users.get(userSockets.get(uid))?.username }))
          });
          if (group.participants.size === 0 && group.waiting.size === 0) groups.delete(groupId);
          else if (group.hostId === user.userId && group.participants.size > 0) {
            const newHost = Array.from(group.participants)[0];
            group.hostId = newHost;
            io.to(groupId).emit('new-host', { newHost });
          }
        }
      }
      broadcastUserList();
    }
    console.log('Client disconnected:', socket.id);
  });
});

function broadcastUserList() {
  const list = Array.from(userSockets.entries()).map(([uid, sid]) => ({
    userId: uid, username: users.get(sid)?.username || 'Unknown', online: true
  }));
  io.emit('user-list', list);
}

function broadcastGroups() {
  const groupList = Array.from(groups.entries()).map(([gid, g]) => ({
    groupId: gid, name: g.name, hostId: g.hostId, participants: g.participants.size
  }));
  io.emit('group-list', groupList);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
