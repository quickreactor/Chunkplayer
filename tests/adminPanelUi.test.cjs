const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

test('admin panel closes on an outside pointer without disrupting its controls', () => {
    assert.match(app, /document\.addEventListener\('pointerdown'/);
    assert.match(app, /event\.composedPath\?\.\(\)/);
    assert.match(app, /eventPath\.includes\(panel\) \|\| panel\.contains\(target\)/);
    assert.match(app, /eventPath\.includes\(toggle\) \|\| toggle\?\.contains\(target\)/);
    assert.match(app, /target\?\.closest\('\.pcr-app'\)/);
    assert.match(app, /this\.setAdminPanelOpen\(false\)/);
    assert.match(app, /\{ capture: true \}/);
});

test('admin panel helper synchronizes visibility, accessibility, and picker cleanup', () => {
    assert.match(app, /setAdminPanelOpen\(isOpen\)/);
    assert.match(app, /panel\.classList\.toggle\('hidden', !isOpen\)/);
    assert.match(app, /toggle\.setAttribute\('aria-expanded', String\(isOpen\)\)/);
    assert.match(app, /this\.logoBgPickr\?\.hide\?\.\(\)/);
    assert.match(index, /app\.js\?v=refresh-daily-data-20260922/);
});

test('admin controls use in-page slots without becoming a floating dock', () => {
    const showPosterJokersMethod = app.match(/showPosterJokers\([^)]*\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
    assert.doesNotMatch(app, /this\.domService\.elements\.adminSection,[\s\S]*?document\.body\.appendChild\(element\)/);
    assert.doesNotMatch(showPosterJokersMethod, /this\.showAdminSection\(\)/);
    assert.match(showPosterJokersMethod, /this\.jokerPhysicsService\.mount\(count\)/);
    assert.match(index, /class="container hidden"[\s\S]*?id="admin-section"[\s\S]*?id="admin-toggle-btn"[\s\S]*?archive-map-link/);
});

test('controls move from the roll screen to the player with tilt hidden and disabled', () => {
    const vm = require('node:vm');
    const method = app.match(/    showAdminSection\([^)]*\)\s*\{[\s\S]*?\n    \}/)[0];
    const makeSlot = () => ({ appendChild(element) { element.parentElement = this; } });
    const prerollSlot = makeSlot();
    const playerSlot = makeSlot();
    const hidden = new Set(['hidden']);
    const elements = {
        container: playerSlot,
        adminSection: { parentElement: playerSlot, classList: { remove(name) { hidden.delete(name); } } },
        jokerTiltControl: { hidden: false, disabled: false }
    };
    const controls = vm.runInNewContext(`({ ${method} })`, {
        document: { getElementById(id) { assert.equal(id, 'preroll-controls'); return prerollSlot; } }
    });
    controls.domService = { elements };
    controls.adminService = { getClearance: () => 0 };

    controls.showAdminSection(true);
    assert.equal(elements.adminSection.parentElement, prerollSlot);
    assert.equal(hidden.has('hidden'), false);
    assert.equal(elements.jokerTiltControl.hidden, false);

    controls.showAdminSection();
    assert.equal(elements.adminSection.parentElement, playerSlot);
    assert.equal(hidden.has('hidden'), false);
    assert.equal(elements.jokerTiltControl.hidden, true);
    assert.equal(elements.jokerTiltControl.disabled, true);
});

test('Level 2 exposes the daily-data refresh control and Debug helper', () => {
    const apiService = fs.readFileSync(path.join(projectRoot, 'services', 'apiService.js'), 'utf8');
    const domService = fs.readFileSync(path.join(projectRoot, 'services', 'domService.js'), 'utf8');
    assert.match(index, /id="refresh-daily-data-btn"[^>]*>Refresh Daily Data</);
    assert.match(domService, /adminRefreshDailyDataBtn: document\.getElementById\("refresh-daily-data-btn"\)/);
    assert.match(apiService, /adminFetch\('\/refresh-daily-data', \{ method: 'POST' \}\)/);
    assert.match(app, /async refreshDailyData\(\)/);
    assert.match(app, /await Debug\.refreshDailyData\(\)/);
});
