const express = require('express');
const httpProxy = require('http-proxy');
const helmet = require('helmet');
const cors = require('cors');
const { authMiddleware } = require('./authMiddleware');

const app = express();
const proxy = httpProxy.createProxyServer();
const PORT = process.env.PORT || 5000;

// Настройка адресов микросервисов (внутренние переменные Railway)
const SERVICES = {
    AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
    USER: process.env.USER_SERVICE_URL || 'http://localhost:5002',
    CHAT: process.env.CHAT_SERVICE_URL || 'http://localhost:5003',
    MESSAGE: process.env.MESSAGE_SERVICE_URL || 'http://localhost:5004',
    MEDIA: process.env.MEDIA_SERVICE_URL || 'http://localhost:5005'
};

// 1. Безопасность и CORS
app.use(helmet()); // Защита заголовков
app.use(cors({
    origin: '*', // В продакшене заменить на домен вашего клиента
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Логирование запросов
app.use((req, res, next) => {
    console.log(`[Gateway] ${req.method} ${req.url} -> ${new Date().toISOString()}`);
    next();
});

/**
 * МАРШРУТИЗАЦИЯ (Routing & Proxying)
 */

// Публичные маршруты (Auth) - без проверки токена
app.all('/api/auth/*', (req, res) => {
    proxy.web(req, res, { target: SERVICES.AUTH });
});

// Защищенные маршруты - проходят через authMiddleware
app.use('/api/users', authMiddleware);
app.all('/api/users/*', (req, res) => {
    proxy.web(req, res, { target: SERVICES.USER });
});

app.use('/api/chats', authMiddleware);
app.all('/api/chats/*', (req, res) => {
    proxy.web(req, res, { target: SERVICES.CHAT });
});

app.use('/api/messages', authMiddleware);
app.all('/api/messages/*', (req, res) => {
    proxy.web(req, res, { target: SERVICES.MESSAGE });
});

app.use('/api/media', authMiddleware);
app.all('/api/media/*', (req, res) => {
    proxy.web(req, res, { target: SERVICES.MEDIA });
});

// 3. Обработка ошибок прокси
proxy.on('error', (err, req, res) => {
    console.error('[Gateway Proxy Error]:', err);
    res.status(502).json({ error: 'Сервис временно недоступен', details: err.message });
});

// Health Check для мониторинга Railway
app.get('/health', (req, res) => {
    res.status(200).send('Gateway is UP');
});

app.listen(PORT, () => {
    console.log(`🚀 Craneapp API Gateway running on port ${PORT}`);
    console.log(`Mapped services:`, SERVICES);
});
