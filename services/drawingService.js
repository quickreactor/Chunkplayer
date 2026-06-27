// ====================
// DRAWING SERVICE
// ====================

/**
 * Handles canvas drawing functionality using Fabric.js
 * Provides freehand drawing, eraser, color/size controls, and undo
 * Stores drawings as Fabric.js JSON for serialization
 */
class DrawingService {
    constructor(apiService, domService) {
        this.apiService = apiService;
        this.domService = domService;
        this.canvas = null;
        this.canvasContainer = null;
        this.toolbarElement = null;
        this.isDrawing = false;
        this.initialized = false;

        // Drawing state
        this.currentColor = '#ffffff';
        this.currentSize = 4;
        this.isEraser = false;

        // Undo stack
        this.undoStack = [];
        this.maxUndoSteps = 30;

        // Bound handlers for cleanup
        this._onPathCreated = null;
    }

    /**
     * Start drawing mode on a poster container
     * @param {string} containerId - The ID of the poster container
     * @param {Function} onFinish - Callback when drawing is done (receives serialized data)
     */
    startDrawing(containerId, onFinish) {
        if (this.isDrawing) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        this.isDrawing = true;
        this.onFinish = onFinish;
        this.undoStack = [];

        // Get the poster image to match canvas dimensions
        const posterImg = container.querySelector('img');
        if (!posterImg) return;

        // Wait for image to be ready
        const setupCanvas = () => {
            this.createCanvas(container, posterImg);
            this.createToolbar(container);
            this.saveState();
        };

        if (posterImg.complete && posterImg.naturalWidth > 0) {
            setupCanvas();
        } else {
            posterImg.addEventListener('load', setupCanvas, { once: true });
        }
    }

