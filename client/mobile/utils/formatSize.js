/**
 * Утилита для конвертации байтов в человекочитаемый формат (КБ, МБ, ГБ).
 * Используется для отображения веса вложений и кэша.
 */

export const formatSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';

    // Константа для расчета (1024 для бинарных данных)
    const k = 1024;
    
    // Список единиц измерения
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

    // Находим индекс нужной единицы измерения через логарифм
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Ограничиваем индекс длиной массива (на случай экзотических размеров)
    const unitIndex = Math.min(i, sizes.length - 1);

    // Округляем до 1 знака после запятой (например, 1.4 MB)
    const value = parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(1));

    return `${value} ${sizes[unitIndex]}`;
};

/**
 * Пример использования:
 * formatSize(1500) -> "1.5 KB"
 * formatSize(1048576) -> "1.0 MB"
 */
