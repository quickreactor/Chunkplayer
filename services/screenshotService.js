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

    static async captureDisplayedFrameWebGL(video, sourceUrl, timestamp, documentScope = document) {
        let captureVideo = video;
        let detachedVideo = null;

        if (sourceUrl) {
            detachedVideo = documentScope.createElement('video');
            detachedVideo.crossOrigin = 'anonymous';
            detachedVideo.preload = 'auto';
            detachedVideo.muted = true;
            detachedVideo.playsInline = true;
            detachedVideo.src = sourceUrl;
            await ScreenshotService.waitForMediaState(
                detachedVideo,
                'loadedmetadata',
                () => detachedVideo.readyState >= 1,
                10000
            );
            const targetTime = Number.isFinite(timestamp)
                ? Math.min(Math.max(0, timestamp), Number.isFinite(detachedVideo.duration) ? detachedVideo.duration : timestamp)
                : 0;
            if (Math.abs(detachedVideo.currentTime - targetTime) > 0.001) {
                const seeked = ScreenshotService.waitForMediaState(
                    detachedVideo,
                    'seeked',
                    () => !detachedVideo.seeking && Math.abs(detachedVideo.currentTime - targetTime) <= 0.05,
                    10000
                );
                detachedVideo.currentTime = targetTime;
                await seeked;
            }
            await ScreenshotService.waitForMediaState(
                detachedVideo,
                'loadeddata',
                () => detachedVideo.readyState >= 2,
                10000
            );
            captureVideo = detachedVideo;
        }

        const width = captureVideo.videoWidth;
        const height = captureVideo.videoHeight;
        if (!width || !height) throw new Error('The video frame is not ready yet.');

        const canvas = Object.assign(documentScope.createElement('canvas'), { width, height });
        const gl = canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: true
        });
        if (!gl) throw new Error('WebGL is unavailable for video capture.');

        const vertexSource = `
            attribute vec2 position;
            attribute vec2 textureCoordinate;
            varying vec2 videoCoordinate;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
                videoCoordinate = textureCoordinate;
            }
        `;
        const fragmentSource = `
            precision mediump float;
            uniform sampler2D videoTexture;
            varying vec2 videoCoordinate;
            void main() {
                gl_FragColor = texture2D(videoTexture, videoCoordinate);
            }
        `;

        const compileShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const message = gl.getShaderInfoLog(shader) || 'unknown shader error';
                gl.deleteShader(shader);
                throw new Error(`WebGL shader failed: ${message}`);
            }
            return shader;
        };

        const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`WebGL program failed: ${gl.getProgramInfoLog(program) || 'unknown link error'}`);
        }

        const createBuffer = (attribute, values) => {
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
            const location = gl.getAttribLocation(program, attribute);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
            return buffer;
        };

        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        const positionBuffer = createBuffer('position', [-1, -1, 1, -1, -1, 1, 1, 1]);
        const textureBuffer = createBuffer('textureCoordinate', [0, 0, 1, 0, 0, 1, 1, 1]);
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, captureVideo);
        const uploadError = gl.getError();
        if (uploadError !== gl.NO_ERROR) throw new Error(`WebGL video upload failed (${uploadError}).`);

        gl.uniform1i(gl.getUniformLocation(program, 'videoTexture'), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.finish();

        const blob = await ScreenshotService.canvasToPng(canvas);

        gl.deleteTexture(texture);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(textureBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        const result = {
            blob,
            timestamp: captureVideo.currentTime,
            width,
            height,
            method: 'webgl-fallback'
        };
        if (detachedVideo) {
            detachedVideo.removeAttribute('src');
            detachedVideo.load();
        }
        return result;
    }

    static waitForMediaState(media, eventName, ready, timeoutMs) {
        if (ready()) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => finish(new Error(`Detached video timed out at ${eventName}.`)), timeoutMs);
            const onReady = () => ready() && finish();
            const onError = () => finish(new Error(`Detached video failed at ${eventName}: ${media.error?.message || 'media error'}`));
            const finish = error => {
                clearTimeout(timeout);
                media.removeEventListener(eventName, onReady);
                media.removeEventListener('error', onError);
                if (error) reject(error);
                else resolve();
            };
            media.addEventListener(eventName, onReady);
            media.addEventListener('error', onError, { once: true });
        });
    }

}

if (typeof window !== 'undefined') window.ScreenshotService = ScreenshotService;
if (typeof module !== 'undefined' && module.exports) module.exports = { ScreenshotService };
