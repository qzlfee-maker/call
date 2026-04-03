import { cache } from '../storage/cache.js';
import { authStore } from '../../store/authStore.js';

/**
 * Сервис скачивания и управления медиа-контентом.
 * Интегрирован с кэшем для мгновенного доступа к ранее загруженным файлам.
 */

class DownloadService {
    /**
     * Получить URL для отображения медиа (из кэша или с сервера)
     * @param {string} fileId - ID файла в базе данных
     * @param {string} type - Тип контента (image, video, document)
     */
    async getMediaUrl(fileId, type = 'image') {
        const cacheKey = `media_${fileId}`;
        
        // 1. Проверяем наличие в оперативном кэше (cache.js)
        const cachedUrl = cache.get(cacheKey);
        if (cachedUrl) return cachedUrl;

        // 2. Если нет в кэше — формируем запрос к Railway
        const API_URL = window.location.hostname === 'localhost' 
            ? `http://localhost:5000/api/media/download/${fileId}` 
            : `https://craneapp-production.up.railway.app/api/media/download/${fileId}`;

        try {
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${authStore.getToken()}` }
            });

            if (!response.ok) throw new Error('Ошибка при получении файла');

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            // 3. Сохраняем в кэш (TTL 1 час для медиа)
            cache.set(cacheKey, objectUrl, 60 * 60 * 1000);

            return objectUrl;
        } catch (error) {
            console.error('[DownloadService] Failed to fetch media:', error);
            return null; // Возвращаем null, чтобы UI показал заглушку (placeholder)
        }
    }

    /**
     * Принудительное скачивание файла на устройство (для документов)
     * @param {string} fileId 
     * @param {string} fileName 
     */
    async downloadToFileSystem(fileId, fileName) {
        const url = await this.getMediaUrl(fileId, 'document');
        if (!url) return;

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Не забываем освобождать память, если это был временный Blob
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    /**
     * Предзагрузка (Preloading) для видео или больших изображений
     */
    async preload(fileId) {
        return this.getMediaUrl(fileId);
    }
}

export const downloadService = new DownloadService();
