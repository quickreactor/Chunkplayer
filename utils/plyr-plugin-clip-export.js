(function initMediabunnyClipPlugin(document) {
    if (!document || typeof CONFIG === 'undefined' || !CONFIG.features?.clipExport || !globalThis.ClipExportService) return;
    if (!ClipExportService.hasBaseCapabilities()) return;

    const ICONS = {
        scissors: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>`,
        previous: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14M18 6l-8 6 8 6V6Z"/></svg>`,
        next: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5v14M6 6l8 6-8 6V6Z"/></svg>`,
        play: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 5 11 7-11 7V5Z"/></svg>`,
        pause: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>`,
        loop: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>`,
        markIn: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H6v16h4M18 12H9M12 9l-3 3 3 3"/></svg>`,
        markOut: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4v16h-4M6 12h9M12 9l3 3-3 3"/></svg>`,
        trimStart: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M20 2h-8v20h8"/></svg>`,
        trimEnd: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M4 2h8v20H4"/></svg>`,
        close: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
        download: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg>`,
        stop: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`
    };

    // The overview is a restrained source-position map, not a thumbnail strip.
    // The precision rail crops and enlarges this same map for its current window.
    const TIMELINE_COLOUR_STOPS = [
        { position: 0, colour: '#5d89a7' },
        { position: 0.52, colour: '#8077a4' },
        { position: 1, colour: '#b27d73' }
    ];

    class PlyrClipExporter {
        constructor(player) {
            this.player = player;
            this.media = player.media;
            this.container = player.elements.container;
            this.service = new ClipExportService();
            this.session = null;
            this.sourceUrl = '';
            this.sourceGeneration = 0;
            this.startSample = null;
            this.endSample = null;
            this.currentSample = null;
            this.isOpen = false;
            this.isLooping = true;
            this.isExporting = false;
            this.isBusy = false;
            this.originalState = null;
            this.abortController = null;
            this.downloadUrl = null;
            this.seekGeneration = 0;
            this.refreshTimer = null;
            this.activeDrag = null;
            this.activeOverviewDrag = null;
            this.dragSeekFrame = null;
            this.statusTimer = null;
            this.playbackMonitorId = null;
            this.playbackMonitorType = null;
            this.playbackMonitorGeneration = 0;
            this.playbackBoundaryTimer = null;
            this.loopRestartPending = false;
            this.viewStart = 0;
            this.viewEnd = 1;

            this.boundSourceChange = () => this.queueSourceRefresh();
            this.boundPlaybackTick = () => this.handlePlaybackTick();
            this.boundPlaybackState = () => {
                this.updatePlaybackButton();
                if (this.media.paused) {
                    if (!this.loopRestartPending) this.stopPlaybackMonitor();
                } else {
                    this.startPlaybackMonitor();
                }
            };
            this.boundKeydown = event => {
                if (event.key === 'Escape' && this.isOpen) this.close();
            };

            this.media.addEventListener('loadstart', this.boundSourceChange);
            this.media.addEventListener('loadedmetadata', this.boundSourceChange);
            this.media.addEventListener('emptied', this.boundSourceChange);
            this.media.addEventListener('timeupdate', this.boundPlaybackTick);
            this.media.addEventListener('play', this.boundPlaybackState);
            this.media.addEventListener('pause', this.boundPlaybackState);
            document.addEventListener('keydown', this.boundKeydown);
            this.queueSourceRefresh();
        }

        queueSourceRefresh() {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = setTimeout(() => this.refreshSource(), 80);
        }

        async refreshSource() {
            const nextUrl = this.media.currentSrc || this.media.src || '';
            const generation = ++this.sourceGeneration;
            if (nextUrl === this.sourceUrl && this.session && !this.session.disposed) return;

            await this.close({ restore: false });
            this.removeControl();
            this.session?.dispose();
            this.session = null;
            this.sourceUrl = nextUrl;
            if (!nextUrl || !Number.isFinite(this.media.duration) || this.media.duration < ClipExportService.MIN_SECONDS) return;

            try {
                const session = await this.service.openSource(nextUrl);
                if (generation !== this.sourceGeneration || nextUrl !== (this.media.currentSrc || this.media.src)) {
                    session.dispose();
                    return;
                }
                if (session.duration < ClipExportService.MIN_SECONDS) {
                    session.dispose();
                    return;
                }
                this.session = session;
                this.mountControl();
            } catch (error) {
                console.info('[Clip Export] Unavailable for this video:', error.message);
            }
        }

        mountControl() {
            if (this.button?.isConnected) return;
            const controls = this.container.querySelector('.plyr__controls');
            if (!controls) return;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'plyr__controls__item plyr__control clip-export-control';
            button.dataset.plyr = 'clip-export';
            button.setAttribute('aria-label', 'Make a clip');
            button.setAttribute('title', 'Make a clip');
            button.innerHTML = `${ICONS.scissors}<span class="plyr__tooltip">Make a clip</span>`;
            button.addEventListener('click', () => this.open());

            const anchor = controls.querySelector('[data-plyr="pip"], [data-plyr="fullscreen"]');
            controls.insertBefore(button, anchor || null);
            this.button = button;
        }

        removeControl() {
            this.button?.remove();
            this.button = null;
            this.panel?.remove();
            this.panel = null;
            this.elements = null;
        }

        buildPanel() {
            const panel = document.createElement('section');
            panel.className = 'clip-editor';
            panel.hidden = true;
            panel.setAttribute('aria-label', 'Clip editor');
            panel.innerHTML = `
                <div class="clip-topbar">
                    <div class="clip-clock" aria-label="Current time and total duration">
                        <output data-clip-output="current" aria-live="off">0:00.000</output>
                        <span aria-hidden="true">/</span>
                        <output data-clip-output="total" aria-live="off">0:00.000</output>
                    </div>
                    <div class="clip-secondary-actions">
                        <button type="button" class="clip-icon-button" data-clip="loop" aria-label="Loop selected range" aria-pressed="true" title="Loop selected range">
                            ${ICONS.loop}<span class="clip-tooltip" role="tooltip">Loop</span>
                        </button>
                        <button type="button" class="clip-icon-button" data-clip="cancel-export" aria-label="Cancel export" title="Cancel export" hidden>
                            ${ICONS.stop}<span class="clip-tooltip" role="tooltip">Cancel export</span>
                        </button>
                        <button type="button" class="clip-icon-button clip-icon-button--export" data-clip="export" aria-label="Export MP4" title="Export MP4">
                            ${ICONS.download}<span class="clip-tooltip" role="tooltip">Export MP4</span>
                        </button>
                        <button type="button" class="clip-icon-button" data-clip="close" aria-label="Close clip editor" title="Close">
                            ${ICONS.close}<span class="clip-tooltip" role="tooltip">Close</span>
                        </button>
                    </div>
                </div>

                <div class="clip-overview" data-clip="overview" style="--overview-start: 0%; --overview-end: 0%; --overview-playhead: 0%" aria-label="Full video timeline. Tap or drag to set the clip start.">
                    <div class="clip-overview__track" aria-hidden="true"></div>
                    <div class="clip-overview__selection" aria-hidden="true"></div>
                    <span class="clip-overview__playhead" aria-hidden="true"></span>
                </div>

                <div class="clip-timeline" data-clip="timeline" style="--clip-start: 0%; --clip-end: 0%; --clip-playhead: 0%" aria-label="Zoomed 16-second precision timeline">
                    <div class="clip-timeline__track" aria-hidden="true"></div>
                    <div class="clip-timeline__selection" data-drag="segment" aria-hidden="true"></div>
                    <button type="button" class="clip-trim-handle clip-trim-handle--start" data-drag="start" aria-label="Drag clip start" title="Drag clip start"><span>${ICONS.trimStart}</span></button>
                    <button type="button" class="clip-trim-handle clip-trim-handle--end" data-drag="end" aria-label="Drag clip end" title="Drag clip end"><span>${ICONS.trimEnd}</span></button>
                    <button type="button" class="clip-cti" data-drag="playhead" aria-label="Drag playhead" title="Drag playhead"><span></span></button>
                </div>

                <div class="clip-time-row">
                    <output data-clip-output="start" aria-label="Clip start">0:00.000</output>
                    <output data-clip-output="duration" aria-label="Clip duration">0.000s</output>
                    <output data-clip-output="end" aria-label="Final included frame">0:00.000</output>
                </div>

                <div class="clip-transport" aria-label="Clip transport controls">
                    <button type="button" class="clip-tool" data-clip="start" aria-label="Mark In at playhead" title="Mark In">
                        ${ICONS.markIn}<span class="clip-tooltip" role="tooltip">Mark In</span>
                    </button>
                    <button type="button" class="clip-tool" data-clip="previous" aria-label="Previous frame" title="Previous frame">
                        ${ICONS.previous}<span class="clip-tooltip" role="tooltip">Previous frame</span>
                    </button>
                    <button type="button" class="clip-tool clip-tool--play" data-clip="play" aria-label="Play selected range" title="Play selected range">
                        ${ICONS.play}<span class="clip-tooltip" role="tooltip">Play</span>
                    </button>
                    <button type="button" class="clip-tool" data-clip="next" aria-label="Next frame" title="Next frame">
                        ${ICONS.next}<span class="clip-tooltip" role="tooltip">Next frame</span>
                    </button>
                    <button type="button" class="clip-tool" data-clip="end" aria-label="Mark Out at playhead" title="Mark Out">
                        ${ICONS.markOut}<span class="clip-tooltip" role="tooltip">Mark Out</span>
                    </button>
                </div>

                <p class="clip-status" data-clip-output="status" aria-live="polite" hidden></p>
                <div class="clip-progress" data-clip="progress" hidden aria-label="Export progress"><span></span></div>`;

            this.container.appendChild(panel);
            this.panel = panel;
            this.elements = {
                overview: panel.querySelector('[data-clip="overview"]'),
                timeline: panel.querySelector('[data-clip="timeline"]'),
                startHandle: panel.querySelector('[data-drag="start"]'),
                endHandle: panel.querySelector('[data-drag="end"]'),
                playheadHandle: panel.querySelector('[data-drag="playhead"]'),
                playhead: panel.querySelector('[data-clip-output="current"]'),
                total: panel.querySelector('[data-clip-output="total"]'),
                start: panel.querySelector('[data-clip-output="start"]'),
                end: panel.querySelector('[data-clip-output="end"]'),
                duration: panel.querySelector('[data-clip-output="duration"]'),
                status: panel.querySelector('[data-clip-output="status"]'),
                loop: panel.querySelector('[data-clip="loop"]'),
                play: panel.querySelector('[data-clip="play"]'),
                progress: panel.querySelector('[data-clip="progress"]'),
                progressBar: panel.querySelector('[data-clip="progress"] span'),
                export: panel.querySelector('[data-clip="export"]'),
                cancelExport: panel.querySelector('[data-clip="cancel-export"]')
            };

            panel.querySelector('[data-clip="close"]').addEventListener('click', () => this.close());
            panel.querySelector('[data-clip="previous"]').addEventListener('click', () => this.stepFrame(-1));
            panel.querySelector('[data-clip="next"]').addEventListener('click', () => this.stepFrame(1));
            panel.querySelector('[data-clip="play"]').addEventListener('click', () => this.togglePlayback());
            panel.querySelector('[data-clip="loop"]').addEventListener('click', () => this.toggleLoop());
            panel.querySelector('[data-clip="start"]').addEventListener('click', () => this.setMarker('start'));
            panel.querySelector('[data-clip="end"]').addEventListener('click', () => this.setMarker('end'));
            panel.querySelector('[data-clip="export"]').addEventListener('click', () => this.export());
            panel.querySelector('[data-clip="cancel-export"]').addEventListener('click', () => this.abortController?.abort());

            this.elements.timeline.addEventListener('pointerdown', event => {
                const dragControl = event.target.closest('[data-drag]');
                this.startTimelineDrag(event, dragControl?.dataset.drag || this.getTimelineDragKind(event));
            });
            this.elements.timeline.addEventListener('pointermove', event => this.moveTimelineDrag(event));
            this.elements.timeline.addEventListener('pointerup', event => this.endTimelineDrag(event));
            this.elements.timeline.addEventListener('pointercancel', event => this.endTimelineDrag(event));
            this.elements.timeline.addEventListener('lostpointercapture', event => this.endTimelineDrag(event));

            this.elements.overview.addEventListener('pointerdown', event => this.startOverviewDrag(event));
            this.elements.overview.addEventListener('pointermove', event => this.moveOverviewDrag(event));
            this.elements.overview.addEventListener('pointerup', event => this.endOverviewDrag(event));
            this.elements.overview.addEventListener('pointercancel', event => this.endOverviewDrag(event));
            this.elements.overview.addEventListener('lostpointercapture', event => this.endOverviewDrag(event));
        }

        async open() {
            if (!this.session || this.isOpen || this.isExporting) return;
            if (!this.panel) this.buildPanel();

            this.originalState = {
                time: this.media.currentTime,
                wasPlaying: !this.media.paused,
                muted: this.media.muted
            };
            this.media.pause();
            this.isOpen = true;
            this.isLooping = true;
            this.panel.hidden = false;
            this.container.classList.add('clip-editor-open');
            document.body.classList.add('clip-editor-active');
            this.updateLoopButton();
            this.setStatus('Reading exact frame timing…');

            try {
                const latestStart = Math.max(this.session.firstTimestamp, this.session.duration - ClipExportService.DEFAULT_SECONDS);
                const startTarget = Math.min(latestStart, Math.max(this.session.firstTimestamp, this.media.currentTime - ClipExportService.DEFAULT_SECONDS / 2));
                this.startSample = await this.session.resolveSample(startTarget);
                const endTarget = Math.min(this.session.duration, this.startSample.timestamp + ClipExportService.DEFAULT_SECONDS - 0.000001);
                this.endSample = await this.session.resolveSample(endTarget);
                this.currentSample = await this.session.resolveSample(this.media.currentTime);
                this.setTimelineWindow(this.currentSample.timestamp);
                await this.seekToSample(this.currentSample, { pause: false });
                this.elements.total.textContent = this.formatTime(this.session.duration);
                this.updateUi();
                this.setStatus('');
                this.elements.play.focus({ preventScroll: true });
            } catch (error) {
                this.setStatus(error.message, true);
            }
        }

        async close({ restore = true } = {}) {
            if (!this.isOpen && !this.isExporting) return;
            this.abortController?.abort();
            this.cancelTimelineDrag();
            this.stopPlaybackMonitor();
            this.media.pause();
            this.isOpen = false;
            this.isLooping = false;
            this.loopRestartPending = false;
            this.isExporting = false;
            this.container.classList.remove('clip-editor-open');
            document.body.classList.remove('clip-editor-active', 'clip-timeline-dragging');
            if (this.panel) this.panel.hidden = true;
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
            this.revokeDownload();

            const state = this.originalState;
            this.originalState = null;
            if (restore && state && this.sourceUrl === (this.media.currentSrc || this.media.src)) {
                this.media.muted = state.muted;
                try {
                    await this.seekMedia(state.time);
                    if (state.wasPlaying) await this.media.play();
                } catch (error) {
                    console.info('[Clip Export] Playback state could not be fully restored:', error.message);
                }
            }
        }

        startTimelineDrag(event, kind) {
            if (!this.isOpen || this.isBusy || this.isExporting || event.button > 0) return;
            event.preventDefault();
            this.media.pause();
            const pointerTime = this.pointerTime(event);
            const start = this.startSample.timestamp;
            const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
            this.activeDrag = {
                pointerId: event.pointerId,
                kind,
                downClientX: event.clientX,
                moved: false
            };
            if (kind === 'start') {
                this.activeDrag.time = start;
                this.activeDrag.grabOffset = pointerTime - start;
            } else if (kind === 'end') {
                this.activeDrag.time = endBoundary;
                this.activeDrag.grabOffset = pointerTime - endBoundary;
            } else if (kind === 'segment') {
                this.activeDrag.duration = endBoundary - start;
                this.activeDrag.grabOffset = this.clamp(pointerTime - start, 0, this.activeDrag.duration);
                this.activeDrag.fixedPlayhead = this.media.currentTime;
                this.activeDrag.start = start;
                this.activeDrag.endBoundary = endBoundary;
            }
            this.elements.timeline.setPointerCapture(event.pointerId);
            this.elements.timeline.classList.add('clip-timeline--dragging');
            document.body.classList.add('clip-timeline-dragging');
            if (kind === 'playhead') this.updateTimelineDrag(event);
        }

        moveTimelineDrag(event) {
            if (!this.activeDrag || event.pointerId !== this.activeDrag.pointerId) return;
            event.preventDefault();
            if (Math.abs(event.clientX - this.activeDrag.downClientX) > 1) {
                this.activeDrag.moved = true;
            }
            if (!this.activeDrag.moved && this.activeDrag.kind !== 'playhead') return;
            this.updateTimelineDrag(event);
        }

        updateTimelineDrag(event) {
            const kind = this.activeDrag?.kind;
            if (!kind || !this.startSample || !this.endSample) return;
            const pointerTime = this.pointerTime(event);
            const rawTime = (kind === 'start' || kind === 'end')
                ? pointerTime - this.activeDrag.grabOffset
                : pointerTime;
            const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
            let previewTime = rawTime;

            if (kind === 'start') {
                const { minimum, maximum } = ClipExportService.startHandleBounds(
                    endBoundary,
                    this.session.firstTimestamp
                );
                this.activeDrag.time = this.clamp(rawTime, minimum, maximum);
                previewTime = this.activeDrag.time;
                this.renderTimelineDraft(this.activeDrag.time, endBoundary, previewTime);
            } else if (kind === 'end') {
                const { minimum, maximum } = ClipExportService.endHandleBounds(
                    this.startSample.timestamp,
                    this.session.duration
                );
                this.activeDrag.time = this.clamp(rawTime, minimum, maximum);
                previewTime = Math.max(this.startSample.timestamp, this.activeDrag.time - 0.000001);
                this.renderTimelineDraft(this.startSample.timestamp, this.activeDrag.time, previewTime);
            } else if (kind === 'segment') {
                const draft = ClipExportService.repositionSelectionFromStart(
                    rawTime - this.activeDrag.grabOffset,
                    this.activeDrag.duration,
                    this.session.firstTimestamp,
                    this.session.duration
                );
                Object.assign(this.activeDrag, draft);
                previewTime = this.activeDrag.fixedPlayhead;
                this.renderTimelineDraft(draft.start, draft.endBoundary, previewTime);
            } else {
                this.activeDrag.time = this.clamp(rawTime, this.session.firstTimestamp, this.session.duration);
                previewTime = this.activeDrag.time;
                this.renderTimelineDraft(this.startSample.timestamp, endBoundary, previewTime);
            }

            if (kind !== 'segment') this.queueDragSeek(previewTime);
        }

        async endTimelineDrag(event) {
            if (!this.activeDrag || event.pointerId !== this.activeDrag.pointerId) return;
            const drag = this.activeDrag;
            this.activeDrag = null;
            if (this.dragSeekFrame !== null) cancelAnimationFrame(this.dragSeekFrame);
            this.dragSeekFrame = null;
            this.elements.timeline.classList.remove('clip-timeline--dragging');
            document.body.classList.remove('clip-timeline-dragging');
            if (this.elements.timeline.hasPointerCapture?.(event.pointerId)) {
                this.elements.timeline.releasePointerCapture(event.pointerId);
            }

            this.setBusy(true);
            try {
                if (drag.kind === 'playhead') {
                    await this.scrubExact(drag.time);
                    return;
                }

                if (!drag.moved) {
                    this.updateUi();
                    this.setStatus('');
                    return;
                }

                if (drag.kind === 'segment') {
                    const moved = await this.resolveMovedSelection(drag.start, drag.endBoundary);
                    this.startSample = moved.startSample;
                    this.endSample = moved.endSample;
                    this.currentSample = await this.session.resolveSample(this.media.currentTime);
                    const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
                    this.setTimelineWindow((this.startSample.timestamp + endBoundary) / 2);
                    this.updateUi();
                    this.setStatus('');
                    return;
                }

                const sampleTime = drag.kind === 'end'
                    ? Math.max(this.session.firstTimestamp, drag.time - 0.000001)
                    : drag.time;
                const sample = await this.session.resolveSample(sampleTime);
                await this.applyMarker(drag.kind, sample, { adjustOther: false });
                await this.seekToSample(drag.kind === 'start' ? this.startSample : this.endSample, { pause: false });
                this.setStatus('');
            } catch (error) {
                this.setStatus(error.message, true);
                this.updateUi();
            } finally {
                this.setBusy(false);
            }
        }

        startOverviewDrag(event) {
            if (!this.isOpen || this.isBusy || this.isExporting || event.button > 0 || !this.startSample || !this.endSample) return;
            event.preventDefault();
            this.media.pause();
            this.activeOverviewDrag = {
                pointerId: event.pointerId,
                duration: ClipExportService.selectionDuration(this.startSample, this.endSample, this.session.duration)
            };
            this.elements.overview.setPointerCapture(event.pointerId);
            this.elements.overview.classList.add('clip-overview--dragging');
            document.body.classList.add('clip-timeline-dragging');
            this.updateOverviewDrag(event);
        }

        moveOverviewDrag(event) {
            if (!this.activeOverviewDrag || event.pointerId !== this.activeOverviewDrag.pointerId) return;
            event.preventDefault();
            this.updateOverviewDrag(event);
        }

        updateOverviewDrag(event) {
            if (!this.activeOverviewDrag) return;
            const draft = ClipExportService.repositionSelectionFromStart(
                this.overviewPointerTime(event),
                this.activeOverviewDrag.duration,
                this.session.firstTimestamp,
                this.session.duration
            );
            Object.assign(this.activeOverviewDrag, draft);
            this.setTimelineWindow((draft.start + draft.endBoundary) / 2);
            this.renderTimelineDraft(draft.start, draft.endBoundary, draft.playhead);
            this.queueDragSeek(draft.playhead);
        }

        async endOverviewDrag(event) {
            if (!this.activeOverviewDrag || event.pointerId !== this.activeOverviewDrag.pointerId) return;
            const drag = this.activeOverviewDrag;
            this.activeOverviewDrag = null;
            if (this.dragSeekFrame !== null) cancelAnimationFrame(this.dragSeekFrame);
            this.dragSeekFrame = null;
            this.elements.overview.classList.remove('clip-overview--dragging');
            document.body.classList.remove('clip-timeline-dragging');
            if (this.elements.overview.hasPointerCapture?.(event.pointerId)) {
                this.elements.overview.releasePointerCapture(event.pointerId);
            }

            this.setBusy(true);
            try {
                const moved = await this.resolveMovedSelection(drag.start, drag.endBoundary);
                this.startSample = moved.startSample;
                this.endSample = moved.endSample;
                const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
                this.setTimelineWindow((this.startSample.timestamp + endBoundary) / 2);
                await this.seekToSample(this.startSample, { pause: false });
                // A completed overview scrub defines a new In point. Keep the
                // player and both CTIs on that exact resolved frame.
                this.currentSample = this.startSample;
                this.updateUi();
                this.updatePlayhead(this.startSample.timestamp);
                this.setStatus('');
            } catch (error) {
                this.setStatus(error.message, true);
                this.updateUi();
            } finally {
                this.setBusy(false);
            }
        }

        cancelTimelineDrag() {
            if (this.activeDrag) {
                const pointerId = this.activeDrag.pointerId;
                this.activeDrag = null;
                if (this.elements?.timeline?.hasPointerCapture?.(pointerId)) {
                    this.elements.timeline.releasePointerCapture(pointerId);
                }
                this.elements?.timeline?.classList.remove('clip-timeline--dragging');
            }
            if (this.activeOverviewDrag) {
                const pointerId = this.activeOverviewDrag.pointerId;
                this.activeOverviewDrag = null;
                if (this.elements?.overview?.hasPointerCapture?.(pointerId)) {
                    this.elements.overview.releasePointerCapture(pointerId);
                }
                this.elements?.overview?.classList.remove('clip-overview--dragging');
            }
            if (this.dragSeekFrame !== null) cancelAnimationFrame(this.dragSeekFrame);
            this.dragSeekFrame = null;
            document.body.classList.remove('clip-timeline-dragging');
        }

        pointerTime(event) {
            const bounds = this.elements.timeline.getBoundingClientRect();
            const ratio = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0;
            return this.viewStart + this.clamp(ratio, 0, 1) * (this.viewEnd - this.viewStart);
        }

        getTimelineDragKind(event) {
            const bounds = this.elements.timeline.getBoundingClientRect();
            const playheadTime = this.currentSample?.timestamp ?? this.media.currentTime;
            const playheadPercent = ClipExportService.timelinePercent(playheadTime, this.viewStart, this.viewEnd) / 100;
            const playheadX = bounds.left + playheadPercent * bounds.width;
            if (Math.abs(event.clientX - playheadX) <= 18) return 'playhead';

            const time = this.pointerTime(event);
            const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
            return time >= this.startSample.timestamp && time <= endBoundary ? 'segment' : 'playhead';
        }

        overviewPointerTime(event) {
            const bounds = this.elements.overview.getBoundingClientRect();
            const ratio = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0;
            return this.session.firstTimestamp
                + this.clamp(ratio, 0, 1) * (this.session.duration - this.session.firstTimestamp);
        }

        async resolveMovedSelection(startTime, endBoundary) {
            const startSample = await this.session.resolveSample(startTime);
            let endSample = await this.session.resolveSample(Math.max(
                startSample.timestamp,
                endBoundary - 0.000001
            ));
            let validation = ClipExportService.validateSelection(startSample, endSample, this.session.duration);

            for (let attempt = 0; !validation.valid && attempt < 12; attempt += 1) {
                const direction = validation.duration > ClipExportService.MAX_SECONDS ? -1 : 1;
                const adjacent = await this.session.getAdjacentFrame(endSample.timestamp, direction);
                if (!adjacent || Math.abs(adjacent.timestamp - endSample.timestamp) < 0.000001) break;
                endSample = adjacent;
                validation = ClipExportService.validateSelection(startSample, endSample, this.session.duration);
            }
            if (!validation.valid) throw new Error(validation.message);
            return { startSample, endSample };
        }

        queueDragSeek(time) {
            this.pendingDragSeek = time;
            if (this.dragSeekFrame !== null) return;
            this.dragSeekFrame = requestAnimationFrame(() => {
                this.dragSeekFrame = null;
                if (!this.isOpen) return;
                this.media.currentTime = this.clamp(this.pendingDragSeek, 0, this.media.duration || this.pendingDragSeek);
            });
        }

        renderTimelineDraft(startTime, endBoundary, playheadTime) {
            this.setTimelinePositions(startTime, endBoundary, playheadTime);
            this.setOverviewPositions(startTime, endBoundary, playheadTime);
            this.elements.start.textContent = this.formatTime(startTime);
            this.elements.end.textContent = this.formatTime(Math.max(startTime, endBoundary - 0.000001));
            this.elements.duration.textContent = `${Math.max(0, endBoundary - startTime).toFixed(3)}s`;
            this.elements.playhead.textContent = this.formatTime(playheadTime);
        }

        async stepFrame(direction) {
            if (!this.currentSample || this.isExporting) return;
            const operation = ++this.seekGeneration;
            this.media.pause();
            this.setBusy(true);
            try {
                const exactCurrent = await this.session.resolveSample(this.media.currentTime);
                const sample = await this.session.getAdjacentFrame(exactCurrent.timestamp, direction);
                if (operation !== this.seekGeneration) return;
                await this.seekToSample(sample, { pause: false });
                this.setStatus('');
            } catch (error) {
                this.setStatus(error.message, true);
            } finally {
                this.setBusy(false);
            }
        }

        async scrubExact(time) {
            if (this.isExporting) return;
            const operation = ++this.seekGeneration;
            try {
                const sample = await this.session.resolveSample(time);
                if (operation !== this.seekGeneration) return;
                await this.seekToSample(sample, { pause: false });
                this.setStatus('');
            } catch (error) {
                this.setStatus(error.message, true);
            }
        }

        async seekToSample(sample, { pause = true } = {}) {
            if (pause) this.media.pause();
            this.currentSample = sample;
            await this.seekMedia(sample.timestamp);
            this.updatePlayhead(sample.timestamp);
        }

        seekMedia(time) {
            const target = this.clamp(time, 0, this.media.duration || time);
            if (Math.abs(this.media.currentTime - target) < 0.0005 && this.media.readyState >= 2) {
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => finish(new Error('That frame took too long to load.')), 8000);
                const finish = error => {
                    clearTimeout(timeout);
                    this.media.removeEventListener('seeked', onSeeked);
                    this.media.removeEventListener('error', onError);
                    error ? reject(error) : resolve();
                };
                const onSeeked = () => finish();
                const onError = () => finish(new Error('That frame could not be shown.'));
                this.media.addEventListener('seeked', onSeeked, { once: true });
                this.media.addEventListener('error', onError, { once: true });
                this.media.currentTime = target;
            });
        }

        async togglePlayback() {
            if (this.isExporting) return;
            if (!this.media.paused) {
                this.media.pause();
                await this.syncCurrentSample();
                return;
            }

            const validation = ClipExportService.validateSelection(this.startSample, this.endSample, this.session.duration);
            if (!validation.valid) {
                this.setStatus(validation.message, true);
                return;
            }
            const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
            if (this.media.currentTime < this.startSample.timestamp || this.media.currentTime >= endBoundary - 0.002) {
                await this.seekToSample(this.startSample, { pause: false });
            }
            try {
                await this.media.play();
                this.setStatus('');
            } catch (error) {
                this.setStatus('Playback could not start.', true);
            }
        }

        startPlaybackMonitor() {
            if (!this.isOpen || this.media.paused) return;
            this.stopPlaybackMonitor();
            const generation = ++this.playbackMonitorGeneration;
            const tick = (_now, metadata = null) => {
                if (generation !== this.playbackMonitorGeneration || !this.isOpen || this.media.paused) return;
                this.playbackMonitorId = null;
                this.handlePlaybackTick(metadata?.mediaTime ?? this.media.currentTime);
                if (generation !== this.playbackMonitorGeneration || !this.isOpen || this.media.paused) return;
                this.schedulePlaybackMonitor(tick);
            };
            this.schedulePlaybackMonitor(tick);
        }

        schedulePlaybackMonitor(callback) {
            if (typeof this.media.requestVideoFrameCallback === 'function') {
                this.playbackMonitorType = 'video-frame';
                this.playbackMonitorId = this.media.requestVideoFrameCallback(callback);
            } else {
                this.playbackMonitorType = 'animation-frame';
                this.playbackMonitorId = requestAnimationFrame(now => callback(now, null));
            }
        }

        stopPlaybackMonitor() {
            this.playbackMonitorGeneration += 1;
            clearTimeout(this.playbackBoundaryTimer);
            this.playbackBoundaryTimer = null;
            if (this.playbackMonitorId === null) return;
            if (this.playbackMonitorType === 'video-frame'
                && typeof this.media.cancelVideoFrameCallback === 'function') {
                this.media.cancelVideoFrameCallback(this.playbackMonitorId);
            } else if (this.playbackMonitorType === 'animation-frame') {
                cancelAnimationFrame(this.playbackMonitorId);
            }
            this.playbackMonitorId = null;
            this.playbackMonitorType = null;
        }

        handlePlaybackTick(time = this.media.currentTime) {
            if (!this.isOpen || this.activeDrag || this.activeOverviewDrag || !this.startSample || !this.endSample) return;
            if (this.loopRestartPending) return;
            const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
            if (!this.media.paused && time >= endBoundary - 0.0005) {
                this.finishSelectionPlayback();
                return;
            }
            if (!this.media.paused && time >= this.endSample.timestamp - 0.0005) {
                this.scheduleSelectionBoundary(endBoundary, time);
            }
            this.updatePlayhead(time);
        }

        scheduleSelectionBoundary(endBoundary, observedTime) {
            if (this.playbackBoundaryTimer !== null) return;
            const playbackRate = Math.max(0.01, Math.abs(this.media.playbackRate || 1));
            const delay = Math.max(0, ((endBoundary - observedTime) / playbackRate) * 1000);
            this.playbackBoundaryTimer = setTimeout(() => {
                this.playbackBoundaryTimer = null;
                if (!this.isOpen || this.media.paused) return;
                if (this.media.currentTime < endBoundary - 0.002) {
                    this.scheduleSelectionBoundary(endBoundary, this.media.currentTime);
                    return;
                }
                this.finishSelectionPlayback();
            }, delay);
        }

        finishSelectionPlayback() {
            clearTimeout(this.playbackBoundaryTimer);
            this.playbackBoundaryTimer = null;
            if (this.isLooping) {
                void this.restartLoopFromExactStart();
            } else {
                this.media.pause();
                this.currentSample = this.endSample;
                this.media.currentTime = this.endSample.timestamp;
                this.updatePlayhead(this.endSample.timestamp);
            }
        }

        async restartLoopFromExactStart() {
            if (this.loopRestartPending || !this.isOpen || !this.startSample) return;
            this.loopRestartPending = true;
            this.stopPlaybackMonitor();
            this.media.pause();
            try {
                await this.seekToSample(this.startSample, { pause: false });
                if (this.isOpen && this.isLooping) await this.media.play();
            } catch (error) {
                this.setStatus('Loop playback could not restart.', true);
            } finally {
                this.loopRestartPending = false;
                this.updatePlaybackButton();
                if (this.isOpen && !this.media.paused) this.startPlaybackMonitor();
            }
        }

        async syncCurrentSample() {
            if (!this.session || !this.isOpen) return;
            try {
                this.currentSample = await this.session.resolveSample(this.media.currentTime);
                this.updatePlayhead(this.currentSample.timestamp);
            } catch (error) {
                console.info('[Clip Export] Could not snap paused playback to a frame:', error.message);
            }
        }

        toggleLoop() {
            this.isLooping = !this.isLooping;
            this.updateLoopButton();
            this.setStatus('');
        }

        updateLoopButton() {
            if (!this.elements?.loop) return;
            this.elements.loop.setAttribute('aria-pressed', String(this.isLooping));
            this.elements.loop.classList.toggle('clip-loop--active', this.isLooping);
        }

        updatePlaybackButton() {
            if (!this.elements?.play) return;
            const isPlaying = !this.media.paused || this.loopRestartPending;
            this.elements.play.innerHTML = `${isPlaying ? ICONS.pause : ICONS.play}<span class="clip-tooltip" role="tooltip">${isPlaying ? 'Pause' : 'Play'}</span>`;
            this.elements.play.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play selected range');
            this.elements.play.setAttribute('title', isPlaying ? 'Pause' : 'Play selected range');
        }

        async setMarker(kind) {
            if (this.isExporting) return;
            this.media.pause();
            this.setBusy(true);
            try {
                const sample = await this.session.resolveSample(this.media.currentTime);
                this.currentSample = sample;
                await this.applyMarker(kind, sample);
                await this.seekToSample(kind === 'start' ? this.startSample : this.endSample, { pause: false });
                this.setStatus('');
            } catch (error) {
                this.setStatus(error.message, true);
            } finally {
                this.setBusy(false);
            }
        }

        async applyMarker(kind, sample, { adjustOther = true } = {}) {
            let nextStart = kind === 'start' ? sample : this.startSample;
            let nextEnd = kind === 'end' ? sample : this.endSample;
            let validation = ClipExportService.validateSelection(nextStart, nextEnd, this.session.duration);
            if (validation.valid) {
                this.startSample = nextStart;
                this.endSample = nextEnd;
                this.updateUi();
                return;
            }

            if (!adjustOther) {
                let candidate = sample;
                for (let attempt = 0; attempt < 12 && !validation.valid; attempt += 1) {
                    const direction = kind === 'end'
                        ? (validation.duration > ClipExportService.MAX_SECONDS ? -1 : 1)
                        : (validation.duration > ClipExportService.MAX_SECONDS ? 1 : -1);
                    const adjacent = await this.session.getAdjacentFrame(candidate.timestamp, direction);
                    if (!adjacent || Math.abs(adjacent.timestamp - candidate.timestamp) < 0.000001) break;
                    candidate = adjacent;
                    nextStart = kind === 'start' ? candidate : this.startSample;
                    nextEnd = kind === 'end' ? candidate : this.endSample;
                    validation = ClipExportService.validateSelection(nextStart, nextEnd, this.session.duration);
                }
                if (!validation.valid) throw new Error(validation.message);
                this.startSample = nextStart;
                this.endSample = nextEnd;
                this.updateUi();
                return;
            }

            if (kind === 'start') {
                const latestUsableStart = Math.max(this.session.firstTimestamp, this.session.duration - ClipExportService.MIN_SECONDS);
                if (nextStart.timestamp > latestUsableStart) {
                    nextStart = await this.session.resolveSample(latestUsableStart);
                }
                const desiredBoundary = Math.min(
                    this.session.duration,
                    nextStart.timestamp + ClipExportService.DEFAULT_SECONDS
                );
                nextEnd = await this.session.resolveSample(Math.max(nextStart.timestamp, desiredBoundary - 0.000001));
            } else {
                let endBoundary = ClipExportService.inclusiveEnd(nextEnd, this.session.duration);
                if (endBoundary < this.session.firstTimestamp + ClipExportService.MIN_SECONDS) {
                    nextEnd = await this.session.resolveSample(this.session.firstTimestamp + ClipExportService.MIN_SECONDS - 0.000001);
                    endBoundary = ClipExportService.inclusiveEnd(nextEnd, this.session.duration);
                }
                nextStart = await this.session.resolveSample(Math.max(
                    this.session.firstTimestamp,
                    endBoundary - ClipExportService.DEFAULT_SECONDS
                ));
            }

            validation = ClipExportService.validateSelection(nextStart, nextEnd, this.session.duration);
            if (!validation.valid && validation.duration > ClipExportService.MAX_SECONDS) {
                if (kind === 'start') {
                    nextEnd = await this.session.resolveSample(nextStart.timestamp + ClipExportService.MAX_SECONDS - 0.000001);
                } else {
                    nextStart = await this.session.resolveSample(
                        ClipExportService.inclusiveEnd(nextEnd, this.session.duration) - ClipExportService.MAX_SECONDS + 0.000001
                    );
                }
                validation = ClipExportService.validateSelection(nextStart, nextEnd, this.session.duration);
            }
            if (!validation.valid) throw new Error(validation.message);

            this.startSample = nextStart;
            this.endSample = nextEnd;
            this.updateUi();
        }

        async export() {
            if (this.isExporting) return;
            const validation = ClipExportService.validateSelection(this.startSample, this.endSample, this.session.duration);
            if (!validation.valid) {
                this.setStatus(validation.message, true);
                return;
            }

            this.media.pause();
            this.isExporting = true;
            this.abortController = new AbortController();
            this.setBusy(true);
            this.elements.progress.hidden = false;
            this.elements.progressBar.style.width = '0%';
            this.elements.cancelExport.hidden = false;
            this.setStatus('Preparing your MP4…');

            try {
                const result = await this.service.exportClip({
                    session: this.session,
                    startSample: this.startSample,
                    endSample: this.endSample,
                    signal: this.abortController.signal,
                    onProgress: progress => {
                        const percent = Math.round(progress * 100);
                        if (this.elements?.progressBar) this.elements.progressBar.style.width = `${percent}%`;
                        this.setStatus(`Exporting MP4… ${percent}%`);
                    }
                });
                this.revokeDownload();
                this.downloadUrl = URL.createObjectURL(result.blob);
                const filename = ClipExportService.createFilename(
                    this.getSourceTitle(),
                    result.startTime,
                    result.endTime
                );
                const link = document.createElement('a');
                link.href = this.downloadUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                if (this.elements?.progressBar) this.elements.progressBar.style.width = '100%';
                this.setStatus(`Downloaded ${filename}`, false, { autoHide: true });
            } catch (error) {
                const wasCancelled = error.name === 'AbortError';
                this.setStatus(
                    wasCancelled ? 'Export cancelled.' : (error.message || 'The MP4 could not be exported.'),
                    !wasCancelled,
                    { autoHide: wasCancelled }
                );
            } finally {
                this.isExporting = false;
                this.abortController = null;
                if (this.elements) {
                    this.elements.cancelExport.hidden = true;
                    this.elements.progress.hidden = true;
                }
                this.setBusy(false);
            }
        }

        updateUi() {
            if (!this.startSample || !this.endSample || !this.elements) return;
            const endBoundary = ClipExportService.inclusiveEnd(this.endSample, this.session.duration);
            const duration = endBoundary - this.startSample.timestamp;
            this.ensureSelectionVisible(this.startSample.timestamp, endBoundary);
            this.elements.start.textContent = this.formatTime(this.startSample.timestamp);
            this.elements.end.textContent = this.formatTime(this.endSample.timestamp);
            this.elements.duration.textContent = `${duration.toFixed(3)}s`;
            this.setTimelinePositions(this.startSample.timestamp, endBoundary, this.currentSample?.timestamp ?? this.media.currentTime);
            this.setOverviewPositions(this.startSample.timestamp, endBoundary, this.currentSample?.timestamp ?? this.media.currentTime);
            this.elements.export.disabled = !ClipExportService.validateSelection(
                this.startSample,
                this.endSample,
                this.session.duration
            ).valid;
            this.updatePlaybackButton();
        }

        updatePlayhead(time) {
            if (!this.elements || !this.session) return;
            const safeTime = this.clamp(time, this.session.firstTimestamp, this.session.duration);
            const percent = ClipExportService.timelinePercent(safeTime, this.viewStart, this.viewEnd);
            this.elements.timeline.style.setProperty('--clip-playhead', `${percent}%`);
            this.elements.overview.style.setProperty('--overview-playhead', `${ClipExportService.timelinePercent(
                safeTime,
                this.session.firstTimestamp,
                this.session.duration
            )}%`);
            this.elements.playhead.textContent = this.formatTime(safeTime);
        }

        setTimelinePositions(startTime, endBoundary, playheadTime) {
            this.elements.timeline.style.setProperty('--clip-start', `${ClipExportService.timelinePercent(startTime, this.viewStart, this.viewEnd)}%`);
            this.elements.timeline.style.setProperty('--clip-end', `${ClipExportService.timelinePercent(endBoundary, this.viewStart, this.viewEnd)}%`);
            this.elements.timeline.style.setProperty('--clip-playhead', `${ClipExportService.timelinePercent(playheadTime, this.viewStart, this.viewEnd)}%`);
            this.setTimelineColourMaps();
        }

        setTimelineColourMaps() {
            if (!this.session || !this.elements) return;
            const first = this.session.firstTimestamp;
            const end = this.session.duration;
            this.elements.overview.style.setProperty('--clip-colour-map', this.colourMapForRange(first, end));
            this.elements.timeline.style.setProperty('--clip-colour-map', this.colourMapForRange(this.viewStart, this.viewEnd));
        }

        colourMapForRange(rangeStart, rangeEnd) {
            const first = this.session.firstTimestamp;
            const duration = this.session.duration;
            const sourceSpan = Math.max(0.000001, duration - first);
            const start = this.clamp((rangeStart - first) / sourceSpan, 0, 1);
            const end = this.clamp((rangeEnd - first) / sourceSpan, start, 1);
            const span = Math.max(0.000001, end - start);
            const stops = [
                { position: 0, colour: this.colourAtTimelinePosition(start) },
                ...TIMELINE_COLOUR_STOPS
                    .filter(stop => stop.position > start && stop.position < end)
                    .map(stop => ({
                        position: ((stop.position - start) / span) * 100,
                        colour: stop.colour
                    })),
                { position: 100, colour: this.colourAtTimelinePosition(end) }
            ];
            return `linear-gradient(90deg, ${stops
                .map(stop => `${stop.colour} ${stop.position.toFixed(3)}%`)
                .join(', ')})`;
        }

        colourAtTimelinePosition(position) {
            const safePosition = this.clamp(position, 0, 1);
            const upperIndex = TIMELINE_COLOUR_STOPS.findIndex(stop => stop.position >= safePosition);
            const upper = TIMELINE_COLOUR_STOPS[upperIndex < 0 ? TIMELINE_COLOUR_STOPS.length - 1 : upperIndex];
            const lower = TIMELINE_COLOUR_STOPS[Math.max(0, upperIndex - 1)] || upper;
            if (upper.position === lower.position) return upper.colour;

            const amount = (safePosition - lower.position) / (upper.position - lower.position);
            const from = this.hexToRgb(lower.colour);
            const to = this.hexToRgb(upper.colour);
            const channel = index => Math.round(from[index] + (to[index] - from[index]) * amount)
                .toString(16)
                .padStart(2, '0');
            return `#${channel(0)}${channel(1)}${channel(2)}`;
        }

        hexToRgb(colour) {
            return [
                Number.parseInt(colour.slice(1, 3), 16),
                Number.parseInt(colour.slice(3, 5), 16),
                Number.parseInt(colour.slice(5, 7), 16)
            ];
        }

        setOverviewPositions(startTime, endBoundary, playheadTime) {
            const first = this.session.firstTimestamp;
            const end = this.session.duration;
            this.elements.overview.style.setProperty('--overview-start', `${ClipExportService.timelinePercent(startTime, first, end)}%`);
            this.elements.overview.style.setProperty('--overview-end', `${ClipExportService.timelinePercent(endBoundary, first, end)}%`);
            this.elements.overview.style.setProperty('--overview-playhead', `${ClipExportService.timelinePercent(playheadTime, first, end)}%`);
        }

        setTimelineWindow(centerTime) {
            const window = ClipExportService.timelineWindow(
                centerTime,
                this.session.firstTimestamp,
                this.session.duration
            );
            this.viewStart = window.start;
            this.viewEnd = window.end;
        }

        ensureSelectionVisible(startTime, endBoundary) {
            if (startTime >= this.viewStart && endBoundary <= this.viewEnd) return;
            this.setTimelineWindow((startTime + endBoundary) / 2);
        }

        setBusy(busy) {
            this.isBusy = busy;
            this.panel?.querySelectorAll('button').forEach(element => {
                if (element === this.elements.cancelExport
                    || element.matches('[data-clip="close"]')) return;
                element.disabled = busy;
            });
            if (!busy) this.updateUi();
        }

        setStatus(message, isError = false, { autoHide = false } = {}) {
            if (!this.elements?.status) return;
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
            this.elements.status.textContent = message;
            this.elements.status.classList.toggle('clip-status--error', isError);
            this.elements.status.hidden = !message;
            if (message && autoHide) {
                this.statusTimer = setTimeout(() => this.setStatus(''), 2600);
            }
        }

        getSourceTitle() {
            const episodeTitle = document.querySelector('.ep-title')?.textContent?.trim();
            if (episodeTitle) return episodeTitle;
            return document.title.replace(/\s+Chunk Player$/i, '').trim() || 'chunkplayer-clip';
        }

        formatTime(seconds) {
            const safe = Math.max(0, Number(seconds) || 0);
            const minutes = Math.floor(safe / 60);
            return `${minutes}:${(safe % 60).toFixed(3).padStart(6, '0')}`;
        }

        clamp(value, minimum, maximum) {
            return Math.max(minimum, Math.min(value, maximum));
        }

        revokeDownload() {
            if (!this.downloadUrl) return;
            URL.revokeObjectURL(this.downloadUrl);
            this.downloadUrl = null;
        }

        destroy() {
            clearTimeout(this.refreshTimer);
            clearTimeout(this.statusTimer);
            this.stopPlaybackMonitor();
            this.close({ restore: false });
            this.session?.dispose();
            this.media.removeEventListener('loadstart', this.boundSourceChange);
            this.media.removeEventListener('loadedmetadata', this.boundSourceChange);
            this.media.removeEventListener('emptied', this.boundSourceChange);
            this.media.removeEventListener('timeupdate', this.boundPlaybackTick);
            this.media.removeEventListener('play', this.boundPlaybackState);
            this.media.removeEventListener('pause', this.boundPlaybackState);
            document.removeEventListener('keydown', this.boundKeydown);
            this.removeControl();
        }
    }

    document.addEventListener('ready', event => {
        const player = event.detail?.plyr;
        if (!player?.media || player.media.id !== 'videoPlayer') return;
        if (player.clipExporter) player.clipExporter.destroy();
        player.clipExporter = new PlyrClipExporter(player);
    });
})(typeof document !== 'undefined' ? document : null);
