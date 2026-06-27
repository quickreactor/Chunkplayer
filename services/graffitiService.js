// ====================
// GRAFFITI SERVICE
// ====================

/**
 * Handles graffiti functionality - display, creation, and submission
 * Live preview version - edits appear directly on the poster
 * Supports multiple graffiti layers per week (resets Sundays NZ time)
 */
class GraffitiService {
    constructor(apiService, domService, drawingService) {
        this.apiService = apiService;
        this.domService = domService;
        this.drawingService = drawingService;
        this.graffitiEntries = [];
        this.controlsElement = null;
        this.buttonElement = null;
        this.overlayElements = [];
        this.prerollOverlayElements = [];
        this.liveElement = null;
        this.pickr = null;
        this.initialized = false;
        this.isEditing = false;
        this.currentEdit = {
            text: '',
            x: 50,
            y: 50,
            fontSize: 4,
            rotation: 0,
            color: '#ffffff',
            font: 'sans-serif',
            shadowEnabled: true,
            shadowOffset: 2,
            shadowBlur: 4,
            shadowOpacity: 0.8
        };

        // Auto-hide pencil state
        this.pencilFadeTimer = null;
        this.pencilHideTimer = null;
        this.posterMouseHandler = null;
        this.posterTouchHandler = null;
    }

    /**
     * Fetch graffiti data if not already loaded
     */
    async fetchData() {
        if (this.graffitiEntries.length > 0) return;
        try {
            this.graffitiEntries = await this.apiService.getGraffiti();
            console.log('🎨 Graffiti loaded:', this.graffitiEntries);
        } catch (error) {
            console.error('Failed to fetch graffiti:', error);
            ErrorHandler.handle(error, 'GraffitiService.fetchData');
        }
    }

    /**
     * Render graffiti overlays on the pre-roll poster (poster-container-1)
     * Called early so graffiti appears before the user clicks ROLL
     */
    async renderPrerollOverlay() {
        await this.fetchData();

        this.clearPrerollOverlays();

        if (!this.graffitiEntries.length) return;

        const prerollContainer = document.getElementById('poster-container-1');
        const posterImage = document.getElementById('poster-image-1');
        if (!prerollContainer || !posterImage) return;

        await new Promise(resolve => {
            if (posterImage.complete) return resolve();
            posterImage.addEventListener('load', resolve, { once: true });
            posterImage.addEventListener('error', resolve, { once: true });
        });

        const imageWidth = posterImage.offsetWidth;
        const imageHeight = posterImage.offsetHeight;
        const todaysWidth = window.innerWidth * 0.7;
        const scale = imageWidth / todaysWidth;

        this.graffitiEntries.forEach(entry => {
            if (entry.type === 'drawing' && entry.image) {
                const img = this.drawingService.renderDrawingAsImage(entry, scale);
                prerollContainer.appendChild(img);
                this.prerollOverlayElements.push(img);
            } else if (entry.type !== 'drawing') {
                const el = this.createOverlayElement(entry, scale);
                const pxX = posterImage.offsetLeft + (entry.x / 100) * imageWidth;
                const pxY = posterImage.offsetTop + (entry.y / 100) * imageHeight;
                el.style.left = `${pxX}px`;
                el.style.top = `${pxY}px`;
                prerollContainer.appendChild(el);
                this.prerollOverlayElements.push(el);
            }
        });
    }

