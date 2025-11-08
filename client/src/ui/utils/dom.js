// DOM Utilities
// Вспомогательные функции для работы с DOM

/**
 * Создает элемент с заданными параметрами
 * @param {string} tag - Тег элемента
 * @param {Object} options - Опции элемента
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.text) element.textContent = options.text;
    if (options.html) element.innerHTML = options.html;
    
    if (options.attributes) {
        Object.keys(options.attributes).forEach(key => {
            element.setAttribute(key, options.attributes[key]);
        });
    }
    
    if (options.styles) {
        Object.assign(element.style, options.styles);
    }
    
    if (options.events) {
        Object.keys(options.events).forEach(event => {
            element.addEventListener(event, options.events[event]);
        });
    }
    
    if (options.children) {
        options.children.forEach(child => {
            if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }
    
    return element;
}

/**
 * Удаляет все дочерние элементы
 * @param {HTMLElement} element
 */
export function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Добавляет класс с анимацией
 * @param {HTMLElement} element
 * @param {string} className
 */
export function addClassWithAnimation(element, className) {
    element.classList.add(className);
    requestAnimationFrame(() => {
        element.classList.add(`${className}-active`);
    });
}

/**
 * Удаляет класс с анимацией
 * @param {HTMLElement} element
 * @param {string} className
 * @param {Function} callback
 */
export function removeClassWithAnimation(element, className, callback) {
    element.classList.remove(`${className}-active`);
    setTimeout(() => {
        element.classList.remove(className);
        if (callback) callback();
    }, 300);
}

/**
 * Проверяет видимость элемента
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isVisible(element) {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
}

/**
 * Получает позицию элемента относительно viewport
 * @param {HTMLElement} element
 * @returns {Object}
 */
export function getPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height
    };
}

/**
 * Плавная прокрутка к элементу
 * @param {HTMLElement} element
 * @param {Object} options
 */
export function scrollToElement(element, options = {}) {
    element.scrollIntoView({
        behavior: options.behavior || 'smooth',
        block: options.block || 'center',
        inline: options.inline || 'nearest'
    });
}
