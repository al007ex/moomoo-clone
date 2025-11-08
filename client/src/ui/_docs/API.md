# UI Module API Reference

Complete API documentation for MooMoo.io UI system

## Table of Contents

1. [UIManager](#uimanager)
2. [Components](#components)
3. [Utilities](#utilities)

---

## UIManager

Main controller for UI operations. Available globally as `window.uiManager`.

### Constructor

```javascript
new UIManager()
```

Automatically initializes when DOM is ready.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `settingsMenuVisible` | boolean | Settings menu visibility state |
| `autoHealEnabled` | boolean | Auto heal feature state |

### Methods

#### Menu Control

**showSettingsMenu()**

Opens the settings menu.

```javascript
window.uiManager.showSettingsMenu();
```

Returns: `void`

---

**hideSettingsMenu()**

Closes the settings menu.

```javascript
window.uiManager.hideSettingsMenu();
```

Returns: `void`

---

**toggleSettingsMenu()**

Toggles settings menu visibility.

```javascript
window.uiManager.toggleSettingsMenu();
```

Returns: `void`

---

#### Settings Management

**toggleAutoHeal()**

Toggles auto heal feature on/off.

```javascript
window.uiManager.toggleAutoHeal();
```

Returns: `void`

---

**updateAutoHealUI()**

Updates auto heal checkbox state in UI.

```javascript
window.uiManager.updateAutoHealUI();
```

Returns: `void`

---

**getAutoHealEnabled()**

Gets current auto heal state.

```javascript
const enabled = window.uiManager.getAutoHealEnabled();
```

Returns: `boolean`

---

#### Storage Operations

**loadSetting(key)**

Loads a setting from localStorage.

Parameters:
- `key` (string): Setting key

```javascript
const value = window.uiManager.loadSetting('mySetting');
```

Returns: `string | null`

---

**saveSetting(key, value)**

Saves a setting to localStorage.

Parameters:
- `key` (string): Setting key
- `value` (string): Setting value

```javascript
window.uiManager.saveSetting('mySetting', 'value');
```

Returns: `void`

---

### Internal Methods

**createSettingsMenu()**

Creates settings menu DOM structure. Called automatically during initialization.

**createSettingsToggleButton()**

Creates settings toggle button. Called automatically during initialization.

**init()**

Initializes the UI manager. Called automatically by constructor.

---

## Components

### Checkbox

Custom animated checkbox component.

#### Constructor

```javascript
new Checkbox(options)
```

Parameters:
- `options` (Object): Configuration object
  - `id` (string): Checkbox ID (optional, auto-generated if not provided)
  - `label` (string): Label text (default: '')
  - `description` (string): Description text (optional)
  - `checked` (boolean): Initial checked state (default: false)
  - `onChange` (function): Change callback (default: noop)

Example:
```javascript
import Checkbox from './components/Checkbox.js';

const checkbox = new Checkbox({
    id: 'myCheckbox',
    label: 'Enable Feature',
    description: 'Turn this feature on or off',
    checked: true,
    onChange: (value) => {
        console.log('Changed to:', value);
    }
});
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Checkbox unique identifier |
| `label` | string | Label text |
| `description` | string | Description text |
| `checked` | boolean | Current checked state |
| `onChange` | function | Change event callback |
| `element` | HTMLElement | Root DOM element |

#### Methods

**getValue()**

Gets current checkbox value.

```javascript
const value = checkbox.getValue();
```

Returns: `boolean`

---

**setValue(value)**

Sets checkbox value.

Parameters:
- `value` (boolean): New value

```javascript
checkbox.setValue(true);
```

Returns: `void`

---

**getElement()**

Gets root DOM element.

```javascript
const element = checkbox.getElement();
document.body.appendChild(element);
```

Returns: `HTMLElement`

---

**destroy()**

Removes checkbox from DOM and cleans up.

```javascript
checkbox.destroy();
```

Returns: `void`

---

**create()**

Creates checkbox DOM structure. Called automatically by constructor.

Returns: `HTMLElement`

---

## Utilities

### DOM Utilities

Located in `utils/dom.js`

#### createElement(tag, options)

Creates an element with specified properties.

Parameters:
- `tag` (string): HTML tag name
- `options` (Object): Element configuration
  - `id` (string): Element ID
  - `className` (string): CSS class name
  - `text` (string): Text content
  - `html` (string): HTML content
  - `attributes` (Object): HTML attributes
  - `styles` (Object): Inline styles
  - `events` (Object): Event listeners
  - `children` (Array): Child elements

```javascript
import { createElement } from './utils/dom.js';

const button = createElement('button', {
    id: 'myButton',
    className: 'btn btn-primary',
    text: 'Click Me',
    attributes: {
        'data-action': 'submit'
    },
    styles: {
        padding: '10px',
        background: '#8ecc51'
    },
    events: {
        click: (e) => console.log('Clicked!')
    }
});
```

Returns: `HTMLElement`

---

#### removeAllChildren(element)

Removes all child elements from a container.

Parameters:
- `element` (HTMLElement): Container element

```javascript
import { removeAllChildren } from './utils/dom.js';

const container = document.getElementById('container');
removeAllChildren(container);
```

Returns: `void`

---

#### addClassWithAnimation(element, className)

Adds a class with animation support.

Parameters:
- `element` (HTMLElement): Target element
- `className` (string): Class name to add

```javascript
import { addClassWithAnimation } from './utils/dom.js';

addClassWithAnimation(element, 'visible');
```

Returns: `void`

---

#### removeClassWithAnimation(element, className, callback)

Removes a class with animation support.

Parameters:
- `element` (HTMLElement): Target element
- `className` (string): Class name to remove
- `callback` (function): Callback after animation (optional)

```javascript
import { removeClassWithAnimation } from './utils/dom.js';

removeClassWithAnimation(element, 'visible', () => {
    console.log('Animation complete');
});
```

Returns: `void`

---

#### isVisible(element)

Checks if element is visible.

Parameters:
- `element` (HTMLElement): Element to check

```javascript
import { isVisible } from './utils/dom.js';

if (isVisible(element)) {
    console.log('Element is visible');
}
```

Returns: `boolean`

---

#### getPosition(element)

Gets element position relative to viewport.

Parameters:
- `element` (HTMLElement): Target element

```javascript
import { getPosition } from './utils/dom.js';

const pos = getPosition(element);
console.log(pos.top, pos.left, pos.width, pos.height);
```

Returns: `Object` with properties:
- `top` (number)
- `left` (number)
- `bottom` (number)
- `right` (number)
- `width` (number)
- `height` (number)

---

#### scrollToElement(element, options)

Smoothly scrolls to element.

Parameters:
- `element` (HTMLElement): Target element
- `options` (Object): Scroll options (optional)
  - `behavior` (string): 'smooth' or 'auto' (default: 'smooth')
  - `block` (string): Vertical alignment (default: 'center')
  - `inline` (string): Horizontal alignment (default: 'nearest')

```javascript
import { scrollToElement } from './utils/dom.js';

scrollToElement(element, {
    behavior: 'smooth',
    block: 'start'
});
```

Returns: `void`

---

### Storage Utilities

Located in `utils/storage.js`

All keys are automatically prefixed with 'moomoo_'.

#### save(key, value)

Saves value to localStorage.

Parameters:
- `key` (string): Storage key
- `value` (any): Value to save (will be JSON serialized)

```javascript
import { save } from './utils/storage.js';

save('settings', {
    volume: 0.8,
    quality: 'high'
});
```

Returns: `boolean` (success status)

---

#### load(key, defaultValue)

Loads value from localStorage.

Parameters:
- `key` (string): Storage key
- `defaultValue` (any): Default value if key not found (optional)

```javascript
import { load } from './utils/storage.js';

const settings = load('settings', { volume: 1.0 });
```

Returns: `any` (stored value or defaultValue)

---

#### remove(key)

Removes value from localStorage.

Parameters:
- `key` (string): Storage key

```javascript
import { remove } from './utils/storage.js';

remove('settings');
```

Returns: `boolean` (success status)

---

#### clear()

Clears all values with 'moomoo_' prefix.

```javascript
import { clear } from './utils/storage.js';

clear();
```

Returns: `boolean` (success status)

---

#### has(key)

Checks if key exists in localStorage.

Parameters:
- `key` (string): Storage key

```javascript
import { has } from './utils/storage.js';

if (has('settings')) {
    console.log('Settings exist');
}
```

Returns: `boolean`

---

#### getAllKeys()

Gets all keys with 'moomoo_' prefix.

```javascript
import { getAllKeys } from './utils/storage.js';

const keys = getAllKeys();
console.log('Stored keys:', keys);
```

Returns: `Array<string>`

---

#### isAvailable()

Checks if localStorage is available.

```javascript
import { isAvailable } from './utils/storage.js';

if (isAvailable()) {
    console.log('localStorage is available');
}
```

Returns: `boolean`

---

## Type Definitions

### Options Objects

**CheckboxOptions**
```typescript
{
    id?: string;
    label?: string;
    description?: string;
    checked?: boolean;
    onChange?: (value: boolean) => void;
}
```

**CreateElementOptions**
```typescript
{
    id?: string;
    className?: string;
    text?: string;
    html?: string;
    attributes?: { [key: string]: string };
    styles?: { [key: string]: string };
    events?: { [event: string]: (e: Event) => void };
    children?: HTMLElement[];
}
```

**ScrollOptions**
```typescript
{
    behavior?: 'smooth' | 'auto';
    block?: 'start' | 'center' | 'end' | 'nearest';
    inline?: 'start' | 'center' | 'end' | 'nearest';
}
```

---

## Events

### UIManager Events

UIManager does not emit custom events. Use callbacks and state getters instead.

### Component Events

**Checkbox**
- `onChange`: Fired when checkbox value changes
  - Parameters: `value` (boolean)

---

## CSS Classes

### Settings Menu

| Class | Description |
|-------|-------------|
| `.settingsMenuPanel` | Main menu container |
| `.settingsOverlay` | Background overlay |
| `.settingsHeader` | Menu header |
| `.settingsSection` | Settings section container |
| `.settingsSectionTitle` | Section title |
| `.settingItem` | Individual setting row |
| `.settingLabel` | Setting label text |
| `.settingDescription` | Setting description text |
| `.settingsCloseButton` | Close button |

### Checkbox

| Class | Description |
|-------|-------------|
| `.customCheckbox` | Checkbox container |
| `.checkboxSlider` | Animated slider |

### Button

| Class | Description |
|-------|-------------|
| `.settingsToggleButton` | Settings toggle button |

### States

| Class | Description |
|-------|-------------|
| `.visible` | Element is visible |
| `.hidden` | Element is hidden |
| `.active` | Element is active |

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

None. Pure vanilla JavaScript.

---

For usage examples, see GUIDE.md
For version history, see CHANGELOG.md
