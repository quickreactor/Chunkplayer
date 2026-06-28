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
    startDrawing(containerId, onFinish, onCancel) {
        if (this.isDrawing) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        this.isDrawing = true;
        this.onFinish = onFinish;
        this.onCancel = onCancel;
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
                <button class="draw-tool-btn active" data-tool="brush" data-tooltip="Brush">&#9998;</button>
                <button class="draw-tool-btn" data-tool="eraser" data-tooltip="Eraser">&#9003;</button>
                <input type="color" class="draw-color-picker" value="${this.currentColor}" data-tooltip="Color">
                <input type="range" class="draw-size-slider" min="1" max="30" value="${this.currentSize}" data-tooltip="Size">
                <button class="draw-tool-btn" data-tool="undo" data-tooltip="Undo">&#8630;</button>
                <button class="draw-tool-btn" data-tool="cancel" data-tooltip="Cancel">&#10005;</button>
                <button class="draw-tool-btn draw-done-btn" data-tool="done" data-tooltip="Done">&#10003;</button>
            </div>
        `;

        const videoContainer = container.parentElement;
        videoContainer.insertBefore(this.toolbarElement, container);
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
                    case 'cancel':
                        this.cancelDrawing();
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
     * Toggle eraser mode - removes paths the cursor touches
     */
    setEraser(eraser) {
        this.isEraser = eraser;
        if (eraser) {
            this.canvas.isDrawingMode = false;
            this.canvas.selection = false;
            this.canvas.defaultCursor = 'crosshair';
            this.canvas.hoverCursor = 'crosshair';
            this._eraserHandler = (opt) => {
                this._eraseAtPointer(opt.e);
            };
            this._eraserMoveHandler = (opt) => {
                if (opt.e.buttons !== 1 && !opt.e.touches) return;
                this._eraseAtPointer(opt.e);
            };
            this.canvas.on('mouse:down', this._eraserHandler);
            this.canvas.on('mouse:move', this._eraserMoveHandler);
        } else {
            if (this._eraserHandler) {
                this.canvas.off('mouse:down', this._eraserHandler);
                this.canvas.off('mouse:move', this._eraserMoveHandler);
                this._eraserHandler = null;
                this._eraserMoveHandler = null;
            }
            this.canvas.isDrawingMode = true;
            this.canvas.freeDrawingBrush.color = this.currentColor;
        }
    }

    /**
     * Erase paths near the given pointer event
     */
    _eraseAtPointer(e) {
        const pointer = this.canvas.getPointer(e);
        const targets = this.canvas.getObjects().filter(obj => {
            if (obj.type !== 'path') return false;
            const bounds = obj.getBoundingRect();
            const padding = Math.max(this.currentSize, 10);
            return pointer.x >= bounds.left - padding &&
                   pointer.x <= bounds.left + bounds.width + padding &&
                   pointer.y >= bounds.top - padding &&
                   pointer.y <= bounds.top + bounds.height + padding;
        });
        if (targets.length) {
            targets.forEach(obj => this.canvas.remove(obj));
            this.canvas.renderAll();
            this.saveState();
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
        const width = this.canvas.width;
        const height = this.canvas.height;

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

        if (this.onFinish) {
            this.onFinish({
                data: canvasData,
                width: width,
                height: height
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

        if (this.onCancel) {
            this.onCancel();
            this.onCancel = null;
        }
        this.onFinish = null;
    }

    /**
     * Render a drawing entry as a canvas element overlay using Fabric StaticCanvas.
     * Renders at a high-resolution bitmap so CSS can scale it down/up without quality loss.
     * @param {Object} drawingEntry - { type: 'drawing', data: FabricJSON, width, height }
     * @param {number} targetWidth - Target bitmap width in pixels
     * @param {number} targetHeight - Target bitmap height in pixels
     * @returns {HTMLCanvasElement}
     */
    renderDrawingOverlay(drawingEntry, targetWidth, targetHeight) {
        const canvasEl = document.createElement('canvas');
        canvasEl.className = 'graffiti-drawing-overlay';
        canvasEl.width = targetWidth;
        canvasEl.height = targetHeight;
        canvasEl.style.aspectRatio = `${targetWidth} / ${targetHeight}`;

        // Create a temporary hidden canvas for Fabric to render onto
        const tmpId = 'draw-render-' + Date.now();
        const tmpEl = document.createElement('canvas');
        tmpEl.id = tmpId;
        tmpEl.style.display = 'none';
        document.body.appendChild(tmpEl);

        const staticCanvas = new fabric.StaticCanvas(tmpId, { width: targetWidth, height: targetHeight });
        staticCanvas.loadFromJSON(drawingEntry.data, () => {
            // After loading, canvas dimensions are restored to original drawing size.
            // Save originals, then resize to target and scale content to fit.
            const origW = staticCanvas.width;
            const origH = staticCanvas.height;

            staticCanvas.setDimensions({ width: targetWidth, height: targetHeight });

            const scaleX = targetWidth / origW;
            const scaleY = targetHeight / origH;
            const fitScale = Math.min(scaleX, scaleY);

            staticCanvas.setZoom(fitScale);
            staticCanvas.renderAll();

            // Copy scaled pixels to the display canvas
            const ctx = canvasEl.getContext('2d');
            ctx.drawImage(staticCanvas.lowerCanvasEl, 0, 0, targetWidth, targetHeight);
            staticCanvas.dispose();
            tmpEl.remove();
        });

        return canvasEl;
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
