const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const plugin = fs.readFileSync(path.join(projectRoot, 'utils', 'plyr-plugin-capture.js'), 'utf8');
const styles = fs.readFileSync(path.join(projectRoot, 'screenshot.css'), 'utf8');
const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const { ScreenshotService } = require('../services/screenshotService.js');

test('MediaBunny captures the presented frame through CanvasSink and disposes its input', async () => {
    const png = new Blob(['png'], { type: 'image/png' });
    const calls = { requestedTimestamp: null, disposed: false, source: null, sinkOptions: null };
    const canvas = {
        width: 1920,
        height: 1080,
        convertToBlob: async options => {
            assert.deepEqual(options, { type: 'image/png' });
            return png;
        }
    };
    const track = {
        canDecode: async () => true,
        getFirstTimestamp: async () => 0.25
    };

    class FakeInput {
        constructor(options) {
            calls.source = options.source;
        }
        async getPrimaryVideoTrack() { return track; }
        dispose() { calls.disposed = true; }
    }
    class FakeUrlSource {
        constructor(url, options) {
            this.url = url;
            this.options = options;
        }
    }
    class FakeCanvasSink {
        constructor(receivedTrack, options) {
            assert.equal(receivedTrack, track);
            calls.sinkOptions = options;
        }
        async getCanvas(timestamp) {
            calls.requestedTimestamp = timestamp;
            return { canvas, timestamp: 7.96, duration: 1 / 24 };
        }
    }

    globalThis.ClipExportService = {
        loadLibrary: async () => ({
            ALL_FORMATS: [],
            Input: FakeInput,
            UrlSource: FakeUrlSource,
            CanvasSink: FakeCanvasSink
        })
    };

    try {
        const result = await ScreenshotService.captureFrame('https://media.example/movie.mp4', 8);
        assert.equal(calls.source.url, 'https://media.example/movie.mp4');
        assert.deepEqual(calls.source.options.requestInit, { mode: 'cors' });
        assert.deepEqual(calls.sinkOptions, { alpha: false });
        assert.equal(calls.requestedTimestamp, 8);
        assert.equal(calls.disposed, true);
        assert.equal(result.blob, png);
        assert.equal(result.timestamp, 7.96);
        assert.equal(result.method, 'mediabunny');
    } finally {
        delete globalThis.ClipExportService;
    }
});

test('capture service clamps requests before the track first timestamp', async () => {
    let requestedTimestamp = null;
    class FakeInput {
        async getPrimaryVideoTrack() {
            return { canDecode: async () => true, getFirstTimestamp: async () => 2.5 };
        }
        dispose() {}
    }
    globalThis.ClipExportService = {
        loadLibrary: async () => ({
            ALL_FORMATS: [],
            Input: FakeInput,
            UrlSource: class {},
            CanvasSink: class {
                async getCanvas(timestamp) {
                    requestedTimestamp = timestamp;
                    return {
                        timestamp,
                        canvas: { width: 1, height: 1, convertToBlob: async () => new Blob(['x'], { type: 'image/png' }) }
                    };
                }
            }
        })
    };

    try {
        await ScreenshotService.captureFrame('movie.mp4', 1);
        assert.equal(requestedTimestamp, 2.5);
    } finally {
        delete globalThis.ClipExportService;
    }
});

test('capture starts clipboard delivery with the pending MediaBunny PNG promise', () => {
    const captureMethod = plugin.match(/async capture\(\)\s*\{[\s\S]*?\n        \}/)?.[0] || '';
    assert.match(captureMethod, /const capturePromise = this\.captureWithFallback\(sourceUrl, timestamp\)/);
    assert.match(captureMethod, /this\.copyToClipboard\(capturePromise\.then\(result => result\.blob\)\)/);
    assert.match(plugin, /new ClipboardItem\(\{ 'image\/png': blobPromise \}\)/);
    assert.match(plugin, /navigator\.clipboard\.write\(\[item\]\)/);
    assert.match(plugin, /ScreenshotService\.captureFrame\(sourceUrl, timestamp\)/);
    assert.match(plugin, /ScreenshotService\.captureDisplayedFrame/);
});

test('prepared screenshot reveals native Share and Download controls', () => {
    assert.match(plugin, /dataset\.plyr = action/);
    assert.match(plugin, /createControl\('share-capture'/);
    assert.match(plugin, /createControl\('download-capture'/);
    assert.match(plugin, /navigator\.share\(\{ files: \[completed\.file\] \}\)/);
    assert.match(plugin, /link\.download = this\.completedCapture\.filename/);
    assert.match(plugin, /Screenshot copied — Share or Download/);
    assert.match(styles, /\.screenshot-delivery-control\[hidden\]/);
    assert.match(styles, /@keyframes screenshot-delivery-awaken/);
    assert.match(styles, /prefers-reduced-motion/);
});

test('screenshot service and styles load before the capture plugin', () => {
    const servicePosition = index.indexOf('services/screenshotService.js');
    const stylePosition = index.indexOf('screenshot.css');
    const pluginPosition = index.indexOf('utils/plyr-plugin-capture.js');
    assert.ok(servicePosition >= 0);
    assert.ok(stylePosition >= 0);
    assert.ok(pluginPosition > servicePosition);
});

test('a video source change invalidates delivery state and releases a pending capture control', () => {
    assert.match(plugin, /this\.boundSourceChange = \(\) => this\.clearCompletedCapture\(\)/);
    assert.match(plugin, /if \(!preserveGeneration\) \{[\s\S]*?this\.isCapturing = false;[\s\S]*?removeAttribute\('aria-busy'\)/);
    assert.match(plugin, /URL\.revokeObjectURL\(this\.downloadUrl\)/);
});
