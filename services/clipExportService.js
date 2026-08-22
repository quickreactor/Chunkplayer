// ====================
// MEDIABUNNY CLIP EXPORT SERVICE
// ====================

class ClipExportService {
    static MIN_SECONDS = 0.5;
    static MAX_SECONDS = 8;
    static DEFAULT_SECONDS = 3;
    static MAX_HEIGHT = 480;
    static LIBRARY_URL = 'vendor/mediabunny-1.52.2.min.js';
    static AAC_ENCODER_URL = 'vendor/mediabunny-aac-encoder-1.52.2.min.js';
    static libraryPromise = null;
    static aacEncoderPromise = null;
    static aacEncoderRegistered = false;

    constructor() {
        this.capabilityReport = ClipExportService.getCapabilityReport();
    }

    static getCapabilityReport(scope = globalThis) {
        const userAgent = scope.navigator?.userAgent || '';
        const isFirefoxAndroid = /Android/i.test(userAgent) && /Firefox|FxiOS/i.test(userAgent);
        const iosMatch = userAgent.match(/(?:CPU(?: iPhone)? OS|iPhone OS)\s+(\d+(?:[_\.]\d+)*)/i);
        const chromeMatch = userAgent.match(/CriOS\/(\d+(?:\.\d+)*)/i);
        const secureContext = scope.isSecureContext === true;
        const videoDecoder = typeof scope.VideoDecoder !== 'undefined';
        const videoEncoder = typeof scope.VideoEncoder !== 'undefined';
        const fetch = typeof scope.fetch === 'function';

        return {
            supported: secureContext && !isFirefoxAndroid && videoDecoder && videoEncoder && fetch,
            secureContext,
            videoDecoder,
            videoEncoder,
            fetch,
            isFirefoxAndroid,
            browser: chromeMatch ? 'Chrome iOS' : '',
            browserVersion: chromeMatch?.[1] || '',
            iosVersion: iosMatch?.[1]?.replace(/_/g, '.') || '',
            userAgent,
            sourceUrl: '',
            sourceReadable: null,
            sourceDecodable: null,
            h264Encodable: null,
            encoderAttempts: [],
            selectedEncoder: null,
            audioEncodable: null,
            failureStage: null,
            failure: null
        };
    }

    static hasBaseCapabilities(scope = globalThis) {
        return this.getCapabilityReport(scope).supported;
    }

    getCapabilityReport() {
        return { ...this.capabilityReport };
    }

    static async loadLibrary() {
        if (globalThis.Mediabunny) return globalThis.Mediabunny;
        if (typeof document === 'undefined') {
            throw new Error('Mediabunny is only loaded in the browser.');
        }

        if (!this.libraryPromise) {
            this.libraryPromise = new Promise((resolve, reject) => {
                const existing = document.querySelector('script[data-mediabunny-version="1.52.2"]');
                const script = existing || document.createElement('script');
                const handleLoad = () => {
                    if (globalThis.Mediabunny) {
                        resolve(globalThis.Mediabunny);
                    } else {
                        script.remove();
                        reject(new Error('The clip editor library did not start correctly.'));
                    }
                };
                const handleError = () => {
                    script.remove();
                    reject(new Error('The clip editor library could not be loaded.'));
                };

                script.addEventListener('load', handleLoad, { once: true });
                script.addEventListener('error', handleError, { once: true });
                if (!existing) {
                    script.src = new URL(this.LIBRARY_URL, document.baseURI).toString();
                    script.dataset.mediabunnyVersion = '1.52.2';
                    document.head.appendChild(script);
                }
            }).catch(error => {
                this.libraryPromise = null;
                throw error;
            });
        }

        return this.libraryPromise;
    }