    /**
     * Initialize graffiti - fetch from API and render button/overlays
     */
    async init() {
        if (this.initialized) return;

        try {
            await this.fetchData();

            this.renderButton();
            if (this.graffitiEntries.length) {
                this.renderOverlay();
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize graffiti:', error);
            ErrorHandler.handle(error, 'GraffitiService.init');
        }
    }

    /**
     * Render the graffiti pencil button on the poster container
     * Always renders - auto-hides via mouse/touch events on poster
     */
    renderButton() {
        if (this.buttonElement) {
            this.buttonElement.remove();
            this.buttonElement = null;
        }

        const posterContainer = document.getElementById('todays-poster-container');
        if (!posterContainer) return;

        this.buttonElement = document.createElement('button');
        this.buttonElement.id = 'graffiti-btn';
        this.buttonElement.title = 'Add graffiti';
        this.buttonElement.innerHTML = '&#9998;';
        this.buttonElement.addEventListener('click', () => this.startEditing());

        posterContainer.appendChild(this.buttonElement);
        this.setupAutoHide();
    }

    /**
     * Setup auto-hide behavior on the poster container
     * Pencil fades in on mouseenter/touch, fades out after delay or on mouseleave
     */
    setupAutoHide() {
        const posterContainer = document.getElementById('todays-poster-container');
        if (!posterContainer || !this.buttonElement) return;

        this.clearAutoHideTimers();

        const showPencil = () => {
            if (this.isEditing) return;
            this.clearAutoHideTimers();
            this.buttonElement.classList.add('visible');
            this.pencilHideTimer = setTimeout(() => this.hidePencil(), 5000);
        };

        const hidePencil = () => {
            if (this.isEditing) return;
            this.clearAutoHideTimers();
            this.buttonElement.classList.remove('visible');
        };

        this.hidePencil = hidePencil;

        this.posterMouseHandler = () => showPencil();
        this.posterTouchHandler = (e) => {
            if (e.target === this.buttonElement) return;
            showPencil();
        };

        posterContainer.addEventListener('mouseenter', this.posterMouseHandler);
        posterContainer.addEventListener('mouseleave', () => {
            this.clearAutoHideTimers();
            this.pencilFadeTimer = setTimeout(() => hidePencil(), 1000);
        });
        posterContainer.addEventListener('touchstart', this.posterTouchHandler, { passive: true });
    }

    /**
     * Clear all auto-hide timers
     */
    clearAutoHideTimers() {
        if (this.pencilFadeTimer) {
            clearTimeout(this.pencilFadeTimer);
            this.pencilFadeTimer = null;
        }
        if (this.pencilHideTimer) {
            clearTimeout(this.pencilHideTimer);
            this.pencilHideTimer = null;
        }
    }

    /**
     * Remove auto-hide event listeners from poster container
     */
    removeAutoHide() {
        this.clearAutoHideTimers();
        const posterContainer = document.getElementById('todays-poster-container');
        if (posterContainer) {
            if (this.posterMouseHandler) {
                posterContainer.removeEventListener('mouseenter', this.posterMouseHandler);
            }
            if (this.posterTouchHandler) {
                posterContainer.removeEventListener('touchstart', this.posterTouchHandler);
            }
        }
        this.posterMouseHandler = null;
        this.posterTouchHandler = null;
        if (this.buttonElement) {
            this.buttonElement.classList.remove('visible');
        }
    }

    /**
     * Render graffiti overlays on today's poster
     */
    renderOverlay() {
        this.clearOverlays();

        if (!this.graffitiEntries.length) return;

        const posterContainer = document.getElementById('todays-poster-container');
        if (!posterContainer) return;

        this.graffitiEntries.forEach(entry => {
            if (entry.type === 'drawing' && entry.image) {
                const img = this.drawingService.renderDrawingAsImage(entry);
                posterContainer.appendChild(img);
                this.overlayElements.push(img);
            } else if (entry.type !== 'drawing') {
                const el = this.createOverlayElement(entry);
                posterContainer.appendChild(el);
                this.overlayElements.push(el);
            }
        });
    }

    /**
     * Create a graffiti overlay DOM element for a single entry
     * @param {Object} entry - Single graffiti object
     * @param {number} scale - Scale factor (for pre-roll poster)
     */
    createOverlayElement(entry, scale = 1) {
        const el = document.createElement('div');
        el.className = 'graffiti-overlay';
        el.textContent = entry.text;
        el.style.left = `${entry.x}%`;
        el.style.top = `${entry.y}%`;
        const isOldFormat = entry.fontSize > 30;
        el.style.fontSize = isOldFormat
            ? `${entry.fontSize * scale}px`
            : `${entry.fontSize * scale}vw`;
        el.style.transform = `translate(-50%, -50%) rotate(${entry.rotation}deg)`;

        if (entry.color) {
            el.style.color = entry.color;
        }
        if (entry.font) {
            el.style.fontFamily = this.getFontFamily(entry.font);
        }

        if (entry.shadowEnabled) {
            const offset = entry.shadowOffset || 2;
            const blur = entry.shadowBlur || 4;
            const opacity = entry.shadowOpacity || 0.8;
            const rgba = `rgba(0, 0, 0, ${opacity})`;
            el.style.textShadow = `${offset}px ${offset}px ${blur}px ${rgba}`;
        } else {
            el.style.textShadow = 'none';
        }

        return el;
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
            'graffiti-marker': "'Permanent Marker', cursive",
            'graffiti-messy': "'Rock Salt', cursive",
            'graffiti-bubble': "'Knewave', display",
            'graffiti-outline': "'Monoton', cursive",
            'graffiti-spray': "'Rubik Marker Hatch', cursive",
            'graffiti-comic': "'Bangers', cursive",
            'graffiti-fast': "'Faster One', cursive",
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
            'graffiti-marker': 'Marker',
            'graffiti-messy': 'Messy',
            'graffiti-bubble': 'Bubble',
            'graffiti-outline': 'Outline',
            'graffiti-spray': 'Spray',
            'graffiti-comic': 'Comic',
            'graffiti-fast': 'Fast',
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
            { id: 'sans-serif', name: 'Sans', family: "'Segoe UI', sans-serif", category: 'basic' },
            { id: 'serif', name: 'Serif', family: 'Georgia, serif', category: 'basic' },
            { id: 'monospace', name: 'Mono', family: "'Courier New', monospace", category: 'basic' },
            { id: 'cursive', name: 'Hand', family: "'Comic Sans MS', cursive", category: 'basic' },
            { id: 'fantasy', name: 'Bold', family: "'Anton', Impact, sans-serif", category: 'basic' },
            { id: 'system-ui', name: 'Modern', family: 'system-ui', category: 'basic' },
            { id: 'rounded', name: 'Round', family: 'sans-serif', category: 'basic' },
            { id: 'typewriter', name: 'Type', family: "'Courier New', monospace", category: 'basic' },
            { id: 'graffiti-marker', name: 'Marker', family: "'Permanent Marker', cursive", category: 'graffiti' },
            { id: 'graffiti-messy', name: 'Messy', family: "'Rock Salt', cursive", category: 'graffiti' },
            { id: 'graffiti-bubble', name: 'Bubble', family: "'Knewave', display", category: 'graffiti' },
            { id: 'graffiti-outline', name: 'Outline', family: "'Monoton', cursive", category: 'graffiti' },
            { id: 'graffiti-spray', name: 'Spray', family: "'Rubik Marker Hatch', cursive", category: 'graffiti' },
            { id: 'graffiti-comic', name: 'Comic', family: "'Bangers', cursive", category: 'graffiti' },
            { id: 'graffiti-fast', name: 'Fast', family: "'Faster One', cursive", category: 'graffiti' },
            { id: 'graffiti-street2', name: 'Street2', family: "'Street2Art', sans-serif", category: 'custom' },
            { id: 'graffiti-fromstreet', name: 'FromStreet', family: "'FromStreetArt', sans-serif", category: 'custom' },
            { id: 'graffiti-popstar', name: 'Popstar', family: "'SuperPopstar', cursive", category: 'custom' },
            { id: 'graffiti-edo', name: 'Edo', family: "'Edo', sans-serif", category: 'custom' },
            { id: 'graffiti-hvd', name: 'HVD Peace', family: "'HVD Peace', cursive", category: 'custom' }
        ];
    }

