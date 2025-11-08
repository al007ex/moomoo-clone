// require UiManager

const UIManager = require('./managers/UIManager.js').default;
const uiManagerInstance = new UIManager();

if (typeof window !== 'undefined') {
    window.uiManager = uiManagerInstance;
}

module.exports = uiManagerInstance;
