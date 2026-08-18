const test = require('node:test');
const assert = require('node:assert/strict');
const { ClipExportService, MediabunnyClipSession } = require('../services/clipExportService.js');

test('capability gate hides insecure and Firefox Android clients', () => {
    const capable = {
        isSecureContext: true,
        VideoDecoder: class {},
        VideoEncoder: class {},
        fetch() {},
        navigator: { userAgent: 'Mozilla/5.0 Chrome/140.0' }
    };
    assert.equal(ClipExportService.hasBaseCapabilities(capable), true);
    assert.equal(ClipExportService.hasBaseCapabilities({ ...capable, isSecureContext: false }), false);
    assert.equal(ClipExportService.hasBaseCapabilities({
        ...capable,
        navigator: { userAgent: 'Mozilla/5.0 (Android 16) Firefox/142.0' }
    }), false);
});

test('navigates exact variable-rate sample timestamps', () => {
    const frames = [
        { timestamp: 0, duration: 0.041708 },
        { timestamp: 0.041708, duration: 0.033333 },
        { timestamp: 0.075041, duration: 0.050000 },
        { timestamp: 0.125041, duration: 0.041708 }
    ];

    assert.equal(ClipExportService.findAdjacentSample(frames, 0.041708, 1).timestamp, 0.075041);
    assert.equal(ClipExportService.findAdjacentSample(frames, 0.075041, -1).timestamp, 0.041708);
    assert.equal(ClipExportService.findAdjacentSample(frames, 0.125041, 1), null);
    assert.equal(ClipExportService.findAdjacentSample([
        { timestamp: 1, duration: 0.04 },
        { timestamp: 11, duration: 0.04 }
    ], 1, 1), null);
});

test('frame stepping ignores stale cached samples from a distant timeline position', async () => {
    let closed = 0;
    const localFrames = [
        { timestamp: 1, duration: 0.04 },
        { timestamp: 1.04, duration: 0.033 },
        { timestamp: 1.073, duration: 0.05 }
    ];
    const sink = {
        async *samples() {
            for (const frame of localFrames) {
                yield { ...frame, close: () => { closed += 1; } };
            }
        },
        async getSample() {
            return { ...localFrames[0], close: () => { closed += 1; } };
        }
    };
    const session = new MediabunnyClipSession({
        library: {},
        sourceUrl: 'https://example.test/video.mp4',
        input: { dispose() {} },
        track: {},
        sink,
        width: 1920,
        height: 1080,
        duration: 20,
        firstTimestamp: 0
    });
    session.frameWindow = [
        { timestamp: 1, duration: 0.04 },
        { timestamp: 11, duration: 0.04 }
    ];

    assert.deepEqual(await session.getAdjacentFrame(1, 1), localFrames[1]);
    assert.equal(closed, localFrames.length);
});

test('treats End as the final included frame', () => {
    const start = { timestamp: 1, duration: 0.04 };
    const end = { timestamp: 1.48, duration: 0.04 };
    assert.equal(ClipExportService.inclusiveEnd(end, 10), 1.52);
    assert.equal(ClipExportService.selectionDuration(start, end, 10), 0.52);
    assert.equal(ClipExportService.validateSelection(start, end, 10).valid, true);
});

test('enforces half-second minimum and eight-second maximum', () => {
    const start = { timestamp: 2, duration: 0.04 };
    assert.equal(ClipExportService.validateSelection(start, { timestamp: 2.44, duration: 0.04 }, 20).valid, false);
    assert.equal(ClipExportService.validateSelection(start, { timestamp: 2.46, duration: 0.04 }, 20).valid, true);
    assert.equal(ClipExportService.validateSelection(start, { timestamp: 9.96, duration: 0.04 }, 20).valid, true);
    assert.equal(ClipExportService.validateSelection(start, { timestamp: 10, duration: 0.04 }, 20).valid, false);
});

test('constrains draggable start and end handles without crossing or exceeding eight seconds', () => {
    assert.deepEqual(ClipExportService.startHandleBounds(12, 0), { minimum: 4, maximum: 11.5 });
    assert.deepEqual(ClipExportService.startHandleBounds(3, 1), { minimum: 1, maximum: 2.5 });
    assert.deepEqual(ClipExportService.endHandleBounds(4, 20), { minimum: 4.5, maximum: 12 });
    assert.deepEqual(ClipExportService.endHandleBounds(18, 20), { minimum: 18.5, maximum: 20 });
});

test('uses a precise timeline window so short handles remain separated in long videos', () => {
    assert.deepEqual(ClipExportService.timelineWindow(150, 0, 300), { start: 142, end: 158 });
    assert.deepEqual(ClipExportService.timelineWindow(2, 0, 300), { start: 0, end: 16 });
    assert.deepEqual(ClipExportService.timelineWindow(299, 0, 300), { start: 284, end: 300 });
    assert.deepEqual(ClipExportService.timelineWindow(3, 0, 6), { start: 0, end: 6 });
    assert.equal(ClipExportService.timelinePercent(150, 142, 158), 50);
    assert.equal(ClipExportService.timelinePercent(200, 142, 158), 100);
});

