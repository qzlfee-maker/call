================================================================================
          CRANEAPP MESSENGER — DATABASE SCHEMA (POSTGRESQL DIALECT)
================================================================================
Версия: 1.0.1
Тип БД: Реляционная (PostgreSQL) + NoSQL (Redis для кэша)
Цель: Высокая доступность, поддержка ACID, полнотекстовый поиск.

--------------------------------------------------------------------------------
1. ПЕРЕЧИСЛЕНИЯ (ENUM TYPES)
--------------------------------------------------------------------------------

CREATE TYPE user_status AS ENUM ('online', 'offline', 'away', 'recently');
CREATE TYPE chat_type AS ENUM ('private', 'group', 'channel', 'bot');
CREATE TYPE participant_role AS ENUM ('owner', 'admin', 'member', 'restricted');
CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'voice', 'location', 'contact', 'call_log', 'system');
CREATE TYPE call_status AS ENUM ('missed', 'cancelled', 'accepted', 'rejected', 'ended');

--------------------------------------------------------------------------------
2. ТАБЛИЦЫ (TABLES)
--------------------------------------------------------------------------------

-- 2.1. Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(32) UNIQUE,
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64),
    bio TEXT,
    avatar_url TEXT,
    status user_status DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_bot BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    public_key TEXT, -- Для E2EE (End-to-End Encryption)
    language_code VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.2. Таблица чатов
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type chat_type NOT NULL,
    title VARCHAR(128), -- Для групп и каналов
    about TEXT,
    invite_link VARCHAR(255) UNIQUE,
    photo_url TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    slow_mode_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.3. Участники чатов (Связующая таблица)
CREATE TABLE chat_participants (
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role participant_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    last_read_message_id BIGINT, -- Ссылка на ID последнего прочитанного сообщения
    PRIMARY KEY (chat_id, user_id)
);

-- 2.4. Таблица сообщений (Самая нагруженная)
-- Используем BIGINT для ID для поддержки триллионов сообщений
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type message_type DEFAULT 'text',
    content TEXT, -- Для текстовых сообщений
    file_id UUID, -- Ссылка на метаданные файла в Media Service
    media_url TEXT,
    reply_to_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    forwarded_from_id UUID REFERENCES users(id),
    metadata JSONB, -- Для кастомных данных (координаты, длительность аудио и т.д.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE
);

-- 2.5. Реакции на сообщения
CREATE TABLE message_reactions (
    message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id, emoji)
);

-- 2.6. Звонки
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    caller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Для P2P
    status call_status NOT NULL,
    is_video BOOLEAN DEFAULT FALSE,
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 2.7. Контакты пользователя
CREATE TABLE contacts (
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    custom_name VARCHAR(128), -- Как пользователь переименовал контакт
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (owner_id, contact_user_id)
);

--------------------------------------------------------------------------------
3. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ (INDEXES)
--------------------------------------------------------------------------------

-- Поиск по номеру телефона и юзернейму
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_username ON users(username);

-- Получение списка чатов пользователя (через участников)
CREATE INDEX idx_participants_user_id ON chat_participants(user_id);

-- Получение истории сообщений в чате (сортировка по времени)
CREATE INDEX idx_messages_chat_id_created ON messages(chat_id, created_at DESC);

-- Полнотекстовый поиск по содержимому сообщений (Gin index)
CREATE INDEX idx_messages_content_search ON messages USING GIN (to_tsvector('russian', content));

-- Быстрый доступ к реакциям
CREATE INDEX idx_reactions_message_id ON message_reactions(message_id);

--------------------------------------------------------------------------------
4. ТРИГГЕРЫ (TRIGGERS)
--------------------------------------------------------------------------------

-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_update_chats_timestamp BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Триггер на изменение сообщения (ставит is_edited = true)
CREATE OR REPLACE FUNCTION mark_as_edited()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content <> NEW.content THEN
        NEW.is_edited = TRUE;
        NEW.edited_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_messages_edit BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION mark_as_edited();

--------------------------------------------------------------------------------
5. REDIS STRUCTURE (Кэширование и Real-time)
--------------------------------------------------------------------------------

/*
В Redis мы храним временные данные, которые не требуют жесткой структуры:

1. Сессии: 
   Key: "session:{access_token}" -> Value: { user_id, device_info, expires_at }
   
2. Статусы Online (TTL 60s):
   Key: "online:{user_id}" -> Value: "true"
   
3. Очередь сокетов:
   Key: "socket_map:{user_id}" -> Value: List [socket_id1, socket_id2] (у пользователя может быть несколько устройств)
   
4. OTP коды (TTL 5m):
   Key: "otp:{phone}" -> Value: "123456"
   
5. Typing status:
   Key: "typing:{chat_id}:{user_id}" -> Value: "typing..." (TTL 3s)
*/
