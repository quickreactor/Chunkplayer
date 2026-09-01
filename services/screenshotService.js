// ====================
// MEDIABUNNY SCREENSHOT SERVICE
// ====================

class ScreenshotService {
    static async captureFrame(sourceUrl, timestamp, scope = globalThis) {
        if (!sourceUrl) throw new Error('There is no video source to capture.');
        if (!globalThis.ClipExportService) throw new Error('The media toolkit is unavailable.');

        const library = await ClipExportService.loadLibrary();
        const input = new library.Input({
            formats: library.ALL_FORMATS,
            source: new library.UrlSource(sourceUrl, {
                maxCacheSize: 8 * 1024 * 1024,
                parallelism: 2,
                requestInit: { mode: 'cors' }
            })
        });

        try {
            const track = await input.getPrimaryVideoTrack();
            if (!track || !(await track.canDecode())) {
                throw new Error('This video cannot be decoded for a screenshot.');
            }

            const userAgent = scope.navigator?.userAgent || '';
            const isFirefoxAndroid = /Android/i.test(userAgent) && /Firefox/i.test(userAgent);
            const sinkOptions = { alpha: false };
            if (isFirefoxAndroid) {
                // Firefox Android can expose hardware-decoded H.264/VP9 frames
                // as black pixels when they are copied to a canvas.
                sinkOptions.decoderOptions = { hardwareAcceleration: 'prefer-software' };
            }
            const sink = new library.CanvasSink(track, sinkOptions);
            const firstTimestamp = await track.getFirstTimestamp();
            const requestedTimestamp = Number.isFinite(timestamp)
                ? Math.max(firstTimestamp, timestamp)
                : firstTimestamp;
            const wrappedCanvas = await sink.getCanvas(requestedTimestamp);
            if (!wrappedCanvas?.canvas) throw new Error('That video frame could not be read.');

            const blob = await ScreenshotService.canvasToPng(wrappedCanvas.canvas);
            return {
                blob,
                timestamp: wrappedCanvas.timestamp,
                width: wrappedCanvas.canvas.width,
                height: wrappedCanvas.canvas.height,
                method: 'mediabunny'
            };
        } finally {
            input.dispose();
        }
    }

    static canvasToPng(canvas) {
        if (typeof canvas.convertToBlob === 'function') {
            return canvas.convertToBlob({ type: 'image/png' });
        }
        if (typeof canvas.toBlob !== 'function') {
            throw new Error('This browser cannot create a PNG screenshot.');
        }
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('The screenshot PNG was empty.'));
            }, 'image/png');
        });
    }

    static captureDisplayedFrame(video, documentScope = document) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) throw new Error('The video frame is not ready yet.');

        const canvas = Object.assign(documentScope.createElement('canvas'), { width, height });
        const context = canvas.getContext('2d', { alpha: false });
        context.drawImage(video, 0, 0, width, height);
        return ScreenshotService.canvasToPng(canvas).then(blob => ({
            blob,
            timestamp: video.currentTime,
            width,
            height,
            method: 'display-fallback'
        }));
    }
}

if (typeof window !== 'undefined') window.ScreenshotService = ScreenshotService;
if (typeof module !== 'undefined' && module.exports) module.exports = { ScreenshotService };