test('repositions a selection from its Start without changing its duration', () => {
    assert.deepEqual(
        ClipExportService.repositionSelectionFromStart(150, 3, 0, 300),
        { start: 150, endBoundary: 153, playhead: 150 }
    );
    assert.deepEqual(
        ClipExportService.repositionSelectionFromStart(0.25, 3, 0, 300),
        { start: 0.25, endBoundary: 3.25, playhead: 0.25 }
    );
    assert.deepEqual(
        ClipExportService.repositionSelectionFromStart(299.75, 3, 0, 300),
        { start: 297, endBoundary: 300, playhead: 297 }
    );
    assert.deepEqual(
        ClipExportService.repositionSelectionFromStart(10, 20, 2, 12),
        { start: 2, endBoundary: 12, playhead: 2 }
    );
});

test('fits video to a 480px maximum height without enlarging and uses even dimensions', () => {
    assert.deepEqual(ClipExportService.fitWithin(1920, 1080), { width: 852, height: 480 });
    assert.deepEqual(ClipExportService.fitWithin(1920, 1012), { width: 910, height: 480 });
    assert.deepEqual(ClipExportService.fitWithin(1080, 1920), { width: 270, height: 480 });
    assert.deepEqual(ClipExportService.fitWithin(638, 359), { width: 638, height: 358 });
});

test('creates a safe MP4 filename from title and inclusive timestamps', () => {
    assert.equal(
        ClipExportService.createFilename("It's Xing time!", 1.25, 4.5),
        'It-s-Xing-time-1s250-4s500.mp4'
    );
});

test('conversion options preserve source timing by omitting frameRate', () => {
    const options = ClipExportService.buildConversionOptions({
        startTime: 1,
        endTime: 4,
        width: 852,
        height: 480,
        quality: { level: 'medium' }
    });
    assert.equal(options.video.codec, 'avc');
    assert.equal(options.video.width, 852);
    assert.equal(options.video.height, 480);
    assert.equal(options.video.fit, 'contain');
    assert.equal(Object.hasOwn(options.video, 'frameRate'), false);
    assert.deepEqual(options.audio, { discard: true });
});

test('conversion options use Mediabunny automatic audio handling only when requested', () => {
    const quality = { level: 'medium' };
    const options = ClipExportService.buildConversionOptions({
        startTime: 1,
        endTime: 4,
        width: 852,
        height: 480,
        quality,
        includeAudio: true
    });

    assert.deepEqual(options.audio, {});
    assert.equal(Object.hasOwn(options.audio, 'codec'), false);
    assert.equal(Object.hasOwn(options.audio, 'quality'), false);
});

test('reports a discarded audio track instead of silently exporting video only', () => {
    const audioTrack = { type: 'audio' };
    assert.equal(ClipExportService.isAudioTrack(audioTrack), true);
    assert.equal(
        ClipExportService.describeAudioDiscard({
            discardedTracks: [{ track: audioTrack, reason: 'no_encodable_target_codec' }]
        }),
        'The conversion discarded the audio track (no encodable target codec).'
    );
});

test('keeps the official local AAC fallback ready for browsers without a native encoder', () => {
    assert.equal(ClipExportService.AAC_ENCODER_URL, 'vendor/mediabunny-aac-encoder-1.52.2.min.js');
    assert.match(ClipExportService.ensureAacEncoder.toString(), /canEncodeAudio\('aac'\)/);
    assert.match(ClipExportService.ensureAacEncoder.toString(), /MediabunnyAacEncoder/);
    assert.match(ClipExportService.ensureAacEncoder.toString(), /registerAacEncoder/);
});

function mp4Box(type, payload) {
    const bytes = new Uint8Array(8 + payload.length);
    new DataView(bytes.buffer).setUint32(0, bytes.length);
    for (let index = 0; index < 4; index += 1) bytes[4 + index] = type.charCodeAt(index);
    bytes.set(payload, 8);
    return bytes;
}

function joinBytes(...parts) {
    const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }
    return result;
}

function malformedAvcC() {
    // Firefox's malformed record: SPS/PPS each carry their NAL header twice.
    return new Uint8Array([
        1, 0x64, 0, 0x1f, 0xff, 0xe1,
        0, 5, 0x67, 0x67, 0x64, 0, 0x1f,
        1,
        0, 4, 0x68, 0x68, 1, 2
    ]);
}

