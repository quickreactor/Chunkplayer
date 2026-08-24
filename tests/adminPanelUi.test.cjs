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
    assert.match(index, /app\.js\?v=utility-dock-20260825/);
});

test('admin controls are lifted into the shared pre-roll and post-roll utility dock', () => {
    assert.match(app, /this\.domService\.elements\.adminSection,[\s\S]*?document\.body\.appendChild\(element\)/);
    assert.match(app, /showPosterJokers\([\s\S]*?this\.showAdminSection\(\);[\s\S]*?this\.jokerPhysicsService\.mount\(count\)/);
    assert.match(index, /id="admin-section"[\s\S]*?id="admin-toggle-btn"[\s\S]*?archive-map-link[\s\S]*?id="joker-tilt-control"/);
});
