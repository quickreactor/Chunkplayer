(function initArchivedClipExportPlugin(document) {
    const MIN_CLIP_SECONDS = 0.5;
    const MAX_CLIP_SECONDS = 8;
    const DEFAULT_CLIP_SECONDS = 3;

    class PlyrClipBench {
        constructor(player) {
            this.player = player;
            this.media = player.media;
            this.exportService = new ClipExportService();
            this.sourceUrl = '';
            this.sourceTitle = '';
            this.sourceFps = 24;
            this.exportFps = 24;
            this.frameTimingApproximate = false;
            this.frameDuration = 1 / 24;
            this.currentFrameTime = 0;
            this.inTime = 0;
            this.outTime = 0;
            this.duration = 0;
            this.isOpen = false;
            this.isPreviewing = false;
            this.isExporting = false;
            this.isResult = false;
            this.wasPlaying = false;
            this.originalTime = 0;
            this.frameCallbackId = null;
            this.fallbackFrameHandler = null;
            this.seekSequence = 0;
            this.exportController = null;
            this.resultUrl = null;
            this.result = null;

            this.mountControl();
            this.mountEditor();
            this.bindEvents();
            this.updateControlAvailability();
        }

        mountControl() {
            const controls = this.player.elements?.controls || this.media.closest('.plyr')?.querySelector('.plyr__controls');
            if (!controls || controls.querySelector('[data-plyr="clip-export"]')) return;

            const anchor = controls.querySelector('[data-plyr="capture"]') || controls.querySelector('[data-plyr="fullscreen"]');
            const buttonMarkup = `
                <button class="plyr__controls__item plyr__control" type="button" data-plyr="clip-export"
                    aria-label="Open clip exporter" title="Make a loop clip">
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                        <path d="M4 4.25h16v15.5H4zM7 4.25v15.5M17 4.25v15.5M4 8h3M17 8h3M4 12h3M17 12h3M4 16h3M17 16h3M9.2 8.25l5.6 3.75-5.6 3.75z"/>
                    </svg>
                    <span class="plyr__sr-only">Make a loop clip</span>
                </button>`;

            if (anchor) anchor.insertAdjacentHTML('beforebegin', buttonMarkup);
            else controls.insertAdjacentHTML('beforeend', buttonMarkup);
            this.controlButton = controls.querySelector('[data-plyr="clip-export"]');
        }

        mountEditor() {
            const container = this.player.elements?.container || this.media.closest('.plyr');
            if (!container) return;

            container.insertAdjacentHTML('beforeend', `
                <div class="clip-editor" hidden aria-label="Clip exporter">
                    <video class="clip-editor__preview" crossorigin="anonymous" muted playsinline preload="auto"></video>
                    <div class="clip-editor__scrim"></div>

                    <section class="clip-bench" aria-labelledby="clip-bench-title">
                        <header class="clip-bench__header">
                            <div>
                                <span class="clip-bench__eyebrow">FRAME CUT</span>
                                <h2 id="clip-bench-title">Clip bench</h2>
                            </div>
                            <div class="clip-bench__header-actions">
                                <span class="clip-rate-badge">Reading frames…</span>
                                <button class="clip-icon-button clip-close" type="button" aria-label="Close clip exporter">×</button>
                            </div>
                        </header>

                        <div class="clip-editing-view">
                            <div class="clip-playhead-row">
                                <button class="clip-frame-button clip-frame-back" type="button" aria-label="Previous frame" title="Previous frame (Left arrow)">
                                    <span aria-hidden="true">|◀</span>
                                </button>
                                <button class="clip-preview-button" type="button">Preview loop</button>
                                <button class="clip-frame-button clip-frame-forward" type="button" aria-label="Next frame" title="Next frame (Right arrow)">
                                    <span aria-hidden="true">▶|</span>
                                </button>
                                <output class="clip-current-time" aria-label="Current frame time">0:00.000</output>
                            </div>

                            <div class="clip-film-rail">
                                <div class="clip-film-rail__perforations" aria-hidden="true"></div>
                                <div class="clip-range" style="--clip-in: 0%; --clip-out: 100%;">
                                    <div class="clip-range__base"></div>
                                    <div class="clip-range__selection"></div>
                                    <input class="clip-range-input clip-range-input--in" type="range" min="0" max="1" step="0.001" value="0" aria-label="Clip start">
                                    <input class="clip-range-input clip-range-input--out" type="range" min="0" max="1" step="0.001" value="1" aria-label="Clip end">
                                </div>
                                <div class="clip-film-rail__perforations" aria-hidden="true"></div>
                            </div>

                            <div class="clip-marks">
                                <button class="clip-mark clip-mark--in" type="button">
                                    <span>Set IN</span>
                                    <output class="clip-in-time">0:00.000</output>
                                </button>
                                <div class="clip-duration-block">
                                    <span>Loop length</span>
                                    <strong class="clip-duration">3.000s</strong>
                                </div>
                                <button class="clip-mark clip-mark--out" type="button">
                                    <span>Set OUT</span>
                                    <output class="clip-out-time">0:03.000</output>
                                </button>
                            </div>

                            <div class="clip-status" role="status" aria-live="polite"></div>
                            <div class="clip-export-progress" hidden aria-hidden="true">
                                <div class="clip-export-progress__reel"></div>
                                <div class="clip-export-progress__track"><span></span></div>
                            </div>

                            <div class="clip-primary-actions">
                                <button class="clip-export-button" type="button">Make loop video</button>
                                <span class="clip-output-note">Silent · up to 480p · max 8s</span>
                            </div>
                        </div>

                        <div class="clip-result-view" hidden>
                            <div class="clip-result-copy">
                                <span class="clip-result-kicker">CUT COMPLETE</span>
                                <strong class="clip-result-title">Your loop is ready</strong>
                                <span class="clip-result-details"></span>
                            </div>
                            <div class="clip-result-actions">
                                <button class="clip-download-button" type="button">Download</button>
                                <button class="clip-make-another" type="button">Make another</button>
                            </div>
                        </div>
                    </section>
                </div>`);

            this.container = container;
            this.editor = container.querySelector('.clip-editor');
            this.preview = this.editor.querySelector('.clip-editor__preview');
            this.closeButton = this.editor.querySelector('.clip-close');
            this.rateBadge = this.editor.querySelector('.clip-rate-badge');
            this.frameBackButton = this.editor.querySelector('.clip-frame-back');
            this.frameForwardButton = this.editor.querySelector('.clip-frame-forward');
            this.previewButton = this.editor.querySelector('.clip-preview-button');
            this.currentTimeOutput = this.editor.querySelector('.clip-current-time');
            this.range = this.editor.querySelector('.clip-range');
            this.inRange = this.editor.querySelector('.clip-range-input--in');
            this.outRange = this.editor.querySelector('.clip-range-input--out');
            this.inButton = this.editor.querySelector('.clip-mark--in');
            this.outButton = this.editor.querySelector('.clip-mark--out');
            this.inTimeOutput = this.editor.querySelector('.clip-in-time');
            this.outTimeOutput = this.editor.querySelector('.clip-out-time');
            this.durationOutput = this.editor.querySelector('.clip-duration');
            this.status = this.editor.querySelector('.clip-status');
            this.progress = this.editor.querySelector('.clip-export-progress');
            this.progressBar = this.editor.querySelector('.clip-export-progress__track span');
            this.exportButton = this.editor.querySelector('.clip-export-button');
            this.outputNote = this.editor.querySelector('.clip-output-note');
            this.editingView = this.editor.querySelector('.clip-editing-view');
            this.resultView = this.editor.querySelector('.clip-result-view');
            this.resultDetails = this.editor.querySelector('.clip-result-details');
            this.downloadButton = this.editor.querySelector('.clip-download-button');
            this.makeAnotherButton = this.editor.querySelector('.clip-make-another');
        }

        bindEvents() {
            this.controlButton?.addEventListener('click', event => {
                event.stopPropagation();
                void this.open();
            });
            this.closeButton?.addEventListener('click', () => this.close());
            this.frameBackButton?.addEventListener('click', () => void this.stepFrame(-1));
            this.frameForwardButton?.addEventListener('click', () => void this.stepFrame(1));
            this.previewButton?.addEventListener('click', () => void this.togglePreview());
            this.preview?.addEventListener('click', () => void this.togglePreview());
            this.inButton?.addEventListener('click', () => this.setMarkFromPlayhead('in'));
            this.outButton?.addEventListener('click', () => this.setMarkFromPlayhead('out'));
            this.exportButton?.addEventListener('click', () => void this.exportSelection());
            this.downloadButton?.addEventListener('click', () => this.downloadResult());
            this.makeAnotherButton?.addEventListener('click', () => void this.makeAnother());

            this.inRange?.addEventListener('input', () => this.previewRangeValue('in'));
            this.outRange?.addEventListener('input', () => this.previewRangeValue('out'));
            this.inRange?.addEventListener('change', () => void this.commitRangeValue('in'));
            this.outRange?.addEventListener('change', () => void this.commitRangeValue('out'));

            this.editor?.addEventListener('keydown', event => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                void this.stepFrame(event.key === 'ArrowLeft' ? -1 : 1);
            });

            this.media.addEventListener('loadedmetadata', () => this.updateControlAvailability());
            this.media.addEventListener('emptied', () => this.updateControlAvailability());
            this.media.addEventListener('loadstart', () => {
                if (this.isOpen) this.close({ restorePlayer: false });
                this.updateControlAvailability();
            });
        }

        updateControlAvailability() {
            if (!this.controlButton) return;
            const available = Boolean(this.media.currentSrc || this.media.src);
            this.controlButton.disabled = !available;
            this.controlButton.setAttribute('aria-disabled', String(!available));
        }

        async open() {
            if (this.isOpen || this.controlButton?.disabled) return;
            const sourceUrl = this.media.currentSrc || this.media.src;
            if (!sourceUrl) return;

            this.isOpen = true;
            this.wasPlaying = !this.media.paused;
            this.originalTime = this.media.currentTime || 0;
            this.sourceUrl = sourceUrl;
            this.sourceTitle = document.querySelector('.ep-title')?.textContent?.trim()
                || CONFIG.movieData?.normalMovie?.name
                || 'Chunkplayer clip';

            this.player.pause();
            this.clearResult();
            this.setEditingState(true);
            this.editor.hidden = false;
            this.container.classList.add('clip-bench-open');
            document.body.classList.add('clip-editor-active');
            this.editor.classList.add('clip-editor--loading');
            this.rateBadge.textContent = 'Reading frames…';
            this.setStatus('Finding the source frame cadence…');
            this.closeButton.focus({ preventScroll: true });

            try {
                this.preview.crossOrigin = 'anonymous';
                this.preview.loop = false;
                this.preview.src = this.sourceUrl;
                this.preview.load();
                await this.waitForMediaEvent(this.preview, 'loadedmetadata', 15000);
                if (!this.isOpen) return;

                this.duration = this.preview.duration;
                this.frameTimingApproximate = typeof this.preview.requestVideoFrameCallback !== 'function';
                const safeLastFrame = Math.max(0, this.duration - (1 / 120));
                const initialTime = Math.max(0, Math.min(this.originalTime, safeLastFrame));
                this.sourceFps = await this.detectFrameRate(initialTime);
                this.exportFps = ClipExportService.normaliseExportFps(this.sourceFps);
                this.frameDuration = 1 / Math.max(1, this.sourceFps);

                const startFrame = await this.seekAndReadFrame(initialTime);
                const latestStart = Math.max(0, this.duration - MIN_CLIP_SECONDS);
                this.inTime = Math.min(startFrame, latestStart);
                const desiredOut = Math.min(
                    Math.max(0, this.duration - this.frameDuration),
                    this.inTime + DEFAULT_CLIP_SECONDS - this.frameDuration
                );
                this.outTime = await this.seekAndReadFrame(desiredOut);
                if (this.selectionDuration() < MIN_CLIP_SECONDS) {
                    this.inTime = Math.max(0, this.outTime - MIN_CLIP_SECONDS + this.frameDuration);
                    this.inTime = await this.seekAndReadFrame(this.inTime);
                }
                await this.seekAndReadFrame(this.inTime);

                this.configureRanges();
                this.startFrameMonitor();
                this.editor.classList.remove('clip-editor--loading');
                this.rateBadge.textContent = this.getRateLabel();
                const preferredOutput = ClipExportService.getPreferredOutput();
                this.outputNote.textContent = `${preferredOutput?.label || 'Video'} · silent · 480p max · 8s max`;
                this.setStatus('Use the frame buttons to find the exact cut, then set IN or OUT.');
                this.updateUi();
            } catch (error) {
                if (!this.isOpen) return;
                this.editor.classList.remove('clip-editor--loading');
                this.setStatus(this.humaniseError(error), true);
            }
        }

        async detectFrameRate(initialTime) {
            if (typeof this.preview.requestVideoFrameCallback !== 'function') return 24;

            const sampleStart = Math.max(0, Math.min(initialTime, Math.max(0, this.duration - 1)));
            await this.seekAndReadFrame(sampleStart);
            const samples = [];

            await new Promise(resolve => {
                let callbackId = null;
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    this.preview.pause();
                    if (callbackId !== null) this.preview.cancelVideoFrameCallback(callbackId);
                    resolve();
                };
                const timeoutId = setTimeout(finish, 1400);
                const onFrame = (_now, metadata) => {
                    samples.push({ mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames });
                    if (samples.length >= 14 || this.preview.ended) {
                        clearTimeout(timeoutId);
                        finish();
                        return;
                    }
                    callbackId = this.preview.requestVideoFrameCallback(onFrame);
                };
                callbackId = this.preview.requestVideoFrameCallback(onFrame);
                this.preview.play().catch(() => {
                    clearTimeout(timeoutId);
                    finish();
                });
            });

            const measurements = [];
            for (let index = 1; index < samples.length; index++) {
                const timeDelta = samples[index].mediaTime - samples[index - 1].mediaTime;
                const frameDelta = samples[index].presentedFrames - samples[index - 1].presentedFrames;
                if (timeDelta > 0 && frameDelta > 0 && frameDelta <= 6) {
                    measurements.push(frameDelta / timeDelta);
                }
            }
            if (!measurements.length) return 24;
            measurements.sort((a, b) => a - b);
            const median = measurements[Math.floor(measurements.length / 2)];
            return ClipExportService.snapSourceFps(median);
        }

        startFrameMonitor() {
            this.stopFrameMonitor();
            if (typeof this.preview.requestVideoFrameCallback === 'function') {
                const onFrame = (_now, metadata) => {
                    if (!this.isOpen || this.isResult) return;
                    this.currentFrameTime = metadata.mediaTime;
                    this.currentTimeOutput.textContent = this.formatTime(metadata.mediaTime);
                    if (this.isPreviewing && metadata.mediaTime > this.outTime + (this.frameDuration * 0.5)) {
                        void this.seekAndReadFrame(this.inTime).then(() => {
                            if (this.isOpen && this.isPreviewing) return this.preview.play();
                        }).catch(() => {});
                    }
                    this.frameCallbackId = this.preview.requestVideoFrameCallback(onFrame);
                };
                this.frameCallbackId = this.preview.requestVideoFrameCallback(onFrame);
                return;
            }

            this.fallbackFrameHandler = () => {
                if (!this.isOpen || this.isResult) return;
                this.currentFrameTime = this.preview.currentTime;
                this.currentTimeOutput.textContent = this.formatTime(this.currentFrameTime);
                if (this.isPreviewing && this.preview.currentTime > this.outTime + (this.frameDuration * 0.5)) {
                    this.preview.currentTime = this.inTime;
                }
            };
            this.preview.addEventListener('timeupdate', this.fallbackFrameHandler);
        }

        stopFrameMonitor() {
            if (this.frameCallbackId !== null && typeof this.preview?.cancelVideoFrameCallback === 'function') {
                this.preview.cancelVideoFrameCallback(this.frameCallbackId);
            }
            this.frameCallbackId = null;
            if (this.fallbackFrameHandler) this.preview?.removeEventListener('timeupdate', this.fallbackFrameHandler);
            this.fallbackFrameHandler = null;
        }

        async seekAndReadFrame(targetTime) {
            const sequence = ++this.seekSequence;
            const clamped = Math.max(0, Math.min(targetTime, Math.max(0, this.duration - 0.001)));
            this.preview.pause();
            this.isPreviewing = false;
            this.updatePreviewButton();

            const framePromise = this.readNextPresentedFrame(700);
            if (Math.abs(this.preview.currentTime - clamped) < 0.0005) {
                this.preview.currentTime = Math.min(this.duration - 0.001, clamped + 0.0005);
            } else {
                this.preview.currentTime = clamped;
            }
            const frameTime = await framePromise;
            if (sequence !== this.seekSequence) return this.currentFrameTime;
            this.currentFrameTime = Number.isFinite(frameTime) ? frameTime : this.preview.currentTime;
            this.currentTimeOutput.textContent = this.formatTime(this.currentFrameTime);
            return this.currentFrameTime;
        }

        readNextPresentedFrame(timeoutMs) {
            if (typeof this.preview.requestVideoFrameCallback !== 'function') {
                return this.waitForMediaEvent(this.preview, 'seeked', timeoutMs)
                    .then(() => this.preview.currentTime)
                    .catch(() => this.preview.currentTime);
            }

            return new Promise(resolve => {
                let settled = false;
                const finish = value => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutId);
                    resolve(value);
                };
                const timeoutId = setTimeout(() => finish(this.preview.currentTime), timeoutMs);
                this.preview.requestVideoFrameCallback((_now, metadata) => finish(metadata.mediaTime));
            });
        }

        async stepFrame(direction) {
            if (!this.isOpen || this.isExporting || this.isResult) return;
            this.setFrameControlsDisabled(true);
            const originalFrame = this.currentFrameTime;
            let target = originalFrame + (direction * this.frameDuration);

            try {
                for (let attempt = 0; attempt < 3; attempt++) {
                    const landed = await this.seekAndReadFrame(target);
                    const moved = direction < 0
                        ? landed < originalFrame - (this.frameDuration * 0.25)
                        : landed > originalFrame + (this.frameDuration * 0.25);
                    if (moved || landed <= 0 || landed >= this.duration - this.frameDuration) break;
                    target += direction * this.frameDuration * 0.55;
                }
            } finally {
                this.setFrameControlsDisabled(false);
                this.updateUi();
            }
        }

        async togglePreview() {
            if (!this.isOpen || this.isExporting || this.isResult) return;
            if (this.isPreviewing) {
                this.preview.pause();
                this.isPreviewing = false;
                this.updatePreviewButton();
                return;
            }

            if (this.currentFrameTime < this.inTime || this.currentFrameTime > this.outTime) {
                await this.seekAndReadFrame(this.inTime);
            }
            this.isPreviewing = true;
            this.updatePreviewButton();
            try {
                await this.preview.play();
            } catch (error) {
                this.isPreviewing = false;
                this.updatePreviewButton();
                this.setStatus('The browser could not start the clip preview.', true);
            }
        }

        setMarkFromPlayhead(kind) {
            if (this.isExporting || this.isResult) return;
            this.applyMark(kind, this.currentFrameTime);
            this.updateUi();
        }

        previewRangeValue(kind) {
            if (this.isExporting || this.isResult) return;
            const value = Number(kind === 'in' ? this.inRange.value : this.outRange.value);
            if (kind === 'in') this.inTime = value;
            else this.outTime = value;
            this.enforceRange(kind);
            this.preview.currentTime = kind === 'in' ? this.inTime : this.outTime;
            this.updateUi();
        }

        async commitRangeValue(kind) {
            if (this.isExporting || this.isResult) return;
            const input = kind === 'in' ? this.inRange : this.outRange;
            const snappedTime = await this.seekAndReadFrame(Number(input.value));
            this.applyMark(kind, snappedTime);
            this.updateUi();
        }

        applyMark(kind, value) {
            if (kind === 'in') this.inTime = Math.max(0, Math.min(value, this.duration));
            else this.outTime = Math.max(0, Math.min(value, this.duration - this.frameDuration));
            this.enforceRange(kind);
        }

        enforceRange(changedMark) {
            const minimumFrameCount = Math.max(2, Math.ceil(MIN_CLIP_SECONDS * this.sourceFps));
            const maximumFrameCount = Math.max(minimumFrameCount, Math.floor(MAX_CLIP_SECONDS * this.sourceFps));
            const minimumGap = (minimumFrameCount - 1) * this.frameDuration;
            const maximumGap = (maximumFrameCount - 1) * this.frameDuration;
            const lastFrame = Math.max(0, this.duration - this.frameDuration);

            this.inTime = Math.max(0, Math.min(this.inTime, lastFrame));
            this.outTime = Math.max(0, Math.min(this.outTime, lastFrame));

            if (changedMark === 'in') {
                if (this.outTime - this.inTime < minimumGap) this.outTime = Math.min(lastFrame, this.inTime + minimumGap);
                if (this.outTime - this.inTime > maximumGap) this.outTime = Math.min(lastFrame, this.inTime + maximumGap);
                if (this.outTime - this.inTime < minimumGap) this.inTime = Math.max(0, this.outTime - minimumGap);
            } else {
                if (this.outTime - this.inTime < minimumGap) this.inTime = Math.max(0, this.outTime - minimumGap);
                if (this.outTime - this.inTime > maximumGap) this.inTime = Math.max(0, this.outTime - maximumGap);
                if (this.outTime - this.inTime < minimumGap) this.outTime = Math.min(lastFrame, this.inTime + minimumGap);
            }
        }

        configureRanges() {
            const max = Math.max(this.frameDuration, this.duration - this.frameDuration);
            [this.inRange, this.outRange].forEach(input => {
                input.min = '0';
                input.max = String(max);
                input.step = String(Math.max(0.001, this.frameDuration));
            });
        }

        updateUi() {
            if (!this.duration) return;
            this.inRange.value = String(this.inTime);
            this.outRange.value = String(this.outTime);
            const max = Number(this.inRange.max) || this.duration;
            const inPercent = Math.max(0, Math.min(100, (this.inTime / max) * 100));
            const outPercent = Math.max(0, Math.min(100, (this.outTime / max) * 100));
            this.range.style.setProperty('--clip-in', `${inPercent}%`);
            this.range.style.setProperty('--clip-out', `${outPercent}%`);
            this.inTimeOutput.textContent = this.formatTime(this.inTime);
            this.outTimeOutput.textContent = this.formatTime(this.outTime);
            this.currentTimeOutput.textContent = this.formatTime(this.currentFrameTime);
            this.durationOutput.textContent = `${this.selectionDuration().toFixed(3)}s`;
            const valid = this.selectionDuration() >= MIN_CLIP_SECONDS - 0.01
                && this.selectionDuration() <= MAX_CLIP_SECONDS + 0.01;
            this.exportButton.disabled = !valid || this.isExporting;
        }

        selectionDuration() {
            return Math.max(0, this.outTime - this.inTime + this.frameDuration);
        }

        async exportSelection() {
            if (this.isExporting || this.isResult) return;
            const clipDuration = this.selectionDuration();
            if (clipDuration < MIN_CLIP_SECONDS - 0.01 || clipDuration > MAX_CLIP_SECONDS + 0.01) {
                this.setStatus('Choose a clip between 0.5 and 8 seconds.', true);
                return;
            }

            this.isExporting = true;
            this.isPreviewing = false;
            this.preview.pause();
            this.updatePreviewButton();
            this.setEditingDisabled(true);
            this.progress.hidden = false;
            this.progressBar.style.width = '0%';
            this.setStatus('Cutting the selected frames in real time…');
            this.exportController = new AbortController();

            try {
                const result = await this.exportService.exportClip({
                    sourceUrl: this.sourceUrl,
                    startTime: this.inTime,
                    endTime: this.outTime,
                    sourceFps: this.sourceFps,
                    signal: this.exportController.signal,
                    onProgress: progress => {
                        this.progressBar.style.width = `${Math.round(progress * 100)}%`;
                    }
                });
                if (!this.isOpen) return;
                this.showResult(result);
            } catch (error) {
                if (error.name !== 'AbortError' && this.isOpen) {
                    this.setStatus(this.humaniseError(error), true);
                }
            } finally {
                this.isExporting = false;
                this.exportController = null;
                if (this.isOpen && !this.isResult) {
                    this.setEditingDisabled(false);
                    this.progress.hidden = true;
                    this.updateUi();
                }
            }
        }

        showResult(result) {
            this.stopFrameMonitor();
            this.result = result;
            this.resultUrl = URL.createObjectURL(result.blob);
            this.isResult = true;
            this.setEditingState(false);
            this.preview.src = this.resultUrl;
            this.preview.loop = true;
            this.preview.load();
            this.preview.play().catch(() => {});
            this.resultDetails.textContent = `${result.label} · ${result.width}×${result.height} · ${this.selectionDuration().toFixed(2)}s · ${result.exportFps} fps`;
            this.setStatus('');
        }

        downloadResult() {
            if (!this.result || !this.resultUrl) return;
            const filename = ClipExportService.createFilename(
                this.sourceTitle,
                this.inTime,
                this.outTime,
                this.result.extension
            );
            const link = document.createElement('a');
            link.href = this.resultUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }

        async makeAnother() {
            if (!this.isResult) return;
            this.clearResult();
            this.setEditingState(true);
            this.preview.crossOrigin = 'anonymous';
            this.preview.loop = false;
            this.preview.src = this.sourceUrl;
            this.preview.load();
            try {
                await this.waitForMediaEvent(this.preview, 'loadedmetadata', 15000);
                await this.seekAndReadFrame(this.inTime);
                this.startFrameMonitor();
                this.setStatus('Adjust the cut or export another loop.');
                this.updateUi();
            } catch (error) {
                this.setStatus(this.humaniseError(error), true);
            }
        }

        clearResult() {
            this.isResult = false;
            this.result = null;
            if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
            this.resultUrl = null;
        }

        setEditingState(editing) {
            this.editingView.hidden = !editing;
            this.resultView.hidden = editing;
            this.editor?.classList.toggle('clip-editor--result', !editing);
        }

        setEditingDisabled(disabled) {
            this.editor.classList.toggle('clip-editor--exporting', disabled);
            [
                this.frameBackButton, this.frameForwardButton, this.previewButton,
                this.inRange, this.outRange, this.inButton, this.outButton, this.exportButton
            ].forEach(element => { element.disabled = disabled; });
        }

        setFrameControlsDisabled(disabled) {
            this.frameBackButton.disabled = disabled;
            this.frameForwardButton.disabled = disabled;
        }

        updatePreviewButton() {
            if (!this.previewButton) return;
            this.previewButton.textContent = this.isPreviewing ? 'Stop preview' : 'Preview loop';
            this.previewButton.setAttribute('aria-pressed', String(this.isPreviewing));
        }

        getRateLabel() {
            const source = this.formatFps(this.sourceFps);
            const output = this.formatFps(this.exportFps);
            const label = Math.abs(this.sourceFps - this.exportFps) < 0.001
                ? `${source} FPS SOURCE`
                : `${source} SOURCE → ${output} EXPORT`;
            return this.frameTimingApproximate ? `${label} · APPROX` : label;
        }

        formatFps(fps) {
            return Number.isInteger(fps) ? String(fps) : fps.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
        }

        formatTime(seconds) {
            const totalMilliseconds = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
            const minutes = Math.floor(totalMilliseconds / 60000);
            const secondsPart = Math.floor((totalMilliseconds % 60000) / 1000);
            const milliseconds = totalMilliseconds % 1000;
            return `${minutes}:${String(secondsPart).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
        }

        setStatus(message, isError = false) {
            this.status.textContent = message;
            this.status.classList.toggle('clip-status--error', isError);
        }

        humaniseError(error) {
            if (error?.name === 'AbortError') return 'Clip export cancelled.';
            return error?.message || 'The clip could not be created.';
        }

        waitForMediaEvent(target, eventName, timeoutMs) {
            if (eventName === 'loadedmetadata' && target.readyState >= 1) return Promise.resolve();
            return new Promise((resolve, reject) => {
                let timeoutId;
                const cleanup = () => {
                    clearTimeout(timeoutId);
                    target.removeEventListener(eventName, handleSuccess);
                    target.removeEventListener('error', handleError);
                };
                const handleSuccess = () => { cleanup(); resolve(); };
                const handleError = () => { cleanup(); reject(new Error('The video could not be loaded in the clip editor.')); };
                target.addEventListener(eventName, handleSuccess, { once: true });
                target.addEventListener('error', handleError, { once: true });
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error('The clip editor timed out while loading the video.'));
                }, timeoutMs);
            });
        }

        close({ restorePlayer = true } = {}) {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.isPreviewing = false;
            this.exportController?.abort();
            this.exportController = null;
            this.stopFrameMonitor();
            this.preview.pause();
            this.preview.removeAttribute('src');
            this.preview.load();
            this.clearResult();
            this.editor.hidden = true;
            this.editor.classList.remove('clip-editor--loading', 'clip-editor--exporting', 'clip-editor--result');
            this.container.classList.remove('clip-bench-open');
            document.body.classList.remove('clip-editor-active');

            if (restorePlayer) {
                this.media.currentTime = Math.min(this.originalTime, this.media.duration || this.originalTime);
                if (this.wasPlaying) {
                    const playPromise = this.player.play();
                    playPromise?.catch?.(() => {});
                }
            }
            this.controlButton?.focus({ preventScroll: true });
        }
    }

    document.addEventListener('ready', event => {
        const player = event.detail?.plyr;
        if (!player || player.media?.tagName !== 'VIDEO') return;
        const controls = player.config?.controls;
        if (!Array.isArray(controls) || !controls.includes('clip-export')) return;
        if (player.media.dataset.clipExportMounted === 'true') return;
        player.media.dataset.clipExportMounted = 'true';
        new PlyrClipBench(player);
    });
}(document));