function malformedAvcMovie() {
    const avc1Prefix = new Uint8Array(78);
    const avc1 = mp4Box('avc1', joinBytes(avc1Prefix, mp4Box('avcC', malformedAvcC())));
    const stsd = mp4Box('stsd', joinBytes(new Uint8Array(8), avc1));
    const stbl = mp4Box('stbl', stsd);
    const moov = mp4Box('moov', mp4Box('trak', mp4Box('mdia', mp4Box('minf', stbl))));
    return joinBytes(mp4Box('ftyp', new Uint8Array()), moov, mp4Box('mdat', new Uint8Array(16)));
}

test('repairs Firefox duplicate SPS/PPS headers without re-encoding', () => {
    const source = malformedAvcMovie();
    const repaired = ClipExportService.repairAvcConfigurationRecordsToBytes(source);
    assert.equal(repaired.length, source.length - 2);

    const avcOffset = Buffer.from(repaired).indexOf(Buffer.from('avcC'));
    const payload = repaired.slice(avcOffset + 4, avcOffset + 4 + 18);
    assert.deepEqual([...payload.slice(0, 14)], [
        1, 0x64, 0, 0x1f, 0xff, 0xe1,
        0, 4, 0x67, 0x64, 0, 0x1f,
        1, 0
    ]);
    assert.deepEqual([...payload.slice(14, 18)], [3, 0x68, 1, 2]);
});

test('sample and input resources are closed after use', async () => {
    let sampleCloses = 0;
    let inputDisposals = 0;
    const session = new MediabunnyClipSession({
        library: {},
        sourceUrl: 'https://example.test/video.mp4',
        input: { dispose: () => { inputDisposals += 1; } },
        track: {},
        sink: {
            getSample: async () => ({
                timestamp: 1,
                duration: 1 / 24,
                close: () => { sampleCloses += 1; }
            })
        },
        width: 1920,
        height: 1080,
        duration: 10,
        firstTimestamp: 0
    });

    assert.deepEqual(await session.resolveSample(1.02), { timestamp: 1, duration: 1 / 24 });
    assert.equal(sampleCloses, 1);
    session.dispose();
    session.dispose();
    assert.equal(inputDisposals, 1);
});

function createFakeExportSession({ waitForCancel = false } = {}) {
    let disposed = 0;
    let cancelled = 0;
    let capturedOptions = null;
    let rejectExecution = null;

    class FakeInput {
        dispose() {
            disposed += 1;
        }
    }
    class FakeBufferTarget {
        constructor() {
            this.buffer = null;
        }
    }
    class FakeOutput {
        constructor(options) {
            Object.assign(this, options);
        }
    }

    const library = {
        Input: FakeInput,
        UrlSource: class {},
        ALL_FORMATS: [],
        BufferTarget: FakeBufferTarget,
        Output: FakeOutput,
        Mp4OutputFormat: class {},
        Quality: class { constructor(level) { this.level = level; } },
        Conversion: {
            async init(options) {
                capturedOptions = options;
                return {
                    isValid: true,
                    onProgress: null,
                    execute() {
                        this.onProgress?.(0.5);
                        if (waitForCancel) {
                            return new Promise((_resolve, reject) => { rejectExecution = reject; });
                        }
                        options.output.target.buffer = new Uint8Array([1, 2, 3]);
                        return Promise.resolve();
                    },
                    async cancel() {
                        cancelled += 1;
                        const error = new Error('cancelled');
                        error.name = 'ConversionCanceledError';
                        rejectExecution?.(error);
                    }
                };
            }
        }
    };

    return {
        session: {
            library,
            sourceUrl: 'https://example.test/video.mp4',
            width: 1920,
            height: 1080,
            duration: 20
        },
        inspect: () => ({ disposed, cancelled, capturedOptions })
    };
}

test('successful export cleans up its network input', async () => {
    const fake = createFakeExportSession();
    const result = await new ClipExportService().exportClip({
        session: fake.session,
        startSample: { timestamp: 1, duration: 0.04 },
        endSample: { timestamp: 1.48, duration: 0.04 }
    });

    assert.equal(result.blob.type, 'video/mp4');
    assert.equal(fake.inspect().disposed, 1);
    assert.equal(Object.hasOwn(fake.inspect().capturedOptions.video, 'frameRate'), false);
});

test('cancellation stops conversion and disposes its input', async () => {
    const fake = createFakeExportSession({ waitForCancel: true });
    const controller = new AbortController();
    const pending = new ClipExportService().exportClip({
        session: fake.session,
        startSample: { timestamp: 1, duration: 0.04 },
        endSample: { timestamp: 1.48, duration: 0.04 },
        signal: controller.signal
    });

    await new Promise(resolve => setImmediate(resolve));
    controller.abort();
    await assert.rejects(pending, error => error.name === 'AbortError');
    assert.equal(fake.inspect().cancelled, 1);
    assert.ok(fake.inspect().disposed >= 1);
});
