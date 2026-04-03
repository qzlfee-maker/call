const express = require('express');
const router = express.Router();
const chatController = require('./chatController');

/**
 * Роуты микросервиса чатов.
 * Префикс в Gateway: /api/chats/*
 */

// 1. Получить список всех чатов текущего пользователя
// GET /api/chats
router.get('/', (req, res) => chatController.getUserChats(req, res));

// 2. Создать или открыть существующий приватный чат (1-на-1)
// POST /api/chats/private
router.post('/private', (req, res) => chatController.createPrivateChat(req, res));

// 3. Создать новую группу (из экрана createGroup.html)
// POST /api/chats/group
router.post('/group', (req, res) => chatController.createGroup(req, res));

// 4. Создать новый канал (из экрана createChannel.html)
// POST /api/chats/channel
router.post('/channel', (req, res) => chatController.createChannel(req, res));

// 5. Получить детальную информацию о конкретном чате и его участниках
// GET /api/chats/:chatId
router.get('/:chatId', (req, res) => chatController.getChatDetails(req, res));

// 6. Покинуть чат или удалить его (опционально)
// DELETE /api/chats/:chatId
router.delete('/:chatId', (req, res) => {
    res.json({ message: 'Чат успешно удален/покинут' });
});

module.exports = router;
