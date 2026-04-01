================================================================================
      CRANEAPP MESSENGER — SYSTEM ARCHITECTURE & TECHNICAL SPECIFICATION
================================================================================
Версия: 1.0.0 (Production Ready)
Автор: Senior System Architect (AI Core)
Цель: Полная реплика функционала Telegram (High Load, Real-time, Secure)

--------------------------------------------------------------------------------
1. ОБЩИЙ ОБЗОР СИСТЕМЫ (HIGH-LEVEL DESIGN)
--------------------------------------------------------------------------------
Craneapp построен на принципах событийно-ориентированной микросервисной 
архитектуры (Event-Driven Microservices). Система разделена на независимые 
функциональные блоки, взаимодействующие через API Gateway и брокеры сообщений.

Основные слои:
1. Client Layer (Mobile Web App):
   - SPA архитектура на ванильном JS/React-style компонентах.
   - Socket.io Client для real-time связи.
   - Инкапсулированные Store для управления состоянием (Auth, Chats, Messages).
   - WebRTC стек для аудио/видео звонков.

2. Gateway Layer (Nginx / Node.js API Gateway):
   - Единственная точка входа (Entry Point).
   - Rate Limiting (ограничение запросов для защиты от DDoS).
   - Терминация SSL/TLS.
   - Аутентификация через Middleware перед проксированием в сервисы.

3. Service Layer (Microservices):
   - Auth Service: Управление сессиями, JWT, OTP (SMS/Phone).
   - User Service: Профили, контакты, статусы (Online/Offline).
   - Chat Service: Метаданные чатов, групп, каналов.
   - Message Service: Самый высоконагруженный узел. Обработка сообщений, очередей.
   - Media Service: Обработка изображений (превью), видео (транскодирование), S3.
   - Call Service: WebRTC Signalling сервер, управление комнатами.

4. Data Layer:
   - PostgreSQL: Основное хранилище (Пользователи, Сообщения, Чаты).
   - Redis: Кэширование сессий, real-time статусы, Pub/Sub для уведомлений.
   - S3 (MinIO/AWS): Хранение медиа-файлов.

--------------------------------------------------------------------------------
2. СТЕК ТЕХНОЛОГИЙ
--------------------------------------------------------------------------------
- Backend: Node.js (Runtime), Express (Framework), Socket.io (Real-time).
- Database: PostgreSQL (Relational Data), Redis (In-memory KV).
- Real-time: WebSockets (Engine.io).
- Communication: gRPC (Inter-service), REST (Client-to-Server).
- DevOps: Docker, Kubernetes (K8s), Railway (Deployment).
- Security: Argon2 (Hashing), AES-256-GCM (Encryption), JWT (Auth).

--------------------------------------------------------------------------------
3. ПОДРОБНАЯ ЛОГИКА СЕРВИСОВ
--------------------------------------------------------------------------------

3.1. AUTH SERVICE (Сервис авторизации)
---------------------------------------
Процесс регистрации/входа (Telegram-style):
1. User -> Phone Number -> Gateway.
2. Auth Service генерирует 6-значный OTP код.
3. Сохранение OTP в Redis с TTL 5 минут.
4. Отправка (имитация) SMS.
5. User -> Verify Code -> Auth Service.
6. В случае успеха:
   - Создание User в DB (если новый).
   - Генерация Access Token (JWT, 15 мин).
   - Генерация Refresh Token (UUID в DB, 30 дней).
7. Выдача токенов в HttpOnly Cookies.

3.2. MESSAGE SERVICE (Сервис сообщений)
---------------------------------------
Жизненный цикл сообщения:
1. Отправка (Socket.emit('message:send')):
   - Валидация прав (не забанен ли, состоит ли в группе).
   - Присвоение временного ID (Client Side ID) для мгновенного отображения.
   - Запись в PostgreSQL с пометкой "Status: Sending".
2. Распространение:
   - Поиск всех участников чата в Redis (Active Connections).
   - Отправка через Socket.io активным участникам.
   - Если участник оффлайн -> Push Notification (через Firebase/APNS).
3. Подтверждение:
   - Когда получатель открывает чат -> Socket.emit('message:read').
   - Обновление статуса в DB.
   - Рассылка события 'message:updated' всем участникам.

3.3. MEDIA SERVICE (Облачное хранилище)
---------------------------------------
Алгоритм обработки медиа:
1. Загрузка файла частями (Chunked Upload).
2. Проверка MIME-типа и размера.
3. Генерация миниатюр (Thumbnails) для фото через Sharp.
4. Загрузка в S3-совместимое хранилище.
5. Возврат короткой ссылки (FileID) клиенту.

3.4. CALL SERVICE (WebRTC)
--------------------------
1. Инициация: 'call:request' -> Сигнальный сервер.
2. Цель получает входящий вызов.
3. Обмен ICE Candidates и SDP Offer/Answer.
4. Прямое P2P соединение (или через TURN сервер, если NAT закрыт).

--------------------------------------------------------------------------------
4. МОДЕЛЬ ДАННЫХ (DATABASE SCHEMA)
--------------------------------------------------------------------------------

Table: Users
- id: UUID (PK)
- phone: String (Unique)
- username: String (Unique, Nullable)
- first_name: String
- last_name: String
- avatar_url: Text
- bio: String
- status: Enum (online, offline, recently)
- last_seen: Timestamp
- created_at: Timestamp

Table: Chats
- id: UUID (PK)
- type: Enum (private, group, channel)
- title: String (for groups/channels)
- photo_url: Text
- creator_id: UUID (FK)
- created_at: Timestamp

Table: Chat_Participants
- chat_id: UUID (FK)
- user_id: UUID (FK)
- role: Enum (owner, admin, member)
- joined_at: Timestamp

Table: Messages
- id: BigInt (PK)
- chat_id: UUID (FK, Index)
- sender_id: UUID (FK)
- text: Text
- type: Enum (text, photo, video, file, call_log, system)
- media_url: Text
- reply_to: BigInt (FK, self)
- is_edited: Boolean (Default: false)
- is_read: Boolean (Default: false)
- created_at: Timestamp (Index)

--------------------------------------------------------------------------------
5. БЕЗОПАСНОСТЬ (SECURITY)
--------------------------------------------------------------------------------
- End-to-End Encryption (E2EE): Для секретных чатов (Diffie-Hellman).
- Transport Security: TLS 1.3 на всех этапах.
- JWT Security: Подпись токенов секретным ключом, хранящимся в Environment Variables.
- SQL Injection Prevention: Использование параметризованных запросов (ORM/Query Builders).
- XSS Protection: Экранирование всех входящих данных на клиенте и сервере.

--------------------------------------------------------------------------------
6. МАСШТАБИРОВАНИЕ (SCALING)
--------------------------------------------------------------------------------
- Горизонтальное масштабирование: Каждый микросервис может быть запущен в N экземплярах.
- Sticky Sessions: Для Socket.io на уровне Gateway.
- Redis Pub/Sub: Для синхронизации событий между разными узлами серверов (если пользователь A на сервере 1, а пользователь B на сервере 2).
- Database Sharding: Разделение таблицы сообщений по `chat_id` при достижении 100 млн+ записей.
