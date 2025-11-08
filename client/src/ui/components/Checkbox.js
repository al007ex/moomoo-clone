class Checkbox {
    constructor(options = {}) {
        this.id = options.id || `checkbox-${Date.now()}`;
        this.label = options.label || '';
        this.description = options.description || '';
        this.checked = options.checked || false;
        this.onChange = options.onChange || (() => {});
        this.element = null;
        this.init();
    }

    init() {
        this.element = this.create();
    }

    create() {
        const container = document.createElement('div');
        container.className = 'settingItem';
        
        const labelContainer = document.createElement('div');
        
        const labelElement = document.createElement('div');
        labelElement.className = 'settingLabel';
        labelElement.textContent = this.label;
        labelContainer.appendChild(labelElement);
        
        if (this.description) {
            const descElement = document.createElement('div');
            descElement.className = 'settingDescription';
            descElement.textContent = this.description;
            labelContainer.appendChild(descElement);
        }
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'customCheckbox';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = this.id;
        input.checked = this.checked;
        input.onchange = (e) => {
            this.checked = e.target.checked;
            this.onChange(this.checked);
        };
        
        const slider = document.createElement('span');
        slider.className = 'checkboxSlider';
        
        checkboxLabel.appendChild(input);
        checkboxLabel.appendChild(slider);
        
        container.appendChild(labelContainer);
        container.appendChild(checkboxLabel);
        
        return container;
    }

    getValue() {
        return this.checked;
    }

    setValue(value) {
        this.checked = value;
        const input = this.element.querySelector('input');
        if (input) {
            input.checked = value;
        }
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

export default Checkbox;
