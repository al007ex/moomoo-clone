// MooMoo.io UI Manager

class UIManager {
    constructor() {
        this.settingsMenuVisible = false;
        this.autoHealEnabled = this.loadSetting("autoHeal") === "true";
        this.init();
    }

    init() {
        this.createSettingsMenu();
        this.updateAutoHealUI();
        if (typeof console !== 'undefined' && console.info) {
            console.info("[UI Manager] initialized. AutoHeal enabled:", this.autoHealEnabled);
        }
    }

    loadSetting(key) {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
        }
        return null;
    }

    saveSetting(key, value) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }
    }

    createSettingsMenu() {
        const overlay = document.createElement('div');
        overlay.id = 'uiSettingsOverlay';
        overlay.className = 'hidden';
        overlay.onclick = () => this.hideSettingsMenu();
        document.body.appendChild(overlay);

        const menuContainer = document.createElement('div');
        menuContainer.id = 'uiMenuContainer';
        menuContainer.className = 'hidden';
        menuContainer.innerHTML = `
            <div class="ui-rectangle-1">
                <div class="ui-main-window">
                    <div class="ui-main-window-bottom-line"></div>
                </div>

                <div class="ui-top-panels">
                    <div class="ui-top-panel"></div>
                    <div class="ui-top-panel"></div>
                    <div class="ui-top-panel"></div>
                </div>

                <div class="ui-rectangle-7">
                    <svg class="ui-arrow-icon" width="12" height="12" viewBox="0 0 24 24">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </div>

                <div class="ui-rectangle-8">
                    <svg class="ui-arrow-icon" width="12" height="12" viewBox="0 0 24 24">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                    </svg>
                </div>

                <div class="ui-rectangle-9">
                    <svg class="ui-arrow-icon" width="12" height="12" viewBox="0 0 24 24">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                </div>
            </div>

            <div class="ui-rectangle-2">
                <div class="ui-options-panel">
                    <div class="ui-block-text">Gameplay</div>
                </div>
                <div class="ui-windows-container">
                    <div class="ui-options-window-left">
                        <div class="ui-control-group">
                            <label for="autoHealCheckbox">Auto Heal</label>
                            <label class="ui-switch">
                                <input type="checkbox" id="autoHealCheckbox">
                                <span class="ui-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="ui-options-window-right">
                        <div class="ui-control-group-vertical">
                            <label for="ui-option-select">Choose Option</label>
                            <div class="ui-custom-dropdown" id="ui-option-select-custom">
                                <div class="ui-dropdown-header">
                                    <span class="ui-dropdown-selected-value">Option 1</span>
                                    <div class="ui-dropdown-arrow"></div>
                                </div>
                                <ul class="ui-dropdown-options">
                                    <li class="ui-dropdown-option" data-value="Option 1">Option 1</li>
                                    <li class="ui-dropdown-option" data-value="Option 2">Option 2</li>
                                    <li class="ui-dropdown-option" data-value="Option 3">Option 3</li>
                                    <li class="ui-dropdown-option" data-value="Option 4">Option 4</li>
                                    <li class="ui-dropdown-option" data-value="Option 5">Option 5</li>
                                </ul>
                            </div>
                        </div>
                        <div class="ui-control-group-vertical">
                            <label for="ui-color-picker">Color</label>
                            <input type="color" id="ui-color-picker" class="ui-custom-color-picker" value="#8ecc51">
                        </div>
                    </div>
                </div>
            </div>

            <div class="ui-rectangle-3">
                <div class="ui-inventory-panel">
                    <div class="ui-block-text">Info</div>
                </div>
                <div class="ui-inventory-text-block">
                    <p style="color: #999; padding: 15px; margin: 0; font-size: 13px; line-height: 1.6;">
                        Press <strong>Insert</strong> to toggle this menu.<br>
                        Use the arrow buttons to expand different sections.<br>
                        Settings are automatically saved.
                    </p>
                </div>
            </div>

            <div class="ui-rectangle-10">
                <div class="ui-map-panel">
                    <div class="ui-block-text">Stats</div>
                </div>
                <div class="ui-windows-container">
                    <div class="ui-map-window-left"></div>
                    <div class="ui-map-window-right"></div>
                </div>
            </div>
        `;
        document.body.appendChild(menuContainer);
        this.attachEventHandlers();
    }

    attachEventHandlers() {
        const handlers = {
            '.ui-rectangle-7': () => this.toggleBlock('ui-rectangle-2'),
            '.ui-rectangle-8': () => this.toggleBlock('ui-rectangle-3'),
            '.ui-rectangle-9': () => this.toggleBlock('ui-rectangle-10'),
            '#autoHealCheckbox': () => this.toggleAutoHeal()
        };

        Object.entries(handlers).forEach(([selector, handler]) => {
            const element = document.querySelector(selector);
            if (element) {
                element[selector.startsWith('#') ? 'onchange' : 'onclick'] = handler;
            }
        });
        this.setupDropdown();
    }

    setupDropdown() {
        const customDropdown = document.getElementById('ui-option-select-custom');
        if (!customDropdown) {
            return;
        }

        const dropdownHeader = customDropdown.querySelector('.ui-dropdown-header');
        const dropdownOptions = customDropdown.querySelector('.ui-dropdown-options');
        const selectedValueSpan = customDropdown.querySelector('.ui-dropdown-selected-value');

        dropdownHeader.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleDropdown(customDropdown);
        });

        dropdownOptions.querySelectorAll('.ui-dropdown-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                selectedValueSpan.textContent = value;
                this.toggleDropdown(customDropdown);
            });
        });

        document.addEventListener('click', (event) => {
            if (!customDropdown.contains(event.target) && customDropdown.classList.contains('open')) {
                this.toggleDropdown(customDropdown);
            }
        });
    }

    toggleDropdown(dropdownElement) {
        const dropdownOptions = dropdownElement.querySelector('.ui-dropdown-options');
        const dropdownHeader = dropdownElement.querySelector('.ui-dropdown-header');

        dropdownElement.classList.toggle('open');
        dropdownHeader.classList.toggle('open');

        if (dropdownElement.classList.contains('open')) {
            dropdownOptions.style.maxHeight = dropdownOptions.scrollHeight + 'px';
            dropdownOptions.style.opacity = '1';
        } else {
            dropdownOptions.style.maxHeight = dropdownOptions.scrollHeight + 'px';
            requestAnimationFrame(() => {
                dropdownOptions.style.maxHeight = '0';
                dropdownOptions.style.opacity = '0';
            });
        }
    }

    toggleBlock(blockClass) {
        const block = document.querySelector('.' + blockClass);
        if (!block) {
            return;
        }
        if (block.classList.contains('active')) {
            block.classList.remove('active');
        } else {
            block.classList.add('active');
        }
    }

    toggleSettingsMenu() {
        if (this.settingsMenuVisible) {
            this.hideSettingsMenu();
        } else {
            this.showSettingsMenu();
        }
    }

    showSettingsMenu() {
        this.settingsMenuVisible = true;
        const overlay = document.getElementById('uiSettingsOverlay');
        const menu = document.getElementById('uiMenuContainer');
        
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('visible');
        }
        
        if (menu) {
            menu.classList.remove('hidden');
            menu.classList.add('visible');
        }

        this.updateAutoHealUI();
    }

    hideSettingsMenu() {
        this.settingsMenuVisible = false;
        const overlay = document.getElementById('uiSettingsOverlay');
        const menu = document.getElementById('uiMenuContainer');
        
        if (overlay) {
            overlay.classList.remove('visible');
            overlay.classList.add('hidden');
        }
        
        if (menu) {
            menu.classList.remove('visible');
            menu.classList.add('hidden');
        }

        const activeBlocks = document.querySelectorAll('.ui-rectangle-2.active, .ui-rectangle-3.active, .ui-rectangle-10.active');
        activeBlocks.forEach(block => block.classList.remove('active'));
    }

    toggleAutoHeal() {
        this.autoHealEnabled = !this.autoHealEnabled;
        this.saveSetting("autoHeal", this.autoHealEnabled.toString());
        this.updateAutoHealUI();
        if (typeof console !== 'undefined' && console.info) {
            console.info("[UI Manager] AutoHeal toggled:", this.autoHealEnabled);
        }
    }

    updateAutoHealUI() {
        const checkbox = document.getElementById("autoHealCheckbox");
        if (checkbox) {
            checkbox.checked = this.autoHealEnabled;
        }
    }

    getAutoHealEnabled() {
        return this.autoHealEnabled;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
