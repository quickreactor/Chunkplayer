// Archived tests for the canvas/MediaRecorder exporter.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ClipExportService } = require('../services/clipExportService.js');

test('fits landscape and portrait video inside the 480p export box', () => {
    assert.deepEqual(ClipExportService.fitWithin(1920, 1080), { width: 852, height: 480 });
    assert.deepEqual(ClipExportService.fitWithin(1080, 1920), { width: 270, height: 480 });
    assert.deepEqual(ClipExportService.fitWithin(640, 360), { width: 640, height: 360 });
});

test('snaps measured cadence and normalises NTSC-style export rates', () => {
    assert.equal(ClipExportService.snapSourceFps(23.982), 23.976);
    assert.equal(ClipExportService.snapSourceFps(29.96), 29.97);
    assert.equal(ClipExportService.snapSourceFps(25.01), 25);
    assert.equal(ClipExportService.normaliseExportFps(23.976), 24);
    assert.equal(ClipExportService.normaliseExportFps(29.97), 30);
    assert.equal(ClipExportService.normaliseExportFps(59.94), 60);
    assert.equal(ClipExportService.normaliseExportFps(25), 25);
});

test('prefers MP4 but falls back to the first browser-supported WebM format', () => {
    class Mp4Recorder {
        static isTypeSupported(type) {
            return type === 'video/mp4;codecs=avc1.42E01E' || type === 'video/webm';
        }
    }
    class FirefoxStyleRecorder {
        static isTypeSupported(type) {
            return type === 'video/webm;codecs=vp8' || type === 'video/webm';
        }
    }

    assert.equal(ClipExportService.getPreferredOutput(Mp4Recorder).extension, 'mp4');
    assert.equal(ClipExportService.getPreferredOutput(FirefoxStyleRecorder).mimeType, 'video/webm;codecs=vp8');
});

test('creates safe filenames with the selected frame timestamps', () => {
    assert.equal(
        ClipExportService.createFilename("It's Xing time!", 1.25, 4.5, 'webm'),
        'It-s-Xing-time-1s250-4s500.webm'
    );
});