    static async ensureAacEncoder(library) {
        if (this.aacEncoderRegistered || await library.canEncodeAudio('aac')) return;
        if (typeof document === 'undefined') {
            throw new Error('The AAC export fallback is only loaded in the browser.');
        }

        if (!this.aacEncoderPromise) {
            this.aacEncoderPromise = new Promise((resolve, reject) => {
                const existing = document.querySelector('script[data-mediabunny-aac-encoder-version="1.52.2"]');
                const script = existing || document.createElement('script');
                const register = () => {
                    const encoder = globalThis.MediabunnyAacEncoder;
                    if (!encoder?.registerAacEncoder) {
                        script.remove();
                        reject(new Error('The AAC export fallback did not start correctly.'));
                        return;
                    }
                    encoder.registerAacEncoder();
                    this.aacEncoderRegistered = true;
                    resolve();
                };
                const handleError = () => {
                    script.remove();
                    reject(new Error('The AAC export fallback could not be loaded.'));
                };

                if (globalThis.MediabunnyAacEncoder) {
                    register();
                    return;
                }
                script.addEventListener('load', register, { once: true });
                script.addEventListener('error', handleError, { once: true });
                if (!existing) {
                    script.src = new URL(this.AAC_ENCODER_URL, document.baseURI).toString();
                    script.dataset.mediabunnyAacEncoderVersion = '1.52.2';
                    document.head.appendChild(script);
                }
            }).catch(error => {
                this.aacEncoderPromise = null;
                throw error;
            });
        }

        await this.aacEncoderPromise;
    }