    /**
     * Create the Fabric.js canvas overlay on the poster
     */
    createCanvas(container, posterImg) {
        // Create a wrapper div for the canvas
        this.canvasContainer = document.createElement('div');
        this.canvasContainer.className = 'drawing-canvas-container';
        this.canvasContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 90;
            cursor: crosshair;
        `;

        const canvasEl = document.createElement('canvas');
        canvasEl.id = 'graffiti-draw-canvas';
        this.canvasContainer.appendChild(canvasEl);
        container.appendChild(this.canvasContainer);

        // Initialize Fabric canvas with poster dimensions
        this.canvas = new fabric.Canvas('graffiti-draw-canvas', {
            width: posterImg.offsetWidth,
            height: posterImg.offsetHeight,
            backgroundColor: 'transparent',
            isDrawingMode: true,
            selection: false
        });

        // Configure the drawing brush
        this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
        this.canvas.freeDrawingBrush.color = this.currentColor;
        this.canvas.freeDrawingBrush.width = this.currentSize;

        // Save state on path creation for undo
        this._onPathCreated = () => this.saveState();
        this.canvas.on('path:created', this._onPathCreated);

        this.canvas.renderAll();
    }

    /**
     * Create the drawing toolbar UI
     */
    createToolbar(container) {
        this.toolbarElement = document.createElement('div');
        this.toolbarElement.className = 'drawing-toolbar';
        this.toolbarElement.innerHTML = `
            <div class="drawing-toolbar-row">
                <button class="draw-tool-btn active" data-tool="brush" title="Brush">&#9998;</button>
                <button class="draw-tool-btn" data-tool="eraser" title="Eraser">&#9003;</button>
                <input type="color" class="draw-color-picker" value="${this.currentColor}" title="Color">
                <input type="range" class="draw-size-slider" min="1" max="30" value="${this.currentSize}" title="Brush Size">
                <button class="draw-tool-btn" data-tool="undo" title="Undo">&#8630;</button>
                <button class="draw-tool-btn" data-tool="clear" title="Clear All">&#10005;</button>
                <button class="draw-tool-btn draw-done-btn" data-tool="done" title="Done">&#10003;</button>
            </div>
        `;

        container.appendChild(this.toolbarElement);
        this.setupToolbarHandlers();
    }

    /**
     * Setup toolbar event handlers
     */
    setupToolbarHandlers() {
        const toolBtns = this.toolbarElement.querySelectorAll('.draw-tool-btn');
        const colorPicker = this.toolbarElement.querySelector('.draw-color-picker');
        const sizeSlider = this.toolbarElement.querySelector('.draw-size-slider');

        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;

                switch (tool) {
                    case 'brush':
                        this.setEraser(false);
                        toolBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        break;
                    case 'eraser':
                        this.setEraser(true);
                        toolBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        break;
                    case 'undo':
                        this.undo();
                        break;
                    case 'clear':
                        this.clearCanvas();
                        break;
                    case 'done':
                        this.finishDrawing();
                        break;
                }
            });
        });

        colorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            if (!this.isEraser) {
                this.canvas.freeDrawingBrush.color = this.currentColor;
            }
        });

        sizeSlider.addEventListener('input', (e) => {
            this.currentSize = parseInt(e.target.value);
            this.canvas.freeDrawingBrush.width = this.currentSize;
        });
    }

    /**
     * Toggle eraser mode (draw with background color or white)
     */
    setEraser(eraser) {
        this.isEraser = eraser;
        if (eraser) {
            this.canvas.freeDrawingBrush.color = '#ffffff';
        } else {
            this.canvas.freeDrawingBrush.color = this.currentColor;
        }
    }

    /**
     * Save current canvas state to undo stack
     */
    saveState() {
        if (!this.canvas) return;
        const json = JSON.stringify(this.canvas.toJSON());
        this.undoStack.push(json);
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
    }

    /**
     * Undo last drawing action
     */
    undo() {
        if (this.undoStack.length <= 1) return;
        this.undoStack.pop(); // Remove current state
        const prevState = this.undoStack[this.undoStack.length - 1];
        this.loadState(prevState);
    }

    /**
     * Load a canvas state from JSON
     */
    loadState(json) {
        if (!this.canvas) return;
        this.canvas.loadFromJSON(json, () => {
            this.canvas.renderAll();
        });
    }

    /**
     * Clear all drawings from canvas
     */
    clearCanvas() {
        if (!this.canvas) return;
        this.canvas.clear();
        this.canvas.backgroundColor = 'transparent';
        this.canvas.renderAll();
        this.saveState();
    }

    /**
     * Finish drawing and return serialized data
     */
    finishDrawing() {
        if (!this.canvas) return;

        const canvasData = this.canvas.toJSON();
        const dataURL = this.canvas.toDataURL({ format: 'png', multiplier: 2 });

        // Cleanup
        this.canvas.dispose();
        this.canvas = null;

        if (this.canvasContainer) {
            this.canvasContainer.remove();
            this.canvasContainer = null;
        }

        if (this.toolbarElement) {
            this.toolbarElement.remove();
            this.toolbarElement = null;
        }

        this.isDrawing = false;
        this.undoStack = [];

        // Return both serialized JSON (for re-editing) and image (for display)
        if (this.onFinish) {
            this.onFinish({
                data: canvasData,
                image: dataURL
            });
            this.onFinish = null;
        }
    }

    /**
     * Cancel drawing without saving
     */
    cancelDrawing() {
        if (!this.canvas) return;

        this.canvas.dispose();
        this.canvas = null;

        if (this.canvasContainer) {
            this.canvasContainer.remove();
            this.canvasContainer = null;
        }

        if (this.toolbarElement) {
            this.toolbarElement.remove();
            this.toolbarElement = null;
        }

        this.isDrawing = false;
        this.undoStack = [];
        this.onFinish = null;
    }

    /**
     * Render a drawing entry as an image element for display (pre-roll or static overlay)
     * @param {Object} drawingEntry - { type: 'drawing', data: FabricJSON, image: 'dataURL' }
     * @param {number} scale - Scale factor for pre-roll poster
     * @returns {HTMLImageElement}
     */
    renderDrawingAsImage(drawingEntry, scale = 1) {
        const img = document.createElement('img');
        img.className = 'graffiti-drawing-overlay';
        img.src = drawingEntry.image;
        img.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            z-index: 50;
        `;
        return img;
    }

    /**
     * Destroy the service and clean up
     */
    destroy() {
        if (this.canvas) {
            this.canvas.dispose();
            this.canvas = null;
        }
        if (this.canvasContainer) {
            this.canvasContainer.remove();
            this.canvasContainer = null;
        }
        if (this.toolbarElement) {
            this.toolbarElement.remove();
            this.toolbarElement = null;
        }
        this.isDrawing = false;
        this.undoStack = [];
        this.initialized = false;
    }
}
