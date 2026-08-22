const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const plugin = fs.readFileSync(path.join(projectRoot, 'utils', 'plyr-plugin-clip-export.js'), 'utf8');
const styles = fs.readFileSync(path.join(projectRoot, 'clip-export.css'), 'utf8');
const app = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf8');
const domService = fs.readFileSync(path.join(projectRoot, 'services', 'domService.js'), 'utf8');
const adminService = fs.readFileSync(path.join(projectRoot, 'services', 'adminService.js'), 'utf8');
const mainStyles = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

test('clip editor exposes a full overview plus separate In, Out, and CTI drag controls', () => {
    assert.match(plugin, /data-clip="overview"/);
    assert.match(plugin, /data-drag="start"/);
    assert.match(plugin, /data-drag="end"/);
    assert.match(plugin, /data-drag="playhead"/);
    assert.match(plugin, /data-drag="segment"/);
    assert.match(plugin, /startOverviewDrag/);
    assert.match(plugin, /overviewPointerTime/);
    assert.match(plugin, /repositionSelectionFromStart/);
    assert.match(plugin, /getTimelineDragKind/);
    assert.match(plugin, /kind === 'segment'/);
    assert.match(plugin, /resolveMovedSelection/);
    assert.match(plugin, /setPointerCapture/);
    assert.match(plugin, /releasePointerCapture/);
});

test('transport and secondary actions use the consistent local icon set', () => {
    assert.match(plugin, /data-clip="start"/);
    assert.match(plugin, /data-clip="previous"/);
    assert.match(plugin, /data-clip="play"/);
    assert.match(plugin, /data-clip="next"/);
    assert.match(plugin, /data-clip="end"/);
    assert.match(plugin, /data-clip="audio"/);
    assert.match(plugin, /ICONS\.markIn/);
    assert.match(plugin, /ICONS\.markOut/);
    assert.match(plugin, /ICONS\.trimStart/);
    assert.match(plugin, /ICONS\.trimEnd/);
    assert.match(plugin, /ICONS\.pause/);
    assert.match(plugin, /ICONS\.volume/);
    assert.match(plugin, /ICONS\.download/);
    assert.match(plugin, /ICONS\.stop/);
    assert.match(plugin, /ICONS\.close/);
    assert.doesNotMatch(plugin, /clip-editor__title/);
    assert.doesNotMatch(plugin, /clip-tool__label/);
    assert.doesNotMatch(plugin, /clip-action/);
    assert.doesNotMatch(plugin, /data-clip="cancel-edit"/);
    assert.doesNotMatch(plugin, /export-loop-atom/);
});

test('source sound is a capability-gated export toggle', () => {
    assert.match(plugin, /toggleAudio\(\)/);
    assert.match(plugin, /this\.session\?\.audioAvailable/);
    assert.match(plugin, /this\.includeAudio = true/);
    assert.match(plugin, /this\.includeAudio = !this\.includeAudio/);
    assert.match(plugin, /includeAudio:\s*this\.includeAudio/);
    assert.match(plugin, /hasSourceAudio/);
    assert.match(plugin, /Audio export is unavailable in this browser/);
    assert.match(plugin, /title="Sound on"/);
});

test('Plyr clip control uses the official balanced Lucide scissors geometry', () => {
    assert.match(plugin, /<circle cx="6" cy="6" r="3"\/>/);
    assert.match(plugin, /M20 4 8\.12 15\.88/);
    assert.match(plugin, /<circle cx="6" cy="18" r="3"\/>/);
    assert.doesNotMatch(plugin, /12\.3-6\.3/);
});

test('mobile editor stays compact, bottom-mounted, and touch enabled', () => {
    assert.match(styles, /touch-action:\s*none/);
    assert.match(styles, /min-width:\s*44px/);
    assert.match(styles, /min-height:\s*44px/);
    assert.match(styles, /max-height:\s*200px/);
    assert.match(styles, /max-width:\s*760px/);
    assert.match(styles, /orientation:\s*landscape/);
    assert.doesNotMatch(styles, /left:\s*auto/);
});

