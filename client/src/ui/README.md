# UI Module

Modular user interface system for MooMoo.io

## Structure

```
ui/
├── index.js              Entry point
├── README.md             This file
│
├── _docs/                Documentation
│   ├── GUIDE.md         Complete guide
│   ├── API.md           API reference
│   └── CHANGELOG.md     Version history
│
├── components/           UI components
│   └── Checkbox.js      Custom checkbox
│
├── managers/             State managers
│   └── UIManager.js     Main controller
│
├── styles/               Stylesheets
│   └── ui.css           Main styles
│
├── utils/                Helper functions
│   ├── dom.js           DOM utilities
│   └── storage.js       Storage wrapper
```

## Quick Start

### HTML Integration

```html
<link rel="stylesheet" href="/src/ui/styles/ui.css">
<script src="/src/ui/managers/UIManager.js"></script>
```

### JavaScript Usage

```javascript
// Open settings menu
window.uiManager.showSettingsMenu();

// Toggle auto heal
window.uiManager.toggleAutoHeal();

// Check status
const enabled = window.uiManager.getAutoHealEnabled();
```

## Features

- Settings menu with animations
- Auto heal toggle
- Custom checkbox component
- DOM manipulation utilities
- localStorage wrapper

## Documentation

Complete documentation is available in the `_docs/` directory:

- **GUIDE.md** - Complete usage guide with examples
- **API.md** - Full API reference
- **CHANGELOG.md** - Version history and updates

## Development

### Adding Components

1. Create file in `components/` directory
2. Follow component pattern (constructor, create, getElement, destroy)
3. Add styles to `styles/ui.css`
4. Export as ES6 module

## Color Scheme

- Primary: #8ecc51 (green)
- Accent: #a56dc8 (purple)
- Background: #ffffff (white)
- Text: #444444 (dark gray)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Version

Current version: 1.0.0

---

For detailed information, see documentation in `_docs/` directory.
