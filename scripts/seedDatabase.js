/**
 * CRANEAPP DATABASE SEEDER
 * Описание: Автоматическое создание таблиц и первичных данных.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Инициализация подключения (Railway использует DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Обязательно для облачных БД
});

const schemaFiles = [
    'users.txt',
    'chats.txt',
    'messages.txt',
    'calls.txt',
    'settings.txt'
];

async function seed() {
    console.log('🌱 Начинаем сидирование базы данных Craneapp...');

    try {
        // 1. Создание таблиц на основе .txt схем
        for (const file of schemaFiles) {
            const filePath = path.join(__dirname, '../database/schema', file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            await pool.query(sql);
            console.log(`✅ Схема ${file} успешно применена.`);
        }

        // 2. Создание системного пользователя (Support Bot)
        const supportBotId = '00000000-0000-0000-0000-000000000000';
        const checkBot = await pool.query('SELECT id FROM users WHERE id = $1', [supportBotId]);

        if (checkBot.rows.length === 0) {
            await pool.query(`
                INSERT INTO users (id, phone, username, display_name, is_bot)
                VALUES ($1, '+0000000000', 'crane_support', 'Crane Support', true)
            `, [supportBotId]);
            
            // Базовые настройки для бота
            await pool.query(`
                INSERT INTO user_settings (user_id, theme_mode, language_code)
                VALUES ($1, 'telegram', 'en')
            `, [supportBotId]);
            
            console.log('🤖 Системный бот поддержки создан.');
        }

        console.log('✨ База данных полностью готова к работе!');
    } catch (err) {
        console.error('❌ Ошибка при сидировании:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
