# UI Module Guide

Complete guide for MooMoo.io UI system

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Usage Examples](#usage-examples)
5. [Development](#development)

---

## Quick Start

### Installation

The UI module is already integrated into the project. Files are located in `client/src/ui/`.

### Basic Setup

**HTML Integration:**
```html
<!-- Add to <head> -->
<link rel="stylesheet" href="/src/ui/styles/ui.css">

<!-- Add before </head> -->
<script src="/src/ui/managers/UIManager.js"></script>
```

**JavaScript Usage:**
```javascript
// UIManager is available globally
window.uiManager.showSettingsMenu();
window.uiManager.toggleAutoHeal();

// Check Auto Heal status
const isEnabled = window.uiManager.getAutoHealEnabled();
```

### First Steps

1. Test the settings menu functionality
2. Review the code in `managers/UIManager.js`
3. Customize styles in `styles/ui.css`

---

## Architecture

### Directory Structure

```
ui/
├── index.js              Main entry point
├── README.md             Quick reference
│
├── _docs/                Documentation
│   ├── GUIDE.md         This file
│   ├── API.md           API reference
│   └── CHANGELOG.md     Version history
│
├── components/           Reusable UI components
│   └── Checkbox.js      Custom checkbox component
│
├── managers/             UI state managers
│   └── UIManager.js     Main UI controller
│
├── styles/               CSS stylesheets
│   └── ui.css           Main styles
│
├── utils/                Helper functions
│   ├── dom.js           DOM manipulation
│   └── storage.js       localStorage wrapper
```

### Design Principles

**Modularity**
- Each component is self-contained
- Clear separation of concerns
- Easy to extend and maintain

**Performance**
- Minimal DOM operations
- Efficient event handling
- Optimized animations

**Consistency**
- Unified design language
- Consistent naming conventions
- Standardized code style

---

## Components

### UIManager

Main controller for all UI operations.

**Methods:**
```javascript
// Menu control
showSettingsMenu()
hideSettingsMenu()
toggleSettingsMenu()

// Settings
toggleAutoHeal()
updateAutoHealUI()
getAutoHealEnabled()

// Storage
loadSetting(key)
saveSetting(key, value)
```

**Example:**
```javascript
// Open settings
window.uiManager.showSettingsMenu();

// Toggle auto heal
window.uiManager.toggleAutoHeal();

// Get current state
const enabled = window.uiManager.getAutoHealEnabled();
console.log('Auto Heal:', enabled);
```

### Checkbox Component

Custom animated checkbox with label and description.

**Constructor:**
```javascript
new Checkbox({
    id: 'myCheckbox',
    label: 'Setting Name',
    description: 'Setting description',
    checked: false,
    onChange: (value) => { /* callback */ }
})
```

**Methods:**
```javascript
getValue()           // Get current value
setValue(value)      // Set value
getElement()         // Get DOM element
destroy()            // Remove from DOM
```

**Example:**
```javascript
import Checkbox from './components/Checkbox.js';

const checkbox = new Checkbox({
    label: 'Enable Feature',
    description: 'Turn this feature on or off',
    checked: true,
    onChange: (value) => {
        console.log('Checkbox changed:', value);
    }
});

document.body.appendChild(checkbox.getElement());
```

---

## Usage Examples

### Adding a New Setting

**Step 1: Update UIManager**

Edit `managers/UIManager.js`:

```javascript
// Add to constructor
this.mySettingEnabled = this.loadSetting("mySetting") === "true";

// Add to createSettingsMenu()
<div class="settingItem">
    <div>
        <div class="settingLabel">My Setting</div>
        <div class="settingDescription">Description of my setting</div>
    </div>
    <label class="customCheckbox">
        <input type="checkbox" id="mySettingCheckbox" 
               onchange="uiManager.toggleMySetting()">
        <span class="checkboxSlider"></span>
    </label>
</div>

// Add methods
toggleMySetting() {
    this.mySettingEnabled = !this.mySettingEnabled;
    this.saveSetting("mySetting", this.mySettingEnabled.toString());
    this.updateMySettingUI();
}

updateMySettingUI() {
    const checkbox = document.getElementById("mySettingCheckbox");
    if (checkbox) {
        checkbox.checked = this.mySettingEnabled;
    }
}

getMySettingEnabled() {
    return this.mySettingEnabled;
}
```

**Step 2: Use in Game Logic**

In `index.js`:

```javascript
function updateGame() {
    // Check setting
    if (window.uiManager && window.uiManager.getMySettingEnabled()) {
        // Execute feature
    }
}
```

### Creating a Custom Component

**Step 1: Create Component File**

Create `components/MyComponent.js`:

```javascript
class MyComponent {
    constructor(options = {}) {
        this.title = options.title || 'Component';
        this.element = this.create();
    }

    create() {
        const container = document.createElement('div');
        container.className = 'my-component';
        
        const title = document.createElement('h3');
        title.textContent = this.title;
        container.appendChild(title);
        
        return container;
    }

    getElement() {
        return this.element;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default MyComponent;
```

**Step 2: Add Styles**

Add to `styles/ui.css`:

```css
.my-component {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.my-component h3 {
    margin: 0 0 12px 0;
    color: #444;
    font-size: 18px;
}
```

**Step 3: Use Component**

```javascript
import MyComponent from './components/MyComponent.js';

const component = new MyComponent({
    title: 'My Custom Component'
});

document.body.appendChild(component.getElement());
```

### Using Utilities

**DOM Utilities:**

```javascript
import { createElement, removeAllChildren } from './utils/dom.js';

// Create element
const button = createElement('button', {
    className: 'my-button',
    text: 'Click Me',
    events: {
        click: () => console.log('Clicked!')
    }
});

// Clear container
const container = document.getElementById('container');
removeAllChildren(container);
container.appendChild(button);
```

**Storage Utilities:**

```javascript
import { save, load, has, remove } from './utils/storage.js';

// Save data
save('userSettings', {
    volume: 0.8,
    quality: 'high'
});

// Load data
const settings = load('userSettings', { volume: 1.0 });

// Check existence
if (has('userSettings')) {
    console.log('Settings found');
}

// Remove data
remove('userSettings');
```

---

## Development

### Adding New Components

1. Create file in `components/` directory
2. Follow the component pattern (constructor, create, getElement, destroy)
3. Add corresponding styles in `styles/ui.css`
4. Export as ES6 module
5. Document in API.md

### Code Style

**Naming Conventions:**
- Classes: PascalCase (e.g., `UIManager`, `Checkbox`)
- Functions: camelCase (e.g., `showMenu`, `toggleSetting`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_WIDTH`)
- Private methods: prefix with underscore (e.g., `_init`)

**File Organization:**
- One class per file
- File name matches class name
- Group related functionality

**Comments:**
- Use JSDoc for public methods
- Explain complex logic
- Keep comments concise

### Testing

**Manual Testing:**
1. Test all interactive elements
2. Check console for errors
3. Verify localStorage persistence

**Integration Testing:**
1. Run the full game
2. Test UI in game context
3. Verify settings persistence
4. Check performance impact

### Best Practices

**Performance:**
- Minimize DOM queries
- Cache element references
- Use event delegation
- Debounce frequent operations

**Maintainability:**
- Keep functions small and focused
- Use descriptive variable names
- Avoid deep nesting
- Document complex logic

**Accessibility:**
- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation
- Maintain color contrast

### Common Patterns

**Creating Elements:**
```javascript
const element = document.createElement('div');
element.className = 'my-class';
element.textContent = 'Content';
```

**Event Handling:**
```javascript
element.addEventListener('click', (e) => {
    e.preventDefault();
    // Handle click
});
```

**State Management:**
```javascript
class Component {
    constructor() {
        this.state = {
            visible: false,
            value: null
        };
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }
}
```

---

## Color Scheme

Primary: #8ecc51 (green)
Accent: #a56dc8 (purple)
Background: #ffffff (white)
Text: #444444 (dark gray)
Border: #e0e0e0 (light gray)

## Font

Primary: Hammersmith One, sans-serif

---

For API reference, see API.md
For version history, see CHANGELOG.md
