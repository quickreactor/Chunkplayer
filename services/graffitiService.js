// ====================
// GRAFFITI SERVICE
// ====================

/**
 * Handles graffiti functionality - display, creation, and submission
 * Live preview version - edits appear directly on the poster
 */
class GraffitiService {
    constructor(apiService, domService) {
        this.apiService = apiService;
        this.domService = domService;
        this.graffiti = null;
        this.controlsElement = null;
        this.buttonElement = null;
        this.overlayElement = null;
        this.liveElement = null;
        this.pickr = null;
        this.initialized = false;
        this.isEditing = false;
        this.currentEdit = {
            text: '',
            x: 50,
            y: 50,
            fontSize: 4,  // in vw units (responsive)
            rotation: 0,
            color: '#ffffff',
            font: 'sans-serif'
        };
    }

    /**
     * Initialize graffiti - fetch from API and render button/overlay
     */
    async init() {
        if (this.initialized) return;

        try {
            this.graffiti = await this.apiService.getGraffiti();
            console.log('🎨 Graffiti loaded:', this.graffiti);

            this.renderButton();
            if (this.graffiti && this.graffiti.text) {
                this.renderOverlay();
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize graffiti:', error);
            ErrorHandler.handle(error, 'GraffitiService.init');
        }
    }

    /**
     * Render the graffiti button on the poster container
     * Only shows pencil icon when graffiti hasn't been applied yet
     * Shows nothing when graffiti has been applied for the day
     */
    renderButton() {
        // Remove existing button if any
        if (this.buttonElement) {
            this.buttonElement.remove();
            this.buttonElement = null;
        }

        // If graffiti is locked (already applied), don't show any button
        if (this.graffiti?.locked) {
            return;
        }

        const posterContainer = document.getElementById('todays-poster-container');
        if (!posterContainer) return;

        // Create button with pencil icon - can create graffiti
        this.buttonElement = document.createElement('button');
        this.buttonElement.id = 'graffiti-btn';
        this.buttonElement.title = 'Create today\'s graffiti';
        this.buttonElement.innerHTML = '&#9998;';
        this.buttonElement.addEventListener('click', () => this.startEditing());

        posterContainer.appendChild(this.buttonElement);
    }

    /**
     * Render the graffiti overlay on the poster
     */
    renderOverlay() {
        // Remove existing overlay if any
        if (this.overlayElement) {
            this.overlayElement.remove();
        }

        if (!this.graffiti || !this.graffiti.text) return;

        const posterContainer = document.getElementById('todays-poster-container');
        if (!posterContainer) return;

        // Create overlay
        this.overlayElement = document.createElement('div');
        this.overlayElement.className = 'graffiti-overlay';
        this.overlayElement.textContent = this.graffiti.text;
        this.overlayElement.style.left = `${this.graffiti.x}%`;
        this.overlayElement.style.top = `${this.graffiti.y}%`;
        // Use responsive vw units for new graffiti, px for old (backward compatibility)
        // Old graffiti stored fontSize as px (16-72 range), new is vw (2-30 range)
        const isOldFormat = this.graffiti.fontSize > 30;
        this.overlayElement.style.fontSize = isOldFormat
            ? `${this.graffiti.fontSize}px`
            : `${this.graffiti.fontSize}vw`;
        this.overlayElement.style.transform = `translate(-50%, -50%) rotate(${this.graffiti.rotation}deg)`;

        // Apply color and font if they exist
        if (this.graffiti.color) {
            this.overlayElement.style.color = this.graffiti.color;
        }
        if (this.graffiti.font) {
            this.overlayElement.style.fontFamily = this.getFontFamily(this.graffiti.font);
        }

        posterContainer.appendChild(this.overlayElement);
    }

    /**
     * Get CSS font family from font identifier
     */
    getFontFamily(fontId) {
        const fonts = {
            'sans-serif': "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            'serif': "'Georgia', 'Times New Roman', Times, serif",
            'monospace': "'Courier New', Courier, monospace",
            'cursive': "'Comic Sans MS', 'Chalkboard SE', cursive",
            'fantasy': "'Anton', 'Impact', sans-serif",
            'system-ui': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            'rounded': "'Varela Round', 'Quicksand', 'Nunito', sans-serif",
            'typewriter': "'Special Elite', 'Courier Prime', 'Courier New', monospace",
            // Google Fonts graffiti
            'graffiti-marker': "'Permanent Marker', cursive",
            'graffiti-messy': "'Rock Salt', cursive",
            'graffiti-bubble': "'Knewave', display",
            'graffiti-outline': "'Monoton', cursive",
            'graffiti-spray': "'Rubik Marker Hatch', cursive",
            'graffiti-comic': "'Bangers', cursive",
            'graffiti-fast': "'Faster One', cursive",
            // Custom TTF fonts
            'graffiti-street2': "'Street2Art', sans-serif",
            'graffiti-fromstreet': "'FromStreetArt', sans-serif",
            'graffiti-popstar': "'SuperPopstar', cursive",
            'graffiti-edo': "'Edo', sans-serif",
            'graffiti-hvd': "'HVD Peace', cursive"
        };
        return fonts[fontId] || fonts['sans-serif'];
    }

    /**
     * Get font display name for dropdown
     */
    getFontName(fontId) {
        const names = {
            'sans-serif': 'Sans',
            'serif': 'Serif',
            'monospace': 'Mono',
            'cursive': 'Hand',
            'fantasy': 'Bold',
            'system-ui': 'Modern',
            'rounded': 'Round',
            'typewriter': 'Type',
            // Google Fonts graffiti
            'graffiti-marker': 'Marker',
            'graffiti-messy': 'Messy',
            'graffiti-bubble': 'Bubble',
            'graffiti-outline': 'Outline',
            'graffiti-spray': 'Spray',
            'graffiti-comic': 'Comic',
            'graffiti-fast': 'Fast',
            // Custom TTF fonts
            'graffiti-street2': 'Street2',
            'graffiti-fromstreet': 'FromStreet',
            'graffiti-popstar': 'Popstar',
            'graffiti-edo': 'Edo',
            'graffiti-hvd': 'HVD Peace'
        };
        return names[fontId] || 'Sans';
    }

    /**
     * Get all font options organized by category
     */
    getFontOptions() {
        return [
            // Basic fonts
            { id: 'sans-serif', name: 'Sans', family: "'Segoe UI', sans-serif", category: 'basic' },
            { id: 'serif', name: 'Serif', family: 'Georgia, serif', category: 'basic' },
            { id: 'monospace', name: 'Mono', family: "'Courier New', monospace", category: 'basic' },
            { id: 'cursive', name: 'Hand', family: "'Comic Sans MS', cursive", category: 'basic' },
            { id: 'fantasy', name: 'Bold', family: "'Anton', Impact, sans-serif", category: 'basic' },
            { id: 'system-ui', name: 'Modern', family: 'system-ui', category: 'basic' },
            { id: 'rounded', name: 'Round', family: 'sans-serif', category: 'basic' },
            { id: 'typewriter', name: 'Type', family: "'Courier New', monospace", category: 'basic' },
            // Google Fonts graffiti
            { id: 'graffiti-marker', name: 'Marker', family: "'Permanent Marker', cursive", category: 'graffiti' },
            { id: 'graffiti-messy', name: 'Messy', family: "'Rock Salt', cursive", category: 'graffiti' },
            { id: 'graffiti-bubble', name: 'Bubble', family: "'Knewave', display", category: 'graffiti' },
            { id: 'graffiti-outline', name: 'Outline', family: "'Monoton', cursive", category: 'graffiti' },
            { id: 'graffiti-spray', name: 'Spray', family: "'Rubik Marker Hatch', cursive", category: 'graffiti' },
            { id: 'graffiti-comic', name: 'Comic', family: "'Bangers', cursive", category: 'graffiti' },
            { id: 'graffiti-fast', name: 'Fast', family: "'Faster One', cursive", category: 'graffiti' },
            // Custom TTF fonts
            { id: 'graffiti-street2', name: 'Street2', family: "'Street2Art', sans-serif", category: 'custom' },
            { id: 'graffiti-fromstreet', name: 'FromStreet', family: "'FromStreetArt', sans-serif", category: 'custom' },
            { id: 'graffiti-popstar', name: 'Popstar', family: "'SuperPopstar', cursive", category: 'custom' },
            { id: 'graffiti-edo', name: 'Edo', family: "'Edo', sans-serif", category: 'custom' },
            { id: 'graffiti-hvd', name: 'HVD Peace', family: "'HVD Peace', cursive", category: 'custom' }
        ];
    }

    /**
     * Show info about existing graffiti (when locked)
     */
    showGraffitiInfo() {
        if (!this.graffiti || !this.graffiti.text) return;

        const time = new Date(this.graffiti.timestamp).toLocaleTimeString();
        alert(`Today's graffiti: "${this.graffiti.text}"\n\nSubmitted at ${time}`);
    }

    /**
     * Start editing mode - show controls panel and live preview on poster
     */
    startEditing() {
        if (this.isEditing) return;
        this.isEditing = true;

        const posterContainer = document.getElementById('todays-poster-container');
        const videoContainer = document.querySelector('.videoContainer');
        if (!posterContainer || !videoContainer) return;

        // Hide button while editing
        if (this.buttonElement) {
            this.buttonElement.style.display = 'none';
        }

        // Create controls panel - place it BEFORE the poster container
        this.controlsElement = document.createElement('div');
        this.controlsElement.className = 'graffiti-controls-panel';
        this.controlsElement.innerHTML = `
            <textarea id="graffiti-text" placeholder="Type here... (emojis work too!)" maxlength="100"></textarea>
            <div class="graffiti-hint">👆 Drag text on the poster to move it</div>
            <div class="control-row">
                <label>Size</label>
                <input type="range" id="graffiti-size" min="2" max="30" value="4" step="0.5">
            </div>
            <div class="control-row">
                <label>Rotate</label>
                <input type="range" id="graffiti-rotation" min="-180" max="180" value="0">
            </div>
            <div class="control-row">
                <label>Color</label>
                <div class="color-picker-wrapper">
                    <div id="graffiti-color-picker" class="pickr-trigger">
                        <span class="color-icon">🎨</span>
                    </div>
                </div>
            </div>
            <div class="control-row">
                <label>Font</label>
                <div id="graffiti-font-dropdown" class="custom-font-dropdown">
                    <div class="custom-font-dropdown-trigger" id="font-dropdown-trigger">Sans</div>
                    <div class="custom-font-dropdown-menu" id="font-dropdown-menu"></div>
                </div>
            </div>
            <div class="control-buttons">
                <button id="graffiti-cancel">Cancel</button>
                <button id="graffiti-submit">Submit</button>
            </div>
        `;

        // Insert controls panel before the poster container
        videoContainer.insertBefore(this.controlsElement, posterContainer);

        // Create live element on poster
        this.liveElement = document.createElement('div');
        this.liveElement.className = 'graffiti-live';
        this.liveElement.textContent = 'Your text here';
        this.liveElement.style.left = '50%';
        this.liveElement.style.top = '50%';
        this.liveElement.style.fontSize = '4vw';  // Responsive size
        this.liveElement.style.color = '#ffffff';
        this.liveElement.style.fontFamily = this.getFontFamily('sans-serif');
        this.liveElement.style.transform = 'translate(-50%, -50%) rotate(0deg)';

        posterContainer.appendChild(this.liveElement);

        // Reset current edit state
        this.currentEdit = {
            text: '',
            x: 50,
            y: 50,
            fontSize: 4,  // in vw units (responsive)
            rotation: 0,
            color: '#ffffff',
            font: 'sans-serif'
        };

        // Build the custom font dropdown
        this.buildFontDropdown();

        // Setup event handlers
        this.setupControlHandlers();
        this.setupDraggable(this.liveElement, posterContainer);
    }

    /**
     * Build the custom font dropdown menu
     */
    buildFontDropdown() {
        const menu = document.getElementById('font-dropdown-menu');
        const trigger = document.getElementById('font-dropdown-trigger');
        if (!menu || !trigger) return;

        const fontOptions = this.getFontOptions();
        let currentCategory = null;

        fontOptions.forEach(option => {
            // Add separator if category changed
            if (option.category !== currentCategory) {
                if (currentCategory !== null) {
                    const separator = document.createElement('div');
                    separator.className = 'font-dropdown-separator';
                    separator.textContent = option.category === 'graffiti' ? '─ Google Fonts Graffiti ─' :
                                           option.category === 'custom' ? '─ Custom Fonts ─' : '─ Basic Fonts ─';
                    menu.appendChild(separator);
                }
                currentCategory = option.category;
            }

            const optionEl = document.createElement('div');
            optionEl.className = 'font-dropdown-option';
            optionEl.textContent = option.name;
            optionEl.style.fontFamily = option.family;
            optionEl.dataset.fontId = option.id;

            if (option.id === this.currentEdit.font) {
                optionEl.classList.add('selected');
                trigger.textContent = option.name;
                trigger.style.fontFamily = option.family;
            }

            optionEl.addEventListener('click', () => {
                // Update selection
                this.currentEdit.font = option.id;
                this.liveElement.style.fontFamily = this.getFontFamily(option.id);

                // Update trigger
                trigger.textContent = option.name;
                trigger.style.fontFamily = option.family;

                // Update selected class
                menu.querySelectorAll('.font-dropdown-option').forEach(el => {
                    el.classList.remove('selected');
                });
                optionEl.classList.add('selected');

                // Close dropdown
                menu.classList.remove('open');
            });

            menu.appendChild(optionEl);
        });

        // Toggle dropdown on trigger click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-font-dropdown')) {
                menu.classList.remove('open');
            }
        });
    }

    /**
     * Initialize Pickr color picker
     */
    initializePickr() {
        const colorPickerContainer = document.getElementById('graffiti-color-picker');
        if (!colorPickerContainer) return;

        // Define swatches
        const swatches = [
            '#FFFFFF', '#000000', '#FF0000', '#FF4500',
            '#FFA500', '#FFFF00', '#00FF00', '#00FFFF',
            '#0000FF', '#8A2BE2', '#FF1493', '#FF69B4',
            '#FFD700', '#C0C0C0', '#808080', '#8B4513'
        ];

        // Create the pickr instance
        this.pickr = Pickr.create({
            el: colorPickerContainer,
            theme: 'nano',
            useAsButton: true,
            default: this.currentEdit.color,
            closeOnScroll: true,
            position: 'bottom-start',
            swatches: swatches,
            components: {
                preview: true,
                opacity: false,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: false,
                    hsla: false,
                    hsva: false,
                    cmyk: false,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });

        // Handle color changes
        this.pickr.on('change', (color) => {
            this.currentEdit.color = color.toHEXA().toString();
            this.liveElement.style.color = this.currentEdit.color;
        });

        // Handle swatch select - sync immediately
        this.pickr.on('swatchselect', (color) => {
            this.currentEdit.color = color.toHEXA().toString();
            this.liveElement.style.color = this.currentEdit.color;
        });

        // Handle init (set initial color)
        this.pickr.on('init', (instance) => {
            this.liveElement.style.color = this.currentEdit.color;
        });
    }

    /**
     * Setup control panel event handlers
     */
    setupControlHandlers() {
        const textInput = document.getElementById('graffiti-text');
        const sizeSlider = document.getElementById('graffiti-size');
        const rotationSlider = document.getElementById('graffiti-rotation');
        const cancelBtn = document.getElementById('graffiti-cancel');
        const submitBtn = document.getElementById('graffiti-submit');

        // Text input handler
        textInput.addEventListener('input', () => {
            this.currentEdit.text = textInput.value;
            this.liveElement.textContent = textInput.value || 'Your text here';
        });

        // Size slider handler
        sizeSlider.addEventListener('input', () => {
            this.currentEdit.fontSize = parseFloat(sizeSlider.value);
            this.liveElement.style.fontSize = `${this.currentEdit.fontSize}vw`;
        });

        // Rotation slider handler
        rotationSlider.addEventListener('input', () => {
            this.currentEdit.rotation = parseInt(rotationSlider.value);
            this.liveElement.style.transform = `translate(-50%, -50%) rotate(${this.currentEdit.rotation}deg)`;
        });

        // Initialize Pickr color picker
        this.initializePickr();

        // Font dropdown is handled in buildFontDropdown()

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            this.stopEditing(false);
        });

        // Submit button
        submitBtn.addEventListener('click', async () => {
            const text = textInput.value.trim();
            if (!text) {
                alert('Please enter some text!');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            try {
                const graffitiData = {
                    text: text,
                    x: this.currentEdit.x,
                    y: this.currentEdit.y,
                    fontSize: this.currentEdit.fontSize,
                    rotation: this.currentEdit.rotation,
                    color: this.currentEdit.color,
                    font: this.currentEdit.font
                };

                const result = await this.apiService.submitGraffiti(graffitiData);

                if (result.success) {
                    this.graffiti = result.graffiti;
                    this.stopEditing(true);
                    this.renderButton();
                    this.renderOverlay();
                } else {
                    alert(result.error || 'Failed to submit graffiti');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit';
                }
            } catch (error) {
                console.error('Failed to submit graffiti:', error);
                alert('Failed to submit graffiti. Someone else may have submitted first!');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        });
    }

    /**
     * Stop editing mode
     */
    stopEditing(submitted) {
        this.isEditing = false;

        // Destroy Pickr instance
        if (this.pickr) {
            this.pickr.destroyAndRemove();
            this.pickr = null;
        }

        // Remove controls panel
        if (this.controlsElement) {
            this.controlsElement.remove();
            this.controlsElement = null;
        }

        // Remove live element
        if (this.liveElement) {
            this.liveElement.remove();
            this.liveElement = null;
        }

        // Show button again
        if (this.buttonElement) {
            this.buttonElement.style.display = '';
        }
    }

    /**
     * Setup draggable element within container
     */
    setupDraggable(element, container) {
        let isDragging = false;
        let startX, startY;
        let startPosX, startPosY;

        const getPointerPosition = (e) => {
            if (e.touches) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        };

        const onStart = (e) => {
            isDragging = true;
            const pos = getPointerPosition(e);
            startX = pos.x;
            startY = pos.y;
            startPosX = this.currentEdit.x;
            startPosY = this.currentEdit.y;
            element.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const onMove = (e) => {
            if (!isDragging) return;

            const pos = getPointerPosition(e);
            const containerRect = container.getBoundingClientRect();

            const deltaX = ((pos.x - startX) / containerRect.width) * 100;
            const deltaY = ((pos.y - startY) / containerRect.height) * 100;

            this.currentEdit.x = Math.max(0, Math.min(100, startPosX + deltaX));
            this.currentEdit.y = Math.max(0, Math.min(100, startPosY + deltaY));

            element.style.left = `${this.currentEdit.x}%`;
            element.style.top = `${this.currentEdit.y}%`;

            e.preventDefault();
        };

        const onEnd = () => {
            isDragging = false;
            element.style.cursor = 'move';
        };

        // Mouse events
        element.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);

        // Touch events
        element.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    /**
     * Destroy graffiti elements (called when showing Sunday screen, etc.)
     */
    destroy() {
        if (this.pickr) {
            this.pickr.destroyAndRemove();
            this.pickr = null;
        }
        if (this.buttonElement) {
            this.buttonElement.remove();
            this.buttonElement = null;
        }
        if (this.overlayElement) {
            this.overlayElement.remove();
            this.overlayElement = null;
        }
        if (this.controlsElement) {
            this.controlsElement.remove();
            this.controlsElement = null;
        }
        if (this.liveElement) {
            this.liveElement.remove();
            this.liveElement = null;
        }
        this.isEditing = false;
        this.initialized = false;
    }
}
