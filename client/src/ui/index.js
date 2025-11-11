// require UiManager

const UIManager = require('./managers/UIManager.js');
const uiManagerInstance = new UIManager();

if (typeof window !== 'undefined') {
    window.uiManager = uiManagerInstance;
}

module.exports = uiManagerInstance;
