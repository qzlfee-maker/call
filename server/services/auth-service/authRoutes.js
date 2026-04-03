const express = require('express');
const router = express.Router();
const authController = require('./authController');

/**
 * Роуты микросервиса аутентификации.
 * Все пути здесь начинаются относительно корня сервиса.
 * В связке с Gateway полные пути будут: /api/auth/register и т.д.
 */

// 1. Регистрация нового аккаунта
// POST /api/auth/register
router.post('/register', (req, res) => authController.register(req, res));

// 2. Вход в существующий аккаунт
// POST /api/auth/login
router.post('/login', (req, res) => authController.login(req, res));

// 3. Проверка состояния токена (опционально для авто-логина)
// GET /api/auth/check
router.get('/check', (req, res) => {
    // Если запрос дошел сюда через Gateway, значит токен валиден
    res.json({ authenticated: true, userId: req.headers['x-user-id'] });
});

// 4. Логаут (на стороне сервера обычно просто логгируется, 
// так как JWT удаляется на клиенте в authStore.js)
router.post('/logout', (req, res) => {
    res.json({ message: 'Сессия завершена локально' });
});

module.exports = router;
