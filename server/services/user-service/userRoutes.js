const express = require('express');
const router = express.Router();
const userController = require('./userController');

/**
 * Роуты микросервиса пользователей.
 * Обрабатываются Gateway по префиксу /api/users/*
 */

// 1. Получить профиль текущего авторизованного пользователя
// GET /api/users/me
router.get('/me', (req, res) => userController.getMe(req, res));

// 2. Обновить свой профиль (имя, био, аватар)
// PATCH /api/users/update
router.patch('/update', (req, res) => userController.updateProfile(req, res));

// 3. Поиск пользователей (для добавления в контакты или начала чата)
// GET /api/users/search?query=nickname
router.get('/search', (req, res) => userController.search(req, res));

// 4. Получить публичную информацию о другом пользователе по его ID
// GET /api/users/:id
router.get('/:id', (req, res) => userController.getPublicProfile(req, res));

// 5. Heartbeat - обновление статуса "Online" (вызывается из socketProvider)
// POST /api/users/heartbeat
router.post('/heartbeat', async (req, res) => {
    const userId = req.headers['x-user-id'];
    // Мы можем вызвать сервис напрямую для простых операций
    const { userService } = require('./userService'); 
    await userService.updateLastSeen(userId);
    res.status(200).json({ status: 'updated' });
});

module.exports = router;
