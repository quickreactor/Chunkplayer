const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const { JokerPhysicsService } = require('../services/jokerPhysicsService.js');

function createClassList() {
    const values = new Set();
    return {
        add: (...names) => names.forEach(name => values.add(name)),
        remove: (...names) => names.forEach(name => values.delete(name)),
        contains: name => values.has(name)
    };
}

function createButton() {
    return {
        hidden: false,
        disabled: false,
        dataset: {},
        textContent: '',
        classList: createClassList(),
        attributes: {},
        addEventListener() {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        }
    };
}

function installBrowserMocks({ permission } = {}) {
    const listeners = new Map();
    class DeviceMotionEventMock {}
    if (permission) {
        DeviceMotionEventMock.requestPermission = async () => permission;
    }

    global.window = {
        DeviceMotionEvent: DeviceMotionEventMock,
        innerHeight: 800,
        orientation: 0,
        screen: { orientation: { angle: 0 } },
        matchMedia: query => ({
            matches: query.includes('max-width') || !query.includes('reduced-motion')
        }),
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
        removeEventListener(type) {
            listeners.delete(type);
        }
    };
    global.Matter = {
        Sleeping: {
            set(body, sleeping) {
                body.isSleeping = sleeping;
            }
        },
        Composite: {
            add() {},
            remove() {},
            clear() {}
        },
        Engine: { clear() {} }
    };
    return listeners;
}

function createService(options = {}) {
    installBrowserMocks(options);
    const service = new JokerPhysicsService({}, {}, null, createButton());
    service.active = true;
    service.engine = { gravity: { x: 0, y: 1, scale: 0.0015 }, world: {} };
    // Prevent the unit tests from starting a real animation frame.
    service.frameId = 1;
    return service;
}

test('steering angles cover neutral, sideways, and unrestricted inversion', () => {
    assert.equal(JokerPhysicsService.getSteeringAngle(0, 9.8), 0);
    assert.ok(Math.abs(JokerPhysicsService.getSteeringAngle(9.8, 0) + Math.PI / 2) < 1e-9);
    assert.ok(Math.abs(JokerPhysicsService.getSteeringAngle(-9.8, 0) - Math.PI / 2) < 1e-9);
    assert.equal(Math.abs(JokerPhysicsService.getSteeringAngle(0, -9.8)), Math.PI);
    assert.equal(JokerPhysicsService.getSteeringAngle(null, 9.8), null);
    assert.equal(JokerPhysicsService.getSteeringAngle(0.1, 0.1), null);
});

test('gravity axes are remapped for every screen orientation', () => {
    assert.deepEqual(JokerPhysicsService.remapGravityForScreen(2, 7, 0), { x: 2, y: 7 });
    assert.deepEqual(JokerPhysicsService.remapGravityForScreen(2, 7, 90), { x: -7, y: 2 });
    assert.deepEqual(JokerPhysicsService.remapGravityForScreen(2, 7, 180), { x: -2, y: -7 });
    assert.deepEqual(JokerPhysicsService.remapGravityForScreen(2, 7, 270), { x: 7, y: -2 });
});

test('angle smoothing takes the shortest route across the wrap boundary', () => {
    const degrees = value => value * Math.PI / 180;
    const result = JokerPhysicsService.smoothAngle(degrees(179), degrees(-179), 0.5);
    assert.ok(Math.abs(Math.abs(result) - Math.PI) < 1e-9);
    assert.ok(Math.abs(JokerPhysicsService.normalizeAngle(degrees(361)) - degrees(1)) < 1e-9);
});

test('motion readings calibrate neutral then converge on one-to-one sideways gravity', () => {
    const service = createService();
    service.handleDeviceMotion({ accelerationIncludingGravity: { x: 0, y: 9.8 } });
    for (let index = 0; index < 80; index++) {
        service.handleDeviceMotion({ accelerationIncludingGravity: { x: 9.8, y: 0 } });
    }

    assert.equal(service.tiltEnabled, true);
    assert.equal(service.tiltControl.textContent, 'TILT ACTIVE');
    assert.ok(service.engine.gravity.x < -1.499);
    assert.ok(Math.abs(service.engine.gravity.y) < 0.01);
});

