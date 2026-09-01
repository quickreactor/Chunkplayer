(function initMediabunnyCapturePlugin(document) {
    if (!document || !globalThis.ScreenshotService) return;

    const ICONS = {
        capture: `<svg aria-hidden="true" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3"/></svg>`,
        share: `<svg aria-hidden="true" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>`,
        download: `<svg aria-hidden="true" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg>`
    };

    class PlyrScreenshotCapture {
        constructor(player) {
            this.player = player;
            this.media = player.media;
            this.container = player.elements.container;
            this.completedCapture = null;
            this.downloadUrl = null;
            this.captureGeneration = 0;
            this.isCapturing = false;
            this.deliveryAnimationTimer = null;
            this.boundSourceChange = () => this.clearCompletedCapture();

            this.media.addEventListener('loadstart', this.boundSourceChange);
            this.media.addEventListener('emptied', this.boundSourceChange);
            this.mountControls();
        }

        mountControls() {
            const controls = this.container.querySelector('.plyr__controls');
            if (!controls || controls.querySelector('[data-plyr="capture"]')) return;

            const capture = this.createControl('capture', 'Capture screenshot', ICONS.capture);
            const share = this.createControl('share-capture', 'Share screenshot', ICONS.share);
            const download = this.createControl('download-capture', 'Download screenshot', ICONS.download);
            capture.classList.add('screenshot-capture-control');
            share.classList.add('screenshot-delivery-control');
            download.classList.add('screenshot-delivery-control');
            share.hidden = true;
            download.hidden = true;
            share.disabled = true;
            download.disabled = true;

            const anchor = controls.querySelector('[data-plyr="fullscreen"]');
            controls.insertBefore(capture, anchor || null);
            controls.insertBefore(share, anchor || null);
            controls.insertBefore(download, anchor || null);

            capture.addEventListener('click', () => this.capture());
            share.addEventListener('click', () => this.share());
            download.addEventListener('click', () => this.download());
            this.elements = { capture, share, download };
        }

        createControl(action, label, icon) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'plyr__controls__item plyr__control';
            button.dataset.plyr = action;
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
            button.innerHTML = `${icon}<span class="plyr__tooltip">${label}</span>`;
            return button;
        }

        async capture() {
            if (this.isCapturing) return;
            const sourceUrl = this.media.currentSrc || this.media.src || '';
            if (!sourceUrl) {
                this.showToast('There is no video frame to capture.', 'error');
                return;
            }

            const generation = ++this.captureGeneration;
            const timestamp = this.media.currentTime;
            const capturePromise = this.captureWithFallback(sourceUrl, timestamp);
            // Clipboard write must begin in the original tap. ClipboardItem may
            // resolve its PNG asynchronously while MediaBunny decodes the frame.
            const clipboardPromise = this.copyToClipboard(capturePromise.then(result => result.blob));

            this.isCapturing = true;
            this.elements.capture.disabled = true;
            this.elements.capture.setAttribute('aria-busy', 'true');
            this.setControlLabel(this.elements.capture, 'Capturing exact frame');
            this.clearCompletedCapture({ preserveGeneration: true });

            try {
                const [result, clipboard] = await Promise.all([capturePromise, clipboardPromise]);
                if (generation !== this.captureGeneration) return;

                const filename = this.getFilename(result.timestamp);
                const file = typeof File === 'function'
                    ? new File([result.blob], filename, { type: 'image/png', lastModified: Date.now() })
                    : null;
                this.downloadUrl = URL.createObjectURL(result.blob);
                this.completedCapture = { ...result, filename, file };
                this.updateDeliveryActions({ animate: true });

                if (clipboard.succeeded) {
                    this.showToast('Screenshot copied — Share or Download.');
                } else if (clipboard.attempted) {
                    this.showToast('Screenshot ready — clipboard was blocked. Share or Download.', 'info');
                } else {
                    this.showToast('Screenshot ready — Share or Download.', 'info');
                }
            } catch (error) {
                if (generation !== this.captureGeneration) return;
                this.showToast(error?.message || 'The screenshot could not be captured.', 'error', true);
            } finally {
                if (generation === this.captureGeneration) {
                    this.isCapturing = false;
                    this.elements.capture.disabled = false;
                    this.elements.capture.removeAttribute('aria-busy');
                    this.setControlLabel(this.elements.capture, 'Capture screenshot');
                }
            }
        }

        async captureWithFallback(sourceUrl, timestamp) {
            try {
                return await ScreenshotService.captureFrame(sourceUrl, timestamp);
            } catch (error) {
                console.info('[Capture] MediaBunny capture unavailable; using displayed frame.', error);
                try {
                    const webglFallback = await ScreenshotService.captureDisplayedFrameWebGL(
                        this.media,
                        sourceUrl,
                        timestamp,
                        document
                    );
                    return webglFallback;
                } catch (webglError) {
                    console.info('[Capture] WebGL capture unavailable; using 2D displayed frame.', webglError);
                    try {
                        const fallback = await ScreenshotService.captureDisplayedFrame(this.media, document);
                        return fallback;
                    } catch (fallbackError) {
                        throw fallbackError;
                    }
                }
            }
        }

        copyToClipboard(blobPromise) {
            if (!navigator.clipboard?.write || typeof ClipboardItem !== 'function') {
                return Promise.resolve({ attempted: false, succeeded: false });
            }
            try {
                const item = new ClipboardItem({ 'image/png': blobPromise });
                return navigator.clipboard.write([item]).then(
                    () => ({ attempted: true, succeeded: true }),
                    error => {
                        console.info('[Capture] Clipboard write unavailable:', error);
                        return { attempted: true, succeeded: false };
                    }
                );
            } catch (error) {
                console.info('[Capture] Clipboard item unavailable:', error);
                return Promise.resolve({ attempted: true, succeeded: false });
            }
        }

        async share() {
            const completed = this.completedCapture;
            if (!completed?.file || !this.canShare(completed.file)) {
                this.showToast('Native image sharing is unavailable. Use Download instead.', 'info');
                return;
            }
            try {
                await navigator.share({ files: [completed.file] });
                this.showToast('Screenshot shared.');
            } catch (error) {
                if (error?.name === 'AbortError') {
                    this.showToast('Share cancelled — the screenshot is still ready.', 'info');
                } else {
                    this.showToast(error?.message || 'The share sheet could not be opened.', 'error');
                }
            }
        }

        download() {
            if (!this.completedCapture || !this.downloadUrl) return;
            const link = document.createElement('a');
            link.href = this.downloadUrl;
            link.download = this.completedCapture.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            this.showToast(`Download started — ${this.completedCapture.filename}`);
        }

        canShare(file) {
            if (!file || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
            try {
                return navigator.canShare({ files: [file] }) === true;
            } catch (error) {
                return false;
            }
        }

        updateDeliveryActions({ animate = false } = {}) {
            if (!this.elements) return;
            const ready = Boolean(this.completedCapture);
            const shareSupported = ready && this.canShare(this.completedCapture.file);
            this.elements.share.hidden = !ready;
            this.elements.download.hidden = !ready;
            this.elements.share.disabled = !shareSupported;
            this.elements.download.disabled = !ready;

            const shareLabel = shareSupported ? 'Share screenshot' : 'Share unavailable';
            this.setControlLabel(this.elements.share, shareLabel);

            clearTimeout(this.deliveryAnimationTimer);
            this.elements.share.classList.remove('screenshot-delivery-control--awaken');
            this.elements.download.classList.remove('screenshot-delivery-control--awaken');
            if (animate && ready) {
                if (shareSupported) this.elements.share.classList.add('screenshot-delivery-control--awaken');
                this.elements.download.classList.add('screenshot-delivery-control--awaken');
                this.deliveryAnimationTimer = setTimeout(() => {
                    this.elements?.share.classList.remove('screenshot-delivery-control--awaken');
                    this.elements?.download.classList.remove('screenshot-delivery-control--awaken');
                }, 900);
            }
        }

        setControlLabel(button, label) {
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
            const tooltip = button.querySelector('.plyr__tooltip');
            if (tooltip) tooltip.textContent = label;
        }

        clearCompletedCapture({ preserveGeneration = false } = {}) {
            if (!preserveGeneration) {
                this.captureGeneration++;
                this.isCapturing = false;
                if (this.elements?.capture) {
                    this.elements.capture.disabled = false;
                    this.elements.capture.removeAttribute('aria-busy');
                    this.setControlLabel(this.elements.capture, 'Capture screenshot');
                }
            }
            clearTimeout(this.deliveryAnimationTimer);
            this.deliveryAnimationTimer = null;
            if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
            this.downloadUrl = null;
            this.completedCapture = null;
            this.updateDeliveryActions();
        }

        getFilename(timestamp) {
            const movie = CONFIG.movieData && (
                CONFIG.movieData.morbed
                    ? CONFIG.movieData.punishmentMovie
                    : CONFIG.movieData.normalMovie
            );
            const safeTitle = String(movie?.name || 'chunkplayer-capture')
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 70) || 'chunkplayer-capture';
            const timecode = Math.max(0, timestamp || 0).toFixed(3).replace('.', 's');
            return `${safeTitle}-${timecode}.png`;
        }

        showToast(message, type = 'success', persistent = false) {
            document.dispatchEvent(new CustomEvent('chunkplayer:toast', {
                detail: { message, type, persistent }
            }));
        }
    }

    document.addEventListener('ready', event => {
        const player = event.detail?.plyr;
        if (!player || !Array.isArray(player.config?.controls) || !player.config.controls.includes('capture')) return;
        if (player.screenshotCapture) player.screenshotCapture.clearCompletedCapture();
        player.screenshotCapture = new PlyrScreenshotCapture(player);
    });
}(document));
