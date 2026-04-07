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

// ── Хранилище ──────────────────────────────────────────────
const users       = new Map(); // socketId → { username, userId, status }
const userSockets = new Map(); // userId   → socketId
const groups      = new Map(); // groupId  → { name, hostId, participants[], waiting[], chat[] }

// ── ICE / TURN конфигурация (бесплатный OpenRelay TURN) ────
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

// ── REST API ────────────────────────────────────────────────
app.get('/api/ice-config', (req, res) => {
  res.json({ iceServers: ICE_SERVERS });
});

app.post('/api/register', (req, res) => {
  const { username, userId } = req.body;
  if (!username || !userId) return res.status(400).json({ error: 'username and userId required' });
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

// ── Socket.IO ───────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[socket] connect', socket.id);

  // ─── РЕГИСТРАЦИЯ ───────────────────────────────────────────
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

  socket.on('set-status', ({ status }) => {
    const u = users.get(socket.id);
    if (u) { u.status = status; broadcastUserList(); }
  });

  // ─── ЛИЧНЫЙ ЗВОНОК ──────────────────────────────────────────
  socket.on('call-user', ({ targetId, callType }) => {
    const targetSocketId = userSockets.get(targetId);
    if (targetSocketId && io.sockets.sockets.get(targetSocketId)) {
      io.to(targetSocketId).emit('incoming-call', {
        from: socket.userId,
        fromName: socket.username,
        callType
      });
      const u = users.get(socket.id);
      if (u) { u.status = 'busy'; broadcastUserList(); }
    } else {
      socket.emit('call-error', { message: 'User is offline' });
    }
  });

  socket.on('accept-call', ({ fromId }) => {
    const callerSocketId = userSockets.get(fromId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', {
        targetId: socket.userId,
        targetName: socket.username
      });
      const u = users.get(socket.id);
      if (u) { u.status = 'busy'; broadcastUserList(); }
    }
  });

  socket.on('reject-call', ({ fromId }) => {
    const callerSocketId = userSockets.get(fromId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected');
    }
    const u = users.get(socket.id);
    if (u) { u.status = 'online'; broadcastUserList(); }
  });

  socket.on('end-call', ({ targetId }) => {
    const targetSocketId = userSockets.get(targetId);
    if (targetSocketId) io.to(targetSocketId).emit('call-ended');
    [socket.userId, targetId].forEach(uid => {
      const sid = userSockets.get(uid);
      if (sid) { const u = users.get(sid); if (u) u.status = 'online'; }
    });
    broadcastUserList();
  });

  // ─── WebRTC СИГНАЛИНГ (личный) ──────────────────────────────
  socket.on('offer', ({ targetId, offer }) => {
    const sid = userSockets.get(targetId);
    if (sid) io.to(sid).emit('offer', { from: socket.userId, offer });
  });

  socket.on('answer', ({ targetId, answer }) => {
    const sid = userSockets.get(targetId);
    if (sid) io.to(sid).emit('answer', { from: socket.userId, answer });
  });

  socket.on('ice-candidate', ({ targetId, candidate }) => {
    const sid = userSockets.get(targetId);
    if (sid) io.to(sid).emit('ice-candidate', { from: socket.userId, candidate });
  });

  // ─── ГРУППОВЫЕ ЗВОНКИ ────────────────────────────────────────
  socket.on('create-group', ({ groupName, groupId }) => {
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        name: groupName,
        hostId: socket.userId,
        participants: [{ userId: socket.userId, username: socket.username }],
        waiting: [],
        chat: [],
        startTime: Date.now()
      });
    }
    socket.join(`group:${groupId}`);
    socket.groupId = groupId;
    socket.emit('group-created', { groupId });
    const u = users.get(socket.id);
    if (u) { u.status = 'busy'; broadcastUserList(); }
    broadcastGroups();
    console.log(`[group-create] ${groupName} by ${socket.username}`);
  });

  socket.on('get-groups', () => {
    const list = Array.from(groups.entries()).map(([gid, g]) => ({
      groupId: gid,
      name: g.name,
      participants: g.participants.length,
      hostId: g.hostId
    }));
    socket.emit('group-list', list);
  });

  socket.on('join-group-request', ({ groupId }) => {
    const group = groups.get(groupId);
    if (!group) { socket.emit('group-not-found'); return; }
    if (group.participants.find(p => p.userId === socket.userId)) {
      socket.join(`group:${groupId}`);
      socket.groupId = groupId;
      socket.emit('admitted-to-group', {
        groupId,
        hostId: group.hostId,
        participants: group.participants,
        chat: group.chat
      });
      return;
    }
    if (!group.waiting.find(w => w.userId === socket.userId)) {
      group.waiting.push({ userId: socket.userId, username: socket.username, socketId: socket.id });
    }
    const hostSid = userSockets.get(group.hostId);
    if (hostSid) {
      io.to(hostSid).emit('waiting-list-update', { waiting: group.waiting.map(w => ({ userId: w.userId, username: w.username })) });
    }
    socket.emit('waiting-for-admission', { groupName: group.name });
  });

  socket.on('admit-participant', ({ groupId, userId }) => {
    const group = groups.get(groupId);
    if (!group || group.hostId !== socket.userId) return;
    const idx = group.waiting.findIndex(w => w.userId === userId);
    if (idx === -1) return;
    const [participant] = group.waiting.splice(idx, 1);
    group.participants.push({ userId: participant.userId, username: participant.username });
    const pSid = userSockets.get(userId);
    if (pSid) {
      io.to(pSid).emit('admitted-to-group', {
        groupId,
        hostId: group.hostId,
        participants: group.participants,
        chat: group.chat
      });
      const s = io.sockets.sockets.get(pSid);
      if (s) { s.join(`group:${groupId}`); s.groupId = groupId; }
      const u = users.get(pSid); if (u) u.status = 'busy';
    }
    io.to(`group:${groupId}`).emit('group-participants-update', { participants: group.participants });
    const hostSid = userSockets.get(group.hostId);
    if (hostSid) io.to(hostSid).emit('waiting-list-update', { waiting: group.waiting.map(w => ({ userId: w.userId, username: w.username })) });
    broadcastUserList();
    broadcastGroups();
  });

  socket.on('reject-participant', ({ groupId, userId }) => {
    const group = groups.get(groupId);
    if (!group || group.hostId !== socket.userId) return;
    group.waiting = group.waiting.filter(w => w.userId !== userId);
    const pSid = userSockets.get(userId);
    if (pSid) io.to(pSid).emit('rejected-from-group');
    const hostSid = userSockets.get(group.hostId);
    if (hostSid) io.to(hostSid).emit('waiting-list-update', { waiting: group.waiting.map(w => ({ userId: w.userId, username: w.username })) });
  });

  socket.on('leave-group', ({ groupId }) => {
    const group = groups.get(groupId);
    if (group) {
      group.participants = group.participants.filter(p => p.userId !== socket.userId);
      socket.leave(`group:${groupId}`);
      if (group.hostId === socket.userId && group.participants.length > 0) {
        group.hostId = group.participants[0].userId;
        io.to(`group:${groupId}`).emit('host-changed', { newHostId: group.hostId });
      }
      if (group.participants.length === 0 && group.waiting.length === 0) {
        groups.delete(groupId);
      } else {
        io.to(`group:${groupId}`).emit('group-participants-update', { participants: group.participants });
      }
      broadcastGroups();
    }
    const u = users.get(socket.id); if (u) u.status = 'online';
    broadcastUserList();
  });

  socket.on('end-group-call', ({ groupId }) => {
    const group = groups.get(groupId);
    if (!group || group.hostId !== socket.userId) return;
    io.to(`group:${groupId}`).emit('call-ended');
    group.participants.forEach(p => {
      const sid = userSockets.get(p.userId);
      if (sid) { const u = users.get(sid); if (u) u.status = 'online'; }
    });
    groups.delete(groupId);
    broadcastGroups();
    broadcastUserList();
  });

  // ─── WebRTC СИГНАЛИНГ (групповой) ───────────────────────────
  socket.on('group-offer', ({ groupId, targetId, offer }) => {
    const sid = userSockets.get(targetId);
    if (sid) io.to(sid).emit('group-offer', { from: socket.userId, fromName: socket.username, offer });
  });

  socket.on('group-answer', ({ groupId, targetId, answer }) => {
    const sid = userSockets.get(targetId);
    if (sid) io.to(sid).emit('group-answer', { from: socket.userId, answer });
  });

  socket.on('group-ice', ({ groupId, targetId, candidate }) => {
    const sid = userSockets.get(targetId);
    if (sid) io.to(sid).emit('group-ice', { from: socket.userId, candidate });
  });

  socket.on('raise-hand', ({ groupId }) => {
    io.to(`group:${groupId}`).emit('hand-raised', {
      userId: socket.userId,
      username: socket.username
    });
  });

  socket.on('group-chat-message', ({ groupId, message }) => {
    const group = groups.get(groupId);
    if (!group) return;
    const msg = { userId: socket.userId, username: socket.username, message, time: Date.now() };
    group.chat.push(msg);
    if (group.chat.length > 200) group.chat.shift();
    io.to(`group:${groupId}`).emit('group-chat-message', msg);
  });

  socket.on('screen-share-started', ({ groupId }) => {
    socket.to(`group:${groupId}`).emit('screen-share-started', { userId: socket.userId, username: socket.username });
  });

  socket.on('screen-share-stopped', ({ groupId }) => {
    socket.to(`group:${groupId}`).emit('screen-share-stopped', { userId: socket.userId });
  });

  // ─── ОТКЛЮЧЕНИЕ ───────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('[socket] disconnect', socket.id, socket.userId);
    if (socket.userId) {
      userSockets.delete(socket.userId);
      users.delete(socket.id);
      if (socket.groupId) {
        const group = groups.get(socket.groupId);
        if (group) {
          group.participants = group.participants.filter(p => p.userId !== socket.userId);
          if (group.hostId === socket.userId && group.participants.length > 0) {
            group.hostId = group.participants[0].userId;
            io.to(`group:${socket.groupId}`).emit('host-changed', { newHostId: group.hostId });
          }
          if (group.participants.length === 0 && group.waiting.length === 0) {
            groups.delete(socket.groupId);
          } else {
            io.to(`group:${socket.groupId}`).emit('group-participants-update', { participants: group.participants });
          }
          broadcastGroups();
        }
      }
      broadcastUserList();
    }
  });
});

function broadcastUserList() {
  const list = Array.from(userSockets.entries()).map(([userId, socketId]) => ({
    userId,
    username: users.get(socketId)?.username || 'Unknown',
    status:   users.get(socketId)?.status   || 'online'
  }));
  io.emit('user-list', list);
}

function broadcastGroups() {
  const list = Array.from(groups.entries()).map(([gid, g]) => ({
    groupId: gid,
    name: g.name,
    participants: g.participants.length,
    hostId: g.hostId
  }));
  io.emit('group-list', list);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CraneCall server running on port ${PORT}`);
});