test('incoming jokers retain downward gravity before unrestricted inversion unlocks', () => {
    const service = createService();
    service.tiltEnabled = true;
    service.tiltSmoothedAngle = Math.PI;
    service.bodies = [{
        body: { plugin: { isEntering: true }, isSleeping: true }
    }];

    service.applyTiltGravity(true);
    assert.equal(service.engine.gravity.y, 0.18);

    service.bodies[0].body.plugin.isEntering = false;
    service.applyTiltGravity(true);
    assert.equal(service.engine.gravity.y, -1);
    assert.equal(service.bodies[0].body.isSleeping, false);
});

test('horizontal tilt is amplified by one and a half without changing vertical gravity', () => {
    const service = createService();
    service.tiltEnabled = true;
    service.tiltSmoothedAngle = Math.PI / 4;

    service.applyTiltGravity(true);
    assert.ok(Math.abs(service.engine.gravity.x - 1.5 * Math.SQRT1_2) < 1e-9);
    assert.ok(Math.abs(service.engine.gravity.y - Math.SQRT1_2) < 1e-9);
});

test('Firefox-style access starts without an explicit permission method', async () => {
    const listeners = installBrowserMocks();
    const service = new JokerPhysicsService({}, {}, null, createButton());
    service.active = true;
    service.engine = { gravity: { x: 0, y: 1 }, world: {} };
    service.frameId = 1;

    await service.handleTiltControlClick();
    assert.equal(service.tiltListening, true);
    assert.equal(listeners.has('devicemotion'), true);
    assert.equal(service.tiltControl.textContent, 'MOVE PHONE');
    service.stopTiltListening();
});

test('denied permission leaves default gravity and reports the blocked state', async () => {
    const service = createService({ permission: 'denied' });
    await service.handleTiltControlClick();

    assert.equal(service.tiltListening, false);
    assert.deepEqual(service.engine.gravity, { x: 0, y: 1, scale: 0.0015 });
    assert.equal(service.tiltControl.textContent, 'TILT BLOCKED');
    clearTimeout(service.tiltStatusTimer);
});

test('critical-fail release freezes tilt and restores downward gravity', () => {
    const service = createService();
    service.tiltEnabled = true;
    service.tiltListening = true;
    service.engine.gravity.x = 0.8;
    service.engine.gravity.y = -0.6;
    service.bodies = [];
    service.boundaries = [];

    service.release();
    assert.equal(service.tiltFrozen, true);
    assert.equal(service.tiltListening, false);
    assert.equal(service.engine.gravity.x, 0);
    assert.equal(service.engine.gravity.y, 1);
});

test('tilt UI sits beneath the punishment poster and fades from the roll flow', () => {
    const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
    const diceFlow = fs.readFileSync(
        path.join(projectRoot, 'useCases', 'diceRollUseCase.js'),
        'utf8'
    );

    assert.match(index, /id="joker-tilt-control"/);
    assert.match(index, /class="admin-icon-button tilt-icon-button"/);
    assert.match(index, /class="tilt-phone-icon"/);
    assert.match(index, /data-tilt-label/);
    assert.match(index, /id="poster-container-2"[\s\S]*?id="joker-tilt-control"[\s\S]*?<\/div>[\s\S]*?<\/div>\s*<div class="container hidden">/);
    assert.match(styles, /#joker-tilt-control\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*100%;/);
    assert.match(styles, /\.admin-section\s*\{[\s\S]*?position:\s*relative/);
    assert.match(styles, /\.tilt-phone-body/);
    assert.match(styles, /@keyframes tilt-phone-listen/);
    assert.match(styles, /tilt-control--fading/);
    assert.match(styles, /prefers-reduced-motion:\s*reduce/);
    assert.match(diceFlow, /jokerPhysicsService\.fadeTiltControl\(\)/);
});
