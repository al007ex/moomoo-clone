// Storage Utilities
// Вспомогательные функции для работы с localStorage

const STORAGE_PREFIX = 'moomoo_';

/**
 * Сохраняет значение в localStorage
 * @param {string} key - Ключ
 * @param {*} value - Значение
 * @returns {boolean} - Успешность операции
 */
export function save(key, value) {
    try {
        const prefixedKey = STORAGE_PREFIX + key;
        const serialized = JSON.stringify(value);
        localStorage.setItem(prefixedKey, serialized);
        return true;
    } catch (error) {
        console.error('Storage save error:', error);
        return false;
    }
}

/**
 * Загружает значение из localStorage
 * @param {string} key - Ключ
 * @param {*} defaultValue - Значение по умолчанию
 * @returns {*} - Загруженное значение или defaultValue
 */
export function load(key, defaultValue = null) {
    try {
        const prefixedKey = STORAGE_PREFIX + key;
        const serialized = localStorage.getItem(prefixedKey);
        
        if (serialized === null) {
            return defaultValue;
        }
        
        return JSON.parse(serialized);
    } catch (error) {
        console.error('Storage load error:', error);
        return defaultValue;
    }
}

/**
 * Удаляет значение из localStorage
 * @param {string} key - Ключ
 * @returns {boolean} - Успешность операции
 */
export function remove(key) {
    try {
        const prefixedKey = STORAGE_PREFIX + key;
        localStorage.removeItem(prefixedKey);
        return true;
    } catch (error) {
        console.error('Storage remove error:', error);
        return false;
    }
}

/**
 * Очищает все значения с префиксом
 * @returns {boolean} - Успешность операции
 */
export function clear() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(STORAGE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        return true;
    } catch (error) {
        console.error('Storage clear error:', error);
        return false;
    }
}

/**
 * Проверяет наличие ключа
 * @param {string} key - Ключ
 * @returns {boolean}
 */
export function has(key) {
    const prefixedKey = STORAGE_PREFIX + key;
    return localStorage.getItem(prefixedKey) !== null;
}

/**
 * Получает все ключи с префиксом
 * @returns {Array<string>}
 */
export function getAllKeys() {
    const keys = Object.keys(localStorage);
    return keys
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .map(key => key.substring(STORAGE_PREFIX.length));
}

/**
 * Проверяет доступность localStorage
 * @returns {boolean}
 */
export function isAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (error) {
        return false;
    }
}