    /**
     * Show info about all graffiti entries
     */
    showGraffitiInfo() {
        if (!this.graffitiEntries.length) return;

        const lines = this.graffitiEntries.map((entry, i) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            if (entry.type === 'drawing') {
                return `${i + 1}. Drawing (${time})`;
            }
            return `${i + 1}. "${entry.text}" (${time})`;
        });
        alert(`This week's graffiti (${this.graffitiEntries.length}):\n\n${lines.join('\n')}`);
    }

    /**
     * Start editing mode - show mode selector (Text or Draw)
     */
    startEditing() {
        if (this.isEditing) return;
        this.isEditing = true;

        // Hide pencil while editing
        this.clearAutoHideTimers();
        if (this.buttonElement) {
            this.buttonElement.classList.remove('visible');
        }

        const posterContainer = document.getElementById('todays-poster-container');
        const videoContainer = document.querySelector('.videoContainer');
        if (!posterContainer || !videoContainer) return;

        // Create mode selector
        this.controlsElement = document.createElement('div');
        this.controlsElement.className = 'graffiti-controls-panel graffiti-mode-selector';
        this.controlsElement.innerHTML = `
            <div class="graffiti-mode-title">Add Graffiti</div>
            <div class="graffiti-mode-buttons">
                <button class="graffiti-mode-btn" data-mode="text">
                    <span class="mode-icon">T</span>
                    <span class="mode-label">Text</span>
                </button>
                <button class="graffiti-mode-btn" data-mode="draw">
                    <span class="mode-icon">&#9998;</span>
                    <span class="mode-label">Draw</span>
                </button>
            </div>
            <button id="graffiti-cancel-mode" class="graffiti-cancel-btn">Cancel</button>
        `;

        videoContainer.insertBefore(this.controlsElement, posterContainer);

        // Mode button handlers
        this.controlsElement.querySelectorAll('.graffiti-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.removeControlsElement();
                if (mode === 'text') {
                    this.startTextEditing();
                } else if (mode === 'draw') {
                    this.startDrawMode();
                }
            });
        });

        this.controlsElement.querySelector('#graffiti-cancel-mode').addEventListener('click', () => {
            this.stopEditing(false);
        });
    }

    /**
     * Remove the controls element if it exists
     */
    removeControlsElement() {
        if (this.controlsElement) {
            this.controlsElement.remove();
            this.controlsElement = null;
        }
    }

    /**
     * Start draw mode using DrawingService
     */
    startDrawMode() {
        this.drawingService.startDrawing('todays-poster-container', async (result) => {
            // Drawing finished - submit to API
            const drawingData = {
                type: 'drawing',
                data: result.data,
                image: result.image
            };

            try {
                const apiResult = await this.apiService.submitGraffiti(drawingData);
                if (apiResult.success) {
                    this.graffitiEntries = apiResult.all || [...this.graffitiEntries, apiResult.graffiti];
                    this.renderOverlay();
                } else {
                    alert(apiResult.error || 'Failed to save drawing');
                }
            } catch (error) {
                console.error('Failed to submit drawing:', error);
                alert('Failed to save drawing.');
            }

            this.isEditing = false;
            if (this.buttonElement) {
                this.setupAutoHide();
            }
        }, () => {
            // Cancelled - just reset editing state
            this.isEditing = false;
            if (this.buttonElement) {
                this.setupAutoHide();
            }
        });
    }

    /**
     * Start text editing mode (existing functionality)
     */
    startTextEditing() {
        const posterContainer = document.getElementById('todays-poster-container');
        const videoContainer = document.querySelector('.videoContainer');
        if (!posterContainer || !videoContainer) { this.isEditing = false; return; }

        this.controlsElement = document.createElement('div');
        this.controlsElement.className = 'graffiti-controls-panel';
        this.controlsElement.innerHTML = `
            <textarea id="graffiti-text" placeholder="Type here... (emojis work too!)" maxlength="100"></textarea>
            <div class="graffiti-hint">👆 Drag text on the poster to move it</div>
            <div class="control-row">
                <label>Size</label>
                <input type="range" id="graffiti-size" min="0.5" max="30" value="4" step="0.25">
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
            <div class="control-row">
                <label>Shadow</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="graffiti-shadow-toggle" checked>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="control-row">
                <label>Offset</label>
                <input type="range" id="graffiti-shadow-offset" min="1" max="15" value="2" step="1">
            </div>
            <div class="control-row">
                <label>Blur</label>
                <input type="range" id="graffiti-shadow-blur" min="0" max="20" value="4" step="1">
            </div>
            <div class="control-row">
                <label>Opacity</label>
                <input type="range" id="graffiti-shadow-opacity" min="0" max="100" value="80" step="5">
            </div>
            <div class="control-buttons">
                <button id="graffiti-cancel">Cancel</button>
                <button id="graffiti-submit">Submit</button>
            </div>
        `;

        videoContainer.insertBefore(this.controlsElement, posterContainer);

        this.liveElement = document.createElement('div');
        this.liveElement.className = 'graffiti-live';
        this.liveElement.textContent = 'Your text here';
        this.liveElement.style.left = '50%';
        this.liveElement.style.top = '50%';
        this.liveElement.style.width = 'max-content';
        this.liveElement.style.maxWidth = '90%';
        this.liveElement.style.fontSize = '4vw';
        this.liveElement.style.color = '#ffffff';
        this.liveElement.style.fontFamily = this.getFontFamily('sans-serif');
        this.liveElement.style.transform = 'translate(-50%, -50%) rotate(0deg)';

        posterContainer.appendChild(this.liveElement);

        this.currentEdit = {
            text: '',
            x: 50,
            y: 50,
            fontSize: 4,
            rotation: 0,
            color: '#ffffff',
            font: 'sans-serif',
            shadowEnabled: true,
            shadowOffset: 2,
            shadowBlur: 4,
            shadowOpacity: 0.8
        };

        this.applyShadow();
        this.buildFontDropdown();
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
                this.currentEdit.font = option.id;
                this.liveElement.style.fontFamily = this.getFontFamily(option.id);
                trigger.textContent = option.name;
                trigger.style.fontFamily = option.family;
                menu.querySelectorAll('.font-dropdown-option').forEach(el => {
                    el.classList.remove('selected');
                });
                optionEl.classList.add('selected');
                menu.classList.remove('open');
            });

            menu.appendChild(optionEl);
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });

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

        const swatches = [
            '#FFFFFF', '#000000', '#FF0000', '#FF4500',
            '#FFA500', '#FFFF00', '#00FF00', '#00FFFF',
            '#0000FF', '#8A2BE2', '#FF1493', '#FF69B4',
            '#FFD700', '#C0C0C0', '#808080', '#8B4513'
        ];

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

        this.pickr.on('change', (color) => {
            this.currentEdit.color = color.toHEXA().toString();
            this.liveElement.style.color = this.currentEdit.color;
        });

        this.pickr.on('swatchselect', (color) => {
            this.currentEdit.color = color.toHEXA().toString();
            this.liveElement.style.color = this.currentEdit.color;
        });

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
        const shadowToggle = document.getElementById('graffiti-shadow-toggle');
        const shadowOffsetSlider = document.getElementById('graffiti-shadow-offset');
        const cancelBtn = document.getElementById('graffiti-cancel');
        const submitBtn = document.getElementById('graffiti-submit');

        textInput.addEventListener('input', () => {
            this.currentEdit.text = textInput.value;
            this.liveElement.textContent = textInput.value || 'Your text here';
        });

        sizeSlider.addEventListener('input', () => {
            this.currentEdit.fontSize = parseFloat(sizeSlider.value);
            this.liveElement.style.fontSize = `${this.currentEdit.fontSize}vw`;
        });

        rotationSlider.addEventListener('input', () => {
            this.currentEdit.rotation = parseInt(rotationSlider.value);
            this.liveElement.style.transform = `translate(-50%, -50%) rotate(${this.currentEdit.rotation}deg)`;
        });

        if (shadowToggle) {
            shadowToggle.addEventListener('change', () => {
                this.currentEdit.shadowEnabled = shadowToggle.checked;
                this.applyShadow();
            });
        }

        if (shadowOffsetSlider) {
            shadowOffsetSlider.addEventListener('input', () => {
                this.currentEdit.shadowOffset = parseInt(shadowOffsetSlider.value);
                this.applyShadow();
            });
        }

        const shadowBlurSlider = document.getElementById('graffiti-shadow-blur');
        if (shadowBlurSlider) {
            shadowBlurSlider.addEventListener('input', () => {
                this.currentEdit.shadowBlur = parseInt(shadowBlurSlider.value);
                this.applyShadow();
            });
        }

        const shadowOpacitySlider = document.getElementById('graffiti-shadow-opacity');
        if (shadowOpacitySlider) {
            shadowOpacitySlider.addEventListener('input', () => {
                this.currentEdit.shadowOpacity = parseInt(shadowOpacitySlider.value) / 100;
                this.applyShadow();
            });
        }

        this.initializePickr();

        cancelBtn.addEventListener('click', () => {
            this.stopEditing(false);
        });

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
                    font: this.currentEdit.font,
                    shadowEnabled: this.currentEdit.shadowEnabled,
                    shadowOffset: this.currentEdit.shadowOffset,
                    shadowBlur: this.currentEdit.shadowBlur,
                    shadowOpacity: this.currentEdit.shadowOpacity
                };

                const result = await this.apiService.submitGraffiti(graffitiData);

                if (result.success) {
                    this.graffitiEntries = result.all || [...this.graffitiEntries, result.graffiti];
                    this.stopEditing(true);
                    this.renderOverlay();
                } else {
                    alert(result.error || 'Failed to submit graffiti');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit';
                }
            } catch (error) {
                console.error('Failed to submit graffiti:', error);
                alert('Failed to submit graffiti.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        });
    }

    /**
     * Apply text-shadow to live preview element
     */
    applyShadow() {
        if (!this.liveElement) return;

        if (this.currentEdit.shadowEnabled) {
            const offset = this.currentEdit.shadowOffset;
            const blur = this.currentEdit.shadowBlur;
            const opacity = this.currentEdit.shadowOpacity;
            const rgba = `rgba(0, 0, 0, ${opacity})`;
            this.liveElement.style.textShadow = `${offset}px ${offset}px ${blur}px ${rgba}`;
        } else {
            this.liveElement.style.textShadow = 'none';
        }
    }

    /**
     * Stop editing mode
     */
    stopEditing(submitted) {
        this.isEditing = false;

        if (this.pickr) {
            this.pickr.destroyAndRemove();
            this.pickr = null;
        }

        if (this.controlsElement) {
            this.controlsElement.remove();
            this.controlsElement = null;
        }

        if (this.liveElement) {
            this.liveElement.remove();
            this.liveElement = null;
        }

        // Re-enable auto-hide pencil
        if (this.buttonElement) {
            this.setupAutoHide();
        }
    }

    /**
     * Clear all overlay elements from today's poster
     */
    clearOverlays() {
        this.overlayElements.forEach(el => el.remove());
        this.overlayElements = [];
    }

    /**
     * Clear all pre-roll overlay elements
     */
    clearPrerollOverlays() {
        this.prerollOverlayElements.forEach(el => el.remove());
        this.prerollOverlayElements = [];
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

        element.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);

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
        if (this.drawingService && this.drawingService.isDrawing) {
            this.drawingService.cancelDrawing();
        }
        this.removeAutoHide();
        if (this.buttonElement) {
            this.buttonElement.remove();
            this.buttonElement = null;
        }
        this.clearOverlays();
        this.clearPrerollOverlays();
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
