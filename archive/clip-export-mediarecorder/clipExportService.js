// Archived canvas/MediaRecorder clip exporter (superseded by Mediabunny).
// ====================
// CLIP EXPORT SERVICE
// ====================

/**
 * Records a short, silent loop video from a remote video source.
 * The source must be CORS-enabled so it can be drawn to a canvas.
 */
class ClipExportService {
    static MIME_CANDIDATES = [
        { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4', label: 'MP4' },
        { mimeType: 'video/mp4', extension: 'mp4', label: 'MP4' },
        { mimeType: 'video/webm;codecs=vp9', extension: 'webm', label: 'WebM' },
        { mimeType: 'video/webm;codecs=vp8', extension: 'webm', label: 'WebM' },
        { mimeType: 'video/webm', extension: 'webm', label: 'WebM' }
    ];

    static COMMON_FRAME_RATES = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

    /**
     * Fit a source inside the export box while retaining its aspect ratio.
     * Even dimensions avoid codec failures in H.264 implementations.
     */
    static fitWithin(width, height, maxWidth = 854, maxHeight = 480) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            throw new Error('The video dimensions are not available yet.');
        }

        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        const makeEven = value => Math.max(2, Math.floor(value / 2) * 2);
        return {
            width: makeEven(width * scale),
            height: makeEven(height * scale)
        };
    }

    /** Snap a measured cadence to a familiar source rate when it is close. */
    static snapSourceFps(fps) {
        if (!Number.isFinite(fps) || fps <= 0) return 24;

        const nearest = this.COMMON_FRAME_RATES.reduce((best, candidate) => (
            Math.abs(candidate - fps) < Math.abs(best - fps) ? candidate : best
        ));

        return Math.abs(nearest - fps) / nearest <= 0.01
            ? nearest
            : Math.round(fps * 1000) / 1000;
    }

    /** Keep source cadence, but use integer nominal rates for NTSC-style values. */
    static normaliseExportFps(sourceFps) {
        const snapped = this.snapSourceFps(sourceFps);
        if (Math.abs(snapped - 23.976) < 0.01) return 24;
        if (Math.abs(snapped - 29.97) < 0.01) return 30;
        if (Math.abs(snapped - 59.94) < 0.01) return 60;
        return snapped;
    }

    static getSupportedOutputs(MediaRecorderClass = globalThis.MediaRecorder) {
        if (!MediaRecorderClass) return [];
        if (typeof MediaRecorderClass.isTypeSupported !== 'function') {
            return [this.MIME_CANDIDATES[this.MIME_CANDIDATES.length - 1]];
        }
        return this.MIME_CANDIDATES.filter(candidate => (
            MediaRecorderClass.isTypeSupported(candidate.mimeType)
        ));
    }

    static getPreferredOutput(MediaRecorderClass = globalThis.MediaRecorder) {
        return this.getSupportedOutputs(MediaRecorderClass)[0] || null;
    }

    static createFilename(title, startTime, endTime, extension) {
        const safeTitle = String(title || 'chunkplayer-clip')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 70) || 'chunkplayer-clip';
        const compactTime = value => `${Math.max(0, value).toFixed(3).replace('.', 's')}`;
        return `${safeTitle}-${compactTime(startTime)}-${compactTime(endTime)}.${extension}`;
    }

    /**
     * @param {Object} options
     * @param {string} options.sourceUrl
     * @param {number} options.startTime First included frame timestamp
     * @param {number} options.endTime Last included frame timestamp
     * @param {number} options.sourceFps
     * @param {AbortSignal} [options.signal]
     * @param {Function} [options.onProgress]
     */
    async exportClip({ sourceUrl, startTime, endTime, sourceFps, signal, onProgress = () => {} }) {
        if (!sourceUrl) throw new Error('There is no video source to export.');
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
            throw new Error('Choose a valid clip range before exporting.');
        }
        if (signal?.aborted) throw this.createAbortError();
        if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
            throw new Error('This browser cannot create loop videos.');
        }

        const outputCandidates = ClipExportService.getSupportedOutputs();
        if (!outputCandidates.length) {
            throw new Error('This browser does not provide a supported video encoder.');
        }

        const exportFps = ClipExportService.normaliseExportFps(sourceFps);
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        let stream = null;
        let recorder = null;
        let frameCallbackId = null;
        let animationFrameId = null;
        let timeoutId = null;
        let abortHandler = null;

        const cleanup = () => {
            if (frameCallbackId !== null && typeof video.cancelVideoFrameCallback === 'function') {
                video.cancelVideoFrameCallback(frameCallbackId);
            }
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            if (timeoutId !== null) clearTimeout(timeoutId);
            if (abortHandler && signal) signal.removeEventListener('abort', abortHandler);
            video.pause();
            if (recorder && recorder.state !== 'inactive') {
                try { recorder.stop(); } catch (error) { /* Recorder is already stopping. */ }
            }
            stream?.getTracks().forEach(track => track.stop());
            video.removeAttribute('src');
            video.load();
        };

        try {
            video.src = sourceUrl;
            await this.waitForEvent(video, 'loadedmetadata', signal, 15000, 'The video could not be loaded for export.');

            const dimensions = ClipExportService.fitWithin(video.videoWidth, video.videoHeight);
            const canvas = document.createElement('canvas');
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;
            const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
            if (!context) throw new Error('The browser could not prepare the export canvas.');

            await this.seek(video, Math.max(0, Math.min(startTime, video.duration)), signal);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
                context.getImageData(0, 0, 1, 1);
            } catch (error) {
                throw new Error('This video storage source does not allow browser clip export. Check its CORS settings.');
            }

            if (typeof canvas.captureStream !== 'function') {
                throw new Error('This browser cannot record a video canvas.');
            }
            stream = canvas.captureStream(exportFps);

            let selectedOutput = null;
            for (const candidate of outputCandidates) {
                try {
                    recorder = new MediaRecorder(stream, {
                        mimeType: candidate.mimeType,
                        videoBitsPerSecond: 2500000
                    });
                    selectedOutput = candidate;
                    break;
                } catch (error) {
                    recorder = null;
                }
            }
            if (!recorder || !selectedOutput) {
                throw new Error('The browser could not start a compatible video encoder.');
            }

            const chunks = [];
            recorder.addEventListener('dataavailable', event => {
                if (event.data?.size) chunks.push(event.data);
            });

            const recordingComplete = new Promise((resolve, reject) => {
                let finishing = false;
                const finish = () => {
                    if (finishing) return;
                    finishing = true;
                    video.pause();
                    onProgress(1);
                    if (recorder.state !== 'inactive') recorder.stop();
                };

                recorder.addEventListener('stop', () => {
                    const mimeType = recorder.mimeType || selectedOutput.mimeType;
                    const blob = new Blob(chunks, { type: mimeType });
                    if (!blob.size) {
                        reject(new Error('The browser produced an empty clip.'));
                        return;
                    }
                    resolve({
                        blob,
                        mimeType,
                        extension: selectedOutput.extension,
                        label: selectedOutput.label,
                        sourceFps: ClipExportService.snapSourceFps(sourceFps),
                        exportFps,
                        width: canvas.width,
                        height: canvas.height
                    });
                }, { once: true });
                recorder.addEventListener('error', event => {
                    finishing = true;
                    reject(event.error || new Error('The browser video encoder failed.'));
                }, { once: true });

                abortHandler = () => {
                    finishing = true;
                    if (recorder.state !== 'inactive') recorder.stop();
                    reject(this.createAbortError());
                };
                signal?.addEventListener('abort', abortHandler, { once: true });

                const drawFrame = mediaTime => {
                    if (finishing) return;
                    const halfFrame = 0.5 / Math.max(1, sourceFps || 24);
                    if (mediaTime > endTime + halfFrame) {
                        finish();
                        return;
                    }
                    if (mediaTime + halfFrame >= startTime) {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const progress = (mediaTime - startTime) / (endTime - startTime);
                        onProgress(Math.max(0, Math.min(0.99, progress)));
                    }
                };

                if (typeof video.requestVideoFrameCallback === 'function') {
                    const onFrame = (_now, metadata) => {
                        drawFrame(metadata.mediaTime);
                        if (!finishing) frameCallbackId = video.requestVideoFrameCallback(onFrame);
                    };
                    frameCallbackId = video.requestVideoFrameCallback(onFrame);
                } else {
                    const onAnimationFrame = () => {
                        drawFrame(video.currentTime);
                        if (!finishing) animationFrameId = requestAnimationFrame(onAnimationFrame);
                    };
                    animationFrameId = requestAnimationFrame(onAnimationFrame);
                }

                video.addEventListener('ended', finish, { once: true });
                timeoutId = setTimeout(() => {
                    if (!finishing) {
                        finishing = true;
                        video.pause();
                        if (recorder.state !== 'inactive') recorder.stop();
                        reject(new Error('The video stopped responding during export.'));
                    }
                }, Math.max(15000, (endTime - startTime + 10) * 1000));
            });

            recorder.start(250);
            await video.play();
            return await recordingComplete;
        } finally {
            cleanup();
        }
    }

    waitForEvent(target, eventName, signal, timeoutMs, failureMessage) {
        return new Promise((resolve, reject) => {
            let timeoutId;
            const cleanup = () => {
                clearTimeout(timeoutId);
                target.removeEventListener(eventName, handleSuccess);
                target.removeEventListener('error', handleError);
                signal?.removeEventListener('abort', handleAbort);
            };
            const handleSuccess = () => { cleanup(); resolve(); };
            const handleError = () => { cleanup(); reject(new Error(failureMessage)); };
            const handleAbort = () => { cleanup(); reject(this.createAbortError()); };

            target.addEventListener(eventName, handleSuccess, { once: true });
            target.addEventListener('error', handleError, { once: true });
            signal?.addEventListener('abort', handleAbort, { once: true });
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(failureMessage));
            }, timeoutMs);
        });
    }

    async seek(video, time, signal) {
        if (signal?.aborted) throw this.createAbortError();
        const target = Math.max(0, Math.min(time, video.duration || time));
        if (Math.abs(video.currentTime - target) < 0.0005 && video.readyState >= 2) return;

        const seeked = this.waitForEvent(video, 'seeked', signal, 8000, 'The selected frame could not be loaded.');
        video.currentTime = target;
        await seeked;
    }

    createAbortError() {
        return new DOMException('Clip export cancelled.', 'AbortError');
    }
}

if (typeof window !== 'undefined') window.ClipExportService = ClipExportService;
if (typeof module !== 'undefined' && module.exports) module.exports = { ClipExportService };
