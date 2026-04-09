const os = require('os');

// Бесплатные STUN/TURN серверы (openrelay)
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

function getIceServers() {
  return ICE_SERVERS;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function generateCallId() {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateGroupId() {
  return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  ICE_SERVERS,
  getIceServers,
  getLocalIP,
  generateCallId,
  generateGroupId
};