    static fitWithin(width, height, maxHeight = this.MAX_HEIGHT, maxWidth = Infinity) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            throw new Error('The video dimensions are not available yet.');
        }

        const scale = Math.min(1, maxHeight / height, maxWidth / width);
        const makeEven = value => Math.max(2, Math.floor(value / 2) * 2);
        return {
            width: makeEven(width * scale),
            height: makeEven(height * scale)
        };
    }

    static getAvcOutputCandidates(width, height) {
        const candidates = [
            this.fitWithin(width, height, 480),
            this.fitWithin(width, height, 360, 640),
            this.fitWithin(width, height, 240, 426)
        ];
        return candidates.filter((candidate, index) => (
            candidates.findIndex(other => other.width === candidate.width && other.height === candidate.height) === index
        ));
    }

    async selectAvcOutput(library, width, height) {
        const quality = new library.Quality('medium');
        const attempts = [];
        for (const candidate of ClipExportService.getAvcOutputCandidates(width, height)) {
            let supported = false;
            let error = '';
            try {
                supported = await library.canEncodeVideo('avc', {
                    width: candidate.width,
                    height: candidate.height,
                    quality
                });
            } catch (candidateError) {
                error = candidateError?.message || String(candidateError);
            }
            attempts.push({ codec: 'avc', ...candidate, supported, error });
            if (supported) {
                this.capabilityReport.encoderAttempts = attempts;
                this.capabilityReport.selectedEncoder = { codec: 'avc', ...candidate };
                return candidate;
            }
        }
        this.capabilityReport.encoderAttempts = attempts;
        return null;
    }

    static sampleDetails(sample) {
        if (!sample) return null;
        return {
            timestamp: Math.max(0, sample.timestamp),
            duration: Math.max(0.000001, sample.duration)
        };
    }

    static inclusiveEnd(sample, mediaDuration = Infinity) {
        if (!sample) return NaN;
        return Math.min(mediaDuration, sample.timestamp + sample.duration);
    }

    static selectionDuration(startSample, endSample, mediaDuration = Infinity) {
        return this.inclusiveEnd(endSample, mediaDuration) - startSample.timestamp;
    }

    static validateSelection(startSample, endSample, mediaDuration = Infinity) {
        if (!startSample || !endSample || endSample.timestamp < startSample.timestamp) {
            return { valid: false, duration: 0, message: 'Set the Start before the End.' };
        }

        const duration = this.selectionDuration(startSample, endSample, mediaDuration);
        if (duration < this.MIN_SECONDS - 0.000001) {
            return { valid: false, duration, message: 'Clips must be at least 0.5 seconds.' };
        }
        if (duration > this.MAX_SECONDS + 0.000001) {
            return { valid: false, duration, message: 'Clips can be no longer than 8 seconds.' };
        }
        return { valid: true, duration, message: '' };
    }

    static startHandleBounds(endBoundary, firstTimestamp = 0) {
        const minimum = Math.max(firstTimestamp, endBoundary - this.MAX_SECONDS);
        return {
            minimum,
            maximum: Math.max(minimum, endBoundary - this.MIN_SECONDS)
        };
    }

    static endHandleBounds(startTimestamp, mediaDuration) {
        return {
            minimum: Math.min(mediaDuration, startTimestamp + this.MIN_SECONDS),
            maximum: Math.min(mediaDuration, startTimestamp + this.MAX_SECONDS)
        };
    }

    static timelineWindow(centerTime, firstTimestamp, mediaDuration, preferredSpan = 16) {
        const available = Math.max(0, mediaDuration - firstTimestamp);
        const span = Math.min(preferredSpan, available);
        const maximumStart = Math.max(firstTimestamp, mediaDuration - span);
        const start = Math.max(firstTimestamp, Math.min(centerTime - span / 2, maximumStart));
        return { start, end: start + span };
    }

    static timelinePercent(time, windowStart, windowEnd) {
        const span = windowEnd - windowStart;
        if (!(span > 0)) return 0;
        return Math.max(0, Math.min(100, ((time - windowStart) / span) * 100));
    }

    static repositionSelectionFromStart(startTime, selectionDuration, firstTimestamp, mediaDuration) {
        const available = Math.max(0, mediaDuration - firstTimestamp);
        const duration = Math.max(0, Math.min(selectionDuration, available));
        const latestStart = Math.max(firstTimestamp, mediaDuration - duration);
        const start = Math.max(firstTimestamp, Math.min(startTime, latestStart));
        return {
            start,
            endBoundary: start + duration,
            playhead: start
        };
    }

    static findAdjacentSample(samples, currentTimestamp, direction, maximumGap = 0.25) {
        const epsilon = 0.000001;
        if (direction > 0) {
            const candidate = samples.find(sample => sample.timestamp > currentTimestamp + epsilon) || null;
            return candidate && candidate.timestamp - currentTimestamp <= maximumGap ? candidate : null;
        }
        for (let index = samples.length - 1; index >= 0; index -= 1) {
            if (samples[index].timestamp < currentTimestamp - epsilon) {
                return currentTimestamp - samples[index].timestamp <= maximumGap ? samples[index] : null;
            }
        }
        return null;
    }

    static createFilename(title, startTime, endTime) {
        const safeTitle = String(title || 'chunkplayer-clip')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 70) || 'chunkplayer-clip';
        const compactTime = value => Math.max(0, value).toFixed(3).replace('.', 's');
        return `${safeTitle}-${compactTime(startTime)}-${compactTime(endTime)}.mp4`;
    }

    // Firefox's Windows/Linux WebCodecs H.264 path has shipped an AVCDecoder-
    // ConfigurationRecord with an extra SPS/PPS NAL header byte.  The encoded
    // samples are fine (and tolerant players recover from their in-band SPS/PPS),
    // but strict native players such as chat clients can reject the stream.  Fix
    // only the out-of-band avcC record; this is a byte-level repair, not a
    // re-encode, so frame timing and quality remain untouched.
    static repairAvcConfigurationRecordsToBytes(sourceBytes) {
        const bytes = sourceBytes instanceof Uint8Array
            ? sourceBytes
            : new Uint8Array(sourceBytes);
        const topLevel = this.readMp4Boxes(bytes, 0, bytes.length);
        const moov = topLevel.find(box => box.type === 'moov');
        if (!moov) return bytes;

        const originalMoov = bytes.slice(moov.start, moov.end);
        const repairedMoov = this.rewriteAvcBoxes(originalMoov);
        if (!repairedMoov.changed) return bytes;

        const mdat = topLevel.find(box => box.type === 'mdat');
        const delta = repairedMoov.bytes.length - originalMoov.length;
        if (delta && (!mdat || moov.start < mdat.start)) {
            this.adjustChunkOffsets(repairedMoov.bytes, delta);
        }

        const result = new Uint8Array(bytes.length + delta);
        result.set(bytes.subarray(0, moov.start), 0);
        result.set(repairedMoov.bytes, moov.start);
        result.set(bytes.subarray(moov.end), moov.start + repairedMoov.bytes.length);
        return result;
    }

    static rewriteAvcBoxes(moovBytes) {
        const root = this.readMp4Boxes(moovBytes, 0, moovBytes.length)[0];
        if (!root || root.type !== 'moov') return { bytes: moovBytes, changed: false };

        const rewrite = box => {
            if (box.type === 'avcC') return this.repairAvcCBox(moovBytes, box);

            const childStart = this.mp4ChildStart(box);
            if (childStart >= box.end) return { bytes: moovBytes.slice(box.start, box.end), changed: false };
            const children = this.readMp4Boxes(moovBytes, childStart, box.end);
            if (!children.length) return { bytes: moovBytes.slice(box.start, box.end), changed: false };

            let changed = false;
            const parts = [moovBytes.slice(box.dataStart, childStart)];
            let cursor = childStart;
            for (const child of children) {
                const updated = rewrite(child);
                parts.push(updated.bytes);
                changed ||= updated.changed;
                cursor = child.end;
            }
            parts.push(moovBytes.slice(cursor, box.end));
            if (!changed) return { bytes: moovBytes.slice(box.start, box.end), changed: false };

            const payloadLength = parts.reduce((total, part) => total + part.length, 0);
            const headerLength = box.headerSize;
            const updated = new Uint8Array(headerLength + payloadLength);
            updated.set(moovBytes.slice(box.start, box.start + headerLength), 0);
            let offset = headerLength;
            for (const part of parts) {
                updated.set(part, offset);
                offset += part.length;
            }
            if (box.headerSize === 8) {
                this.writeUint32(updated, 0, updated.length);
            } else {
                new DataView(updated.buffer).setBigUint64(8, BigInt(updated.length));
            }
            return { bytes: updated, changed: true };
        };

        return rewrite(root);
    }

    static mp4ChildStart(box) {
        // stsd has FullBox flags + entry_count before its sample entries.
        if (box.type === 'stsd') return box.dataStart + 8;
        // avc1/avc3 visual sample entries have a fixed 78-byte header before
        // child atoms such as avcC.
        if (box.type === 'avc1' || box.type === 'avc3' || box.type === 'encv') {
            return box.dataStart + 78;
        }
        if (box.type === 'meta') return box.dataStart + 4;
        const containers = new Set([
            'moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'mvex',
            'moof', 'traf', 'mfra', 'sinf', 'schi', 'ipro'
        ]);
        return containers.has(box.type) ? box.dataStart : box.end;
    }

    static repairAvcCBox(sourceBytes, box) {
        const payload = sourceBytes.slice(box.dataStart, box.end);
        if (payload.length < 7 || payload[0] !== 1) {
            return { bytes: sourceBytes.slice(box.start, box.end), changed: false };
        }

        let cursor = 5;
        const spsCount = payload[cursor++] & 0x1f;
        const sps = [];
        for (let index = 0; index < spsCount; index += 1) {
            if (cursor + 2 > payload.length) return { bytes: sourceBytes.slice(box.start, box.end), changed: false };
            const length = (payload[cursor] << 8) | payload[cursor + 1];
            cursor += 2;
            if (cursor + length > payload.length) return { bytes: sourceBytes.slice(box.start, box.end), changed: false };
            sps.push(payload.slice(cursor, cursor + length));
            cursor += length;
        }
        if (cursor >= payload.length) return { bytes: sourceBytes.slice(box.start, box.end), changed: false };
        const ppsCount = payload[cursor++];
        const pps = [];
        for (let index = 0; index < ppsCount; index += 1) {
            if (cursor + 2 > payload.length) return { bytes: sourceBytes.slice(box.start, box.end), changed: false };
            const length = (payload[cursor] << 8) | payload[cursor + 1];
            cursor += 2;
            if (cursor + length > payload.length) return { bytes: sourceBytes.slice(box.start, box.end), changed: false };
            pps.push(payload.slice(cursor, cursor + length));
            cursor += length;
        }

        const stripDuplicateHeader = (nal, header) => (
            nal.length >= 2 && nal[0] === header && nal[1] === header
                ? (() => {
                    const repaired = new Uint8Array(nal.length - 1);
                    repaired.set(nal.slice(0, 1), 0);
                    repaired.set(nal.slice(2), 1);
                    return repaired;
                })()
                : nal
        );
        const repairedSps = sps.map(nal => stripDuplicateHeader(nal, 0x67));
        const repairedPps = pps.map(nal => stripDuplicateHeader(nal, 0x68));
        const changed = repairedSps.some((nal, index) => nal.length !== sps[index].length)
            || repairedPps.some((nal, index) => nal.length !== pps[index].length);
        if (!changed) return { bytes: sourceBytes.slice(box.start, box.end), changed: false };

        const trailing = payload.slice(cursor);
        const payloadLength = 5
            + 1 + repairedSps.reduce((total, nal) => total + 2 + nal.length, 0)
            + 1 + repairedPps.reduce((total, nal) => total + 2 + nal.length, 0)
            + trailing.length;
        const repairedPayload = new Uint8Array(payloadLength);
        repairedPayload.set(payload.slice(0, 5), 0);
        let offset = 5;
        repairedPayload[offset++] = spsCount | 0xe0;
        for (const nal of repairedSps) {
            repairedPayload[offset++] = (nal.length >>> 8) & 0xff;
            repairedPayload[offset++] = nal.length & 0xff;
            repairedPayload.set(nal, offset);
            offset += nal.length;
        }
        repairedPayload[offset++] = ppsCount;
        for (const nal of repairedPps) {
            repairedPayload[offset++] = (nal.length >>> 8) & 0xff;
            repairedPayload[offset++] = nal.length & 0xff;
            repairedPayload.set(nal, offset);
            offset += nal.length;
        }
        repairedPayload.set(trailing, offset);

        const updated = new Uint8Array(box.headerSize + repairedPayload.length);
        updated.set(sourceBytes.slice(box.start, box.start + box.headerSize), 0);
        updated.set(repairedPayload, box.headerSize);
        if (box.headerSize === 8) this.writeUint32(updated, 0, updated.length);
        else new DataView(updated.buffer).setBigUint64(8, BigInt(updated.length));
        return { bytes: updated, changed: true };
    }

    static readMp4Boxes(bytes, start, end) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const boxes = [];
        let offset = start;
        while (offset + 8 <= end) {
            const size32 = view.getUint32(offset);
            const type = String.fromCharCode(
                bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]
            );
            let headerSize = 8;
            let size;
            if (size32 === 1) {
                if (offset + 16 > end) break;
                const extended = view.getBigUint64(offset + 8);
                if (extended > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('The MP4 atom is too large to edit.');
                size = Number(extended);
                headerSize = 16;
            } else if (size32 === 0) {
                size = end - offset;
            } else {
                size = size32;
            }
            if (size < headerSize || offset + size > end) break;
            boxes.push({ start: offset, end: offset + size, size, type, headerSize, dataStart: offset + headerSize });
            offset += size;
        }
        return boxes;
    }

    static writeUint32(bytes, offset, value) {
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value >>> 0);
    }

    static adjustChunkOffsets(moovBytes, delta) {
        const containerTypes = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'meta', 'mvex', 'moof', 'traf', 'mfra', 'sinf', 'schi', 'ipro']);
        const walk = (start, end, parentType = '') => {
            for (const box of this.readMp4Boxes(moovBytes, start, end)) {
                if (box.type === 'stco' || box.type === 'co64') {
                    const view = new DataView(moovBytes.buffer, moovBytes.byteOffset, moovBytes.byteLength);
                    if (box.dataStart + 8 > box.end) continue;
                    const count = view.getUint32(box.dataStart + 4);
                    const entrySize = box.type === 'co64' ? 8 : 4;
                    if (box.dataStart + 8 + count * entrySize > box.end) continue;
                    for (let index = 0; index < count; index += 1) {
                        const offset = box.dataStart + 8 + index * entrySize;
                        if (box.type === 'co64') {
                            const value = view.getBigUint64(offset) + BigInt(delta);
                            view.setBigUint64(offset, value);
                        } else {
                            const value = view.getUint32(offset) + delta;
                            if (value > 0xffffffff) throw new Error('The MP4 chunk offset is too large to update.');
                            view.setUint32(offset, value);
                        }
                    }
                }
                if (containerTypes.has(box.type)) {
                    let childStart = box.dataStart;
                    if (box.type === 'meta') childStart += 4;
                    if (childStart < box.end) walk(childStart, box.end, box.type);
                }
            }
        };
        walk(8, moovBytes.length, 'moov');
    }

    static buildConversionOptions({ startTime, endTime, width, height, quality, includeAudio = false }) {
        return {
            tracks: 'primary',
            trim: { start: startTime, end: endTime },
            video: {
                width,
                height,
                fit: 'contain',
                codec: 'avc',
                quality
            },
            audio: includeAudio
                // Leave audio unconfigured: Mediabunny then copies the source
                // audio when possible and only transcodes for a precise trim.
                ? {}
                : { discard: true },
            tags: {}
        };
    }

    static isAudioTrack(track) {
        return track?.type === 'audio' || track?.isAudioTrack?.() === true;
    }

    static describeAudioDiscard(conversion) {
        const discardedAudio = conversion.discardedTracks?.find(({ track }) => this.isAudioTrack(track));
        if (!discardedAudio) return 'The conversion did not create an audio track.';
        const reason = String(discardedAudio.reason || '').replace(/_/g, ' ');
        return reason
            ? `The conversion discarded the audio track (${reason}).`
            : 'The conversion discarded the audio track.';
    }

    static abortError() {
        if (typeof DOMException !== 'undefined') {
            return new DOMException('Clip export cancelled.', 'AbortError');
        }
        const error = new Error('Clip export cancelled.');
        error.name = 'AbortError';
        return error;
    }

    async openSource(sourceUrl) {
        if (!sourceUrl) throw new Error('There is no video to edit yet.');
        this.capabilityReport = {
            ...ClipExportService.getCapabilityReport(),
            sourceUrl
        };
        if (!this.capabilityReport.supported) {
            this.capabilityReport.failureStage = 'base';
            this.capabilityReport.failure = 'Clip export is not supported in this browser.';
            throw new Error(this.capabilityReport.failure);
        }

        let input = null;
        let stage = 'library';
        try {
            const library = await ClipExportService.loadLibrary();
            stage = 'source';
            input = new library.Input({
                formats: library.ALL_FORMATS,
                source: new library.UrlSource(sourceUrl, {
                    maxCacheSize: 8 * 1024 * 1024,
                    parallelism: 2,
                    requestInit: { mode: 'cors' }
                })
            });
            const [track, audioTrack] = await Promise.all([
                input.getPrimaryVideoTrack(),
                input.getPrimaryAudioTrack()
            ]);
            this.capabilityReport.sourceReadable = true;

            stage = 'decode';
            const sourceDecodable = Boolean(track && await track.canDecode());
            this.capabilityReport.sourceDecodable = sourceDecodable;
            if (!sourceDecodable) {
                throw new Error('This video cannot be decoded for clip export.');
            }

            const [width, height, firstTimestamp, metadataDuration] = await Promise.all([
                track.getDisplayWidth(),
                track.getDisplayHeight(),
                track.getFirstTimestamp(),
                track.getDurationFromMetadata({ skipLiveWait: true })
            ]);
            stage = 'encode';
            const outputSize = await this.selectAvcOutput(library, width, height);
            this.capabilityReport.h264Encodable = Boolean(outputSize);
            if (!outputSize) {
                throw new Error('This browser cannot create H.264 MP4 clips.');
            }

            const duration = Number.isFinite(metadataDuration) && metadataDuration > 0
                ? metadataDuration
                : await track.computeDuration({ skipLiveWait: true });
            stage = 'audio';
            const audioAvailable = await this.canExportAudio(library, audioTrack);
            this.capabilityReport.audioEncodable = audioAvailable;
            return new MediabunnyClipSession({
                library,
                sourceUrl,
                input,
                track,
                sink: new library.VideoSampleSink(track),
                width,
                height,
                outputSize,
                duration,
                firstTimestamp: Math.max(0, firstTimestamp),
                hasSourceAudio: Boolean(audioTrack),
                audioAvailable
            });
        } catch (error) {
            input?.dispose();
            let visibleError = error;
            if (stage !== 'library' && /fetch|cors|network|load|read/i.test(error?.message || '')) {
                this.capabilityReport.sourceReadable = false;
                visibleError = new Error('The video storage did not allow the clip editor to read this video.');
            }
            this.capabilityReport.failureStage = stage;
            this.capabilityReport.failure = visibleError?.message || 'Clip export is unavailable for this video.';
            throw visibleError;
        }
    }

    async canExportAudio(library, audioTrack) {
        if (!audioTrack) return false;
        try {
            if (!(await audioTrack.canDecode())) return false;
            await ClipExportService.ensureAacEncoder(library);
            return await library.canEncodeAudio('aac', {
                quality: new library.Quality('medium')
            });
        } catch (error) {
            return false;
        }
    }

    async exportClip({ session, startSample, endSample, signal, onProgress = () => {}, includeAudio = false }) {
        const selection = ClipExportService.validateSelection(startSample, endSample, session.duration);
        if (!selection.valid) throw new Error(selection.message);
        if (includeAudio && !session.audioAvailable) {
            throw new Error('Source audio is not available for MP4 export in this browser.');
        }
        if (signal?.aborted) throw ClipExportService.abortError();

        const library = session.library;
        const outputSize = session.outputSize || ClipExportService.fitWithin(session.width, session.height);
        const input = new library.Input({
            formats: library.ALL_FORMATS,
            source: new library.UrlSource(session.sourceUrl, {
                maxCacheSize: 8 * 1024 * 1024,
                parallelism: 2,
                requestInit: { mode: 'cors' }
            })
        });
        const target = new library.BufferTarget();
        const output = new library.Output({
            format: new library.Mp4OutputFormat({ fastStart: 'in-memory' }),
            target
        });
        let conversion = null;
        let inputDisposed = false;
        const disposeInput = () => {
            if (inputDisposed) return;
            inputDisposed = true;
            input.dispose();
        };
        const handleAbort = () => {
            disposeInput();
            if (conversion) void conversion.cancel();
        };
        signal?.addEventListener('abort', handleAbort, { once: true });

        try {
            const quality = new library.Quality('medium');
            const options = ClipExportService.buildConversionOptions({
                startTime: startSample.timestamp,
                endTime: ClipExportService.inclusiveEnd(endSample, session.duration),
                width: outputSize.width,
                height: outputSize.height,
                quality,
                includeAudio
            });
            conversion = await library.Conversion.init({ input, output, ...options });
            if (signal?.aborted) throw ClipExportService.abortError();
            if (!conversion.isValid) {
                throw new Error('This video could not be prepared as an H.264 MP4 clip.');
            }
            if (includeAudio && !conversion.utilizedTracks?.some(track => ClipExportService.isAudioTrack(track))) {
                throw new Error(`Sound could not be included. ${ClipExportService.describeAudioDiscard(conversion)}`);
            }

            conversion.onProgress = progress => onProgress(Math.max(0, Math.min(1, progress)));
            await conversion.execute();
            if (signal?.aborted) throw ClipExportService.abortError();
            if (!target.buffer?.byteLength) throw new Error('The exported clip was empty.');

            const outputBytes = ClipExportService.repairAvcConfigurationRecordsToBytes(target.buffer);
            const blob = new Blob([outputBytes], { type: 'video/mp4' });

            return {
                blob,
                width: outputSize.width,
                height: outputSize.height,
                duration: selection.duration,
                startTime: startSample.timestamp,
                endTime: ClipExportService.inclusiveEnd(endSample, session.duration)
            };
        } catch (error) {
            if (signal?.aborted || error?.name === 'ConversionCanceledError' || error?.name === 'InputDisposedError') {
                throw ClipExportService.abortError();
            }
            if (/fetch|cors|network|load|read/i.test(error?.message || '')) {
                throw new Error('The video storage stopped the clip download. Check its range CORS settings.');
            }
            throw error;
        } finally {
            signal?.removeEventListener('abort', handleAbort);
            disposeInput();
        }
    }
}