test('dual rails use restrained Resolve-inspired colour and non-console timecodes', () => {
    assert.match(styles, /--clip-overview:\s*#6fa6d8/);
    assert.match(styles, /--clip-selection:\s*#4f8cc9/);
    assert.match(styles, /--clip-trim:\s*#f4f7fb/);
    assert.match(styles, /--clip-cti-color:\s*#ff5a3c/);
    assert.match(styles, /font-family:\s*"Oswald"/);
    assert.doesNotMatch(styles, /Consolas/);
});

test('Resolve-style trim surfaces use bare brackets, orange CTIs, and restrained cursors', () => {
    assert.match(styles, /\.clip-overview__playhead::before/);
    assert.match(styles, /\.clip-editor button\.clip-trim-handle\s*\{\s*cursor:\s*ew-resize/s);
    assert.match(styles, /\.clip-timeline\s*\{\s*height:\s*52px/s);
    assert.match(styles, /\.clip-timeline__selection::before[\s\S]*height:\s*18px/);
    assert.doesNotMatch(styles, /cursor:\s*crosshair/);
    assert.doesNotMatch(styles, /body\.clip-timeline-dragging\s*\{\s*cursor:/s);
    assert.match(plugin, /M20 2h-8v20h8/);
    assert.match(plugin, /M4 2h8v20H4/);
    assert.match(styles, /\.clip-trim-handle span\s*\{[\s\S]*top:\s*9px[\s\S]*height:\s*34px/);
});

test('trim brackets and CTI centre their hit targets on the same coordinates as the selection', () => {
    assert.match(styles, /\.clip-editor button\.clip-trim-handle,\s*\.clip-editor button\.clip-cti[\s\S]*width:\s*44px[\s\S]*height:\s*52px[\s\S]*margin:\s*0 0 0 -22px/);
    assert.match(styles, /\.clip-editor button\.clip-trim-handle,\s*\.clip-editor button\.clip-cti[\s\S]*overflow:\s*visible[\s\S]*pointer-events:\s*auto[\s\S]*touch-action:\s*none/);
    assert.doesNotMatch(styles, /\.clip-editor button\.clip-trim-handle,\s*\.clip-editor button\.clip-cti[\s\S]*?transform:\s*translateX\(-50%\)[\s\S]*?\.clip-editor button\.clip-trim-handle\s*\{/);
    assert.match(styles, /\.clip-trim-handle--start\s*\{\s*left:\s*var\(--clip-start\)/s);
    assert.match(styles, /\.clip-trim-handle--end\s*\{\s*left:\s*var\(--clip-end\)/s);
    assert.match(styles, /\.clip-cti\s*\{[\s\S]*left:\s*var\(--clip-playhead\)[\s\S]*z-index:\s*8/);
});

test('trim clicks remain stable and playback uses exact frame-aware loop monitoring', () => {
    assert.match(plugin, /grabOffset/);
    assert.match(plugin, /if \(!this\.activeDrag\.moved && this\.activeDrag\.kind !== 'playhead'\) return/);
    assert.match(plugin, /if \(!drag\.moved\)/);
    assert.match(plugin, /requestVideoFrameCallback/);
    assert.match(plugin, /scheduleSelectionBoundary/);
    assert.match(plugin, /this\.endSample\.timestamp/);
    assert.match(plugin, /restartLoopFromExactStart/);
    assert.match(plugin, /seekToSample\(this\.startSample/);
});

test('finishing an overview scrub leaves both CTIs on the resolved segment start', () => {
    const handler = plugin.match(/async endOverviewDrag\(event\)\s*\{[\s\S]*?\n        \}/)?.[0] || '';
    assert.match(handler, /await this\.seekToSample\(this\.startSample/);
    assert.match(handler, /this\.currentSample = this\.startSample/);
    assert.match(handler, /this\.updatePlayhead\(this\.startSample\.timestamp\)/);
});

test('the precision rail continuously crops and enlarges the overview colour map', () => {
    assert.match(plugin, /const TIMELINE_COLOUR_STOPS = \[[\s\S]*?#5d89a7[\s\S]*?#8077a4[\s\S]*?#b27d73/s);
    assert.match(plugin, /setTimelineColourMaps\(\)/);
    assert.match(plugin, /colourMapForRange\(this\.viewStart, this\.viewEnd\)/);
    assert.match(plugin, /this\.setTimelineWindow\(\(draft\.start \+ draft\.endBoundary\) \/ 2\);[\s\S]*?this\.renderTimelineDraft\(draft\.start, draft\.endBoundary, draft\.playhead\);/);
    assert.match(styles, /--clip-colour-map:\s*linear-gradient\(90deg, #5d89a7 0%, #8077a4 52%, #b27d73 100%\)/);
    assert.match(styles, /\.clip-overview__track\s*\{[\s\S]*?background:\s*var\(--clip-colour-map\)/);
    assert.match(styles, /\.clip-timeline__track\s*\{[\s\S]*?background:\s*var\(--clip-colour-map\)/);
});

test('clip editing taps cannot increment or carry into the Morb multiclick trigger', () => {
    assert.match(app, /classList\.contains\('clip-editor-active'\)/);
    assert.match(app, /tapCount = 0;\s*firstTapTime = 0;\s*return;/);
});

test('clip control mounts before source validation and validates lazily when opened', () => {
    const refreshSource = plugin.match(/async refreshSource\(\)\s*\{[\s\S]*?\n        \}/)?.[0] || '';
    const open = plugin.match(/async open\(\)\s*\{[\s\S]*?\n        \}/)?.[0] || '';
    assert.match(refreshSource, /this\.mountControl\(\)/);
    assert.doesNotMatch(refreshSource, /openSource\(/);
    assert.match(open, /await this\.service\.openSource\(openingUrl\)/);
    assert.match(open, /this\.setStatus\('Checking video and H\.264 export support…'\)/);
    assert.match(open, /this\.showPersistentErrorToast\(error\)/);
});

test('lazy source validation discards stale sessions after rapid source changes', () => {
    assert.match(plugin, /openingGeneration !== this\.sourceGeneration/);
    assert.match(plugin, /openingUrl !== \(this\.media\.currentSrc \|\| this\.media\.src\)/);
    assert.match(plugin, /session\.dispose\(\);\s*return;/);
});

test('clip failures dispatch a persistent reportable toast', () => {
    assert.match(plugin, /new CustomEvent\('chunkplayer:toast'/);
    assert.match(plugin, /persistent:\s*true/);
    assert.match(plugin, /AVC checks:/);
    assert.match(domService, /event\.detail\?\.persistent === true/);
    assert.match(domService, /toastClose\?\.toggleAttribute\('hidden', !persistent\)/);
    assert.match(adminService, /this\.domService\.showToast\(message, type\)/);
    assert.match(index, /id="toast-close"/);
    assert.match(mainStyles, /\.toast\s*\{[\s\S]*z-index:\s*7000/);
});

test('video surface keeps its theme until first playback then stays black for that source', () => {
    assert.match(domService, /addEventListener\('loadstart', resetVideoSurface\)/);
    assert.match(domService, /addEventListener\('emptied', resetVideoSurface\)/);
    assert.match(domService, /addEventListener\('playing', markVideoSurfacePlayed/);
    assert.match(mainStyles, /#video-frame\s*\{[\s\S]*--video-surface-background:\s*var\(--poster-color\)/);
    assert.match(mainStyles, /#video-frame\.video-has-played\s*\{\s*--video-surface-background:\s*#000/);
    assert.match(mainStyles, /#videoPlayer\s*\{[\s\S]*background-color:\s*var\(--video-surface-background\)/);
});