class MediabunnyClipSession {
    constructor({ library, sourceUrl, input, track, sink, width, height, outputSize = null, duration, firstTimestamp, hasSourceAudio = false, audioAvailable = false }) {
        Object.assign(this, { library, sourceUrl, input, track, sink, width, height, outputSize, duration, firstTimestamp, hasSourceAudio, audioAvailable });
        this.frameWindow = [];
        this.disposed = false;
    }

    async resolveSample(timestamp) {
        this.assertOpen();
        const target = Math.max(this.firstTimestamp, Math.min(timestamp, this.duration));
        const sample = await this.sink.getSample(target);
        if (!sample) throw new Error('That video frame could not be read.');
        try {
            const details = ClipExportService.sampleDetails(sample);
            this.remember(details);
            return details;
        } finally {
            sample.close();
        }
    }

    async getAdjacentFrame(currentTimestamp, direction) {
        this.assertOpen();
        let adjacent = ClipExportService.findAdjacentSample(this.frameWindow, currentTimestamp, direction);
        if (adjacent) return adjacent;

        const radius = 1.25;
        const start = Math.max(this.firstTimestamp, currentTimestamp - radius);
        const end = Math.min(this.duration + 0.000001, currentTimestamp + radius);
        const samples = [];
        for await (const sample of this.sink.samples(start, end)) {
            try {
                samples.push(ClipExportService.sampleDetails(sample));
            } finally {
                sample.close();
            }
        }
        this.frameWindow = samples;
        adjacent = ClipExportService.findAdjacentSample(samples, currentTimestamp, direction, Infinity);
        return adjacent || await this.resolveSample(direction > 0 ? this.duration : this.firstTimestamp);
    }

    remember(sample) {
        if (!sample) return;
        const combined = [...this.frameWindow, sample]
            .sort((a, b) => a.timestamp - b.timestamp)
            .filter((item, index, array) => index === 0 || Math.abs(item.timestamp - array[index - 1].timestamp) > 0.000001)
            .filter(item => Math.abs(item.timestamp - sample.timestamp) <= 1.5);
        this.frameWindow = combined.slice(-180);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.frameWindow = [];
        this.input.dispose();
    }

    assertOpen() {
        if (this.disposed) throw new Error('The video changed while the clip editor was open.');
    }
}

if (typeof window !== 'undefined') {
    window.ClipExportService = ClipExportService;
    window.MediabunnyClipSession = MediabunnyClipSession;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClipExportService, MediabunnyClipSession };
}
