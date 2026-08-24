// ====================
// JOKER PHYSICS SERVICE
// ====================

/**
 * Uses Matter.js to drop Joker cards into the punishment poster.
 * A fixed DOM layer tracks the poster without affecting document scroll size,
 * while matching Matter bodies provide collision, stacking, and sleeping.
 */
class JokerPhysicsService {
    constructor(posterContainer, posterImage, audioService, tiltControl = null) {
        this.posterContainer = posterContainer;
        this.posterImage = posterImage;
        this.audioService = audioService;
        this.tiltControl = tiltControl;
        this.viewportLayer = null;
        this.overlay = null;
        this.engine = null;
        this.bodies = [];
        this.boundaries = [];
        this.frameId = null;
        this.anchorFrameId = null;
        this.spawnTimers = [];
        this.pendingSpawns = 0;
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedStep = 1000 / 60;
        this.floorEnabled = true;
        this.active = false;
        this.targetCount = 0;
        this.width = 0;
        this.height = 0;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.resizeObserver = null;
        this.tiltListening = false;
        this.tiltEnabled = false;
        this.tiltFrozen = false;
        this.tiltBaselineAngle = null;
        this.tiltSmoothedAngle = 0;
        this.tiltAppliedAngle = 0;
        this.tiltHorizontalStrength = 1.5;
        this.lastRawTiltAngle = null;
        this.tiltReadingTimer = null;
        this.tiltStatusTimer = null;
        this.tiltFadeTimer = null;
        this.boundDeviceMotion = event => this.handleDeviceMotion(event);
        this.boundTiltControlClick = () => void this.handleTiltControlClick();

        this.tiltControl?.addEventListener('click', this.boundTiltControlClick);

        this.imageSources = [
            'images/jokers/jokerhammil.jpg',
            'images/jokers/jokerhammil2.jpg',
            'images/jokers/jokerheath.jpg',
            'images/jokers/jokerheath2.jpg',
            'images/jokers/jokerjack.jpg',
            'images/jokers/jokerjack2.jpg',
            'images/jokers/jokerleto.jpg',
            'images/jokers/jokerleto2.jpg',
            'images/jokers/jokermorag.jpg',
            'images/jokers/jokermorag2.jpg',
            'images/jokers/jokeromero.jpg',
            'images/jokers/jokeromero2.jpg',
            'images/jokers/jokerphoenix.jpg',
            'images/jokers/jokerphoeni2x.jpg',
            'images/jokers/jokertoon1.jpg',
            'images/jokers/jokertoon2.jpg',
            'images/jokers/jokerbonus1.jpeg',
            'images/jokers/jokerbonus2.jpeg',
            'images/jokers/jokerbonus3.jpeg',
            'images/jokers/jokerbonus4.jpeg',
            'images/jokers/jokerbonus5.jpeg',
            'images/jokers/jokerbonus6.jpeg'
        ];
    }

    static normalizeAngle(angle) {
        let normalized = angle;
        while (normalized > Math.PI) normalized -= Math.PI * 2;
        while (normalized <= -Math.PI) normalized += Math.PI * 2;
        return normalized;
    }

    static smoothAngle(current, target, amount = 0.18) {
        const difference = JokerPhysicsService.normalizeAngle(target - current);
        return JokerPhysicsService.normalizeAngle(current + difference * amount);
    }

    static remapGravityForScreen(x, y, orientationAngle = 0) {
        const angle = ((Number(orientationAngle) || 0) % 360 + 360) % 360;
        if (angle === 90) return { x: -y, y: x };
        if (angle === 180) return { x: -x, y: -y };
        if (angle === 270) return { x: y, y: -x };
        return { x, y };
    }

    static getSteeringAngle(x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (Math.hypot(x, y) < 2.5) return null;
        // Device acceleration and the poster's visual x-axis have opposite
        // handedness: leaning the phone left should pull the pile left.
        const angle = Math.atan2(-x, y);
        return Object.is(angle, -0) ? 0 : angle;
    }

    async mount(count) {
        if (!this.posterContainer || !this.posterImage) return;
        if (typeof Matter === 'undefined') {
            console.error('Matter.js is required for Joker poster physics.');
            return;
        }

        this.unmount();
        this.active = true;
        this.floorEnabled = true;
        this.tiltFrozen = false;
        this.targetCount = Math.max(0, Number(count) || 0);
        await this.waitForPoster();
        if (!this.active) return;

        this.viewportLayer = document.createElement('div');
        this.viewportLayer.className = 'joker-physics-viewport';
        this.viewportLayer.setAttribute('aria-hidden', 'true');
        this.overlay = document.createElement('div');
        this.overlay.className = 'joker-physics-layer';
        this.viewportLayer.appendChild(this.overlay);
        document.body.appendChild(this.viewportLayer);
        this.positionOverlay();
        this.createWorld();
        this.startAnchorTracking();
        this.setupTiltControl();

        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.posterImage);

        if (this.reducedMotion) {
            for (let i = 0; i < this.targetCount; i++) this.spawn(true);
            this.arrangeSettledPile();
            this.render();
            return;
        }

        const spawnInterval = 85;
        for (let i = 0; i < this.targetCount; i++) {
            this.scheduleSpawn(i * spawnInterval);
        }
        this.startLoop();
    }

    waitForPoster() {
        if (this.posterImage.complete && this.posterImage.naturalWidth > 0) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            const done = () => resolve();
            this.posterImage.addEventListener('load', done, { once: true });
            this.posterImage.addEventListener('error', done, { once: true });
        });
    }

    positionOverlay() {
        if (!this.overlay) return;
        const rect = this.posterImage.getBoundingClientRect();
        this.overlay.style.left = `${rect.left}px`;
        this.overlay.style.top = `${rect.top}px`;
        this.overlay.style.width = `${rect.width}px`;
        this.overlay.style.height = `${rect.height}px`;
        this.width = rect.width;
        this.height = rect.height;
        this.syncOverlayAppearance();
    }

    syncOverlayAppearance() {
        if (!this.overlay) return;
        let opacity = 1;
        let visible = true;
        let element = this.posterImage;

        while (element && element !== document.documentElement) {
            const style = getComputedStyle(element);
            opacity *= Number.parseFloat(style.opacity) || 0;
            if (style.display === 'none' || style.visibility === 'hidden') {
                visible = false;
            }
            element = element.parentElement;
        }

        this.overlay.style.opacity = String(opacity);
        this.overlay.style.visibility = visible ? 'visible' : 'hidden';
    }

    startAnchorTracking() {
        if (this.anchorFrameId) return;

        const track = () => {
            if (!this.active || !this.overlay) {
                this.anchorFrameId = null;
                return;
            }

            const rect = this.posterImage.getBoundingClientRect();
            this.overlay.style.left = `${rect.left}px`;
            this.overlay.style.top = `${rect.top}px`;
            this.overlay.style.width = `${rect.width}px`;
            this.overlay.style.height = `${rect.height}px`;
            this.syncOverlayAppearance();
            this.anchorFrameId = requestAnimationFrame(track);
        };

        this.anchorFrameId = requestAnimationFrame(track);
    }

    createWorld() {
        this.engine = Matter.Engine.create({ enableSleeping: true });
        this.engine.enableSleeping = true;
        this.engine.gravity.x = 0;
        this.engine.gravity.y = 1;
        this.engine.gravity.scale = 0.0015;
        Matter.Events.on(this.engine, 'collisionStart', event => {
            this.handleEnteringContacts(event.pairs);
            this.handleLandingContacts(event.pairs);
        });
        Matter.Events.on(this.engine, 'collisionActive', event => {
            this.handleLandingContacts(event.pairs);
        });
        this.rebuildBoundaries();
    }

    isTiltLayoutSupported() {
        return !this.reducedMotion &&
            window.matchMedia('(max-width: 768px)').matches &&
            typeof window.DeviceMotionEvent !== 'undefined';
    }

    setupTiltControl() {
        if (!this.tiltControl) return;

        clearTimeout(this.tiltFadeTimer);
        this.tiltFadeTimer = null;
        this.tiltControl.classList.remove('tilt-control--fading');
        this.tiltControl.disabled = false;
        this.tiltControl.hidden = !this.isTiltLayoutSupported();
        this.setTiltControlState('idle', 'ENABLE TILT');

        if (!this.tiltControl.hidden) {
            // Firefox Android and browsers with an existing grant can begin
            // delivering events immediately. Permission-gated browsers stay
            // idle until the same listener is authorized by the button tap.
            this.startTiltListening();
        }
    }

    setTiltControlState(state, label) {
        if (!this.tiltControl) return;
        this.tiltControl.dataset.state = state;
        const accessibleLabel = state === 'active' ? 'Tilt active. Tap to recenter.' : label;
        const labelElement = this.tiltControl.querySelector?.('[data-tilt-label]');
        if (labelElement) {
            labelElement.textContent = label;
        } else {
            // Preserve simple test and non-HTML host compatibility.
            this.tiltControl.textContent = label;
        }
        this.tiltControl.setAttribute('aria-label', accessibleLabel);
        this.tiltControl.setAttribute('aria-pressed', String(state === 'active'));
        this.tiltControl.setAttribute('title', accessibleLabel);
    }

    startTiltListening() {
        if (this.tiltListening || !this.isTiltLayoutSupported()) return;
        window.addEventListener('devicemotion', this.boundDeviceMotion, { passive: true });
        this.tiltListening = true;
    }

    stopTiltListening() {
        if (this.tiltListening) {
            window.removeEventListener('devicemotion', this.boundDeviceMotion);
        }
        this.tiltListening = false;
        clearTimeout(this.tiltReadingTimer);
        this.tiltReadingTimer = null;
    }

    async handleTiltControlClick() {
        if (!this.active || !this.isTiltLayoutSupported() || this.tiltFrozen) return;

        if (this.tiltEnabled) {
            this.recalibrateTilt();
            return;
        }

        try {
            const requestPermission = window.DeviceMotionEvent?.requestPermission;
            if (typeof requestPermission === 'function') {
                const permission = await requestPermission.call(window.DeviceMotionEvent);
                if (permission !== 'granted') {
                    this.showTemporaryTiltStatus('blocked', 'TILT BLOCKED');
                    return;
                }
            }

            this.startTiltListening();
            this.setTiltControlState('waiting', 'MOVE PHONE');
            clearTimeout(this.tiltReadingTimer);
            this.tiltReadingTimer = setTimeout(() => {
                if (!this.tiltEnabled) {
                    this.showTemporaryTiltStatus('unavailable', 'TILT UNAVAILABLE');
                }
            }, 1800);
        } catch (error) {
            console.warn('Unable to enable Joker tilt control.', error);
            this.showTemporaryTiltStatus('blocked', 'TILT BLOCKED');
        }
    }

    showTemporaryTiltStatus(state, label) {
        this.setTiltControlState(state, label);
        clearTimeout(this.tiltStatusTimer);
        this.tiltStatusTimer = setTimeout(() => {
            if (!this.tiltEnabled && this.active && this.tiltControl) {
                this.setTiltControlState('idle', 'ENABLE TILT');
            }
        }, 1800);
    }

    getScreenOrientationAngle() {
        return window.screen?.orientation?.angle ?? window.orientation ?? 0;
    }

    handleDeviceMotion(event) {
        if (!this.active || !this.engine || this.tiltFrozen) return;

        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;
        const remapped = JokerPhysicsService.remapGravityForScreen(
            acceleration.x,
            acceleration.y,
            this.getScreenOrientationAngle()
        );
        const rawAngle = JokerPhysicsService.getSteeringAngle(remapped.x, remapped.y);
        if (rawAngle === null) return;

        this.lastRawTiltAngle = rawAngle;
        clearTimeout(this.tiltReadingTimer);
        this.tiltReadingTimer = null;

        if (this.tiltBaselineAngle === null) {
            this.tiltBaselineAngle = rawAngle;
            this.tiltSmoothedAngle = 0;
            this.tiltAppliedAngle = 0;
        }

        const relativeAngle = JokerPhysicsService.normalizeAngle(
            rawAngle - this.tiltBaselineAngle
        );
        this.tiltSmoothedAngle = JokerPhysicsService.smoothAngle(
            this.tiltSmoothedAngle,
            relativeAngle
        );

        if (!this.tiltEnabled) {
            this.tiltEnabled = true;
            this.setTiltControlState('active', 'TILT ACTIVE');
        }
        this.applyTiltGravity();
    }

    recalibrateTilt() {
        if (this.lastRawTiltAngle === null) return;
        this.tiltBaselineAngle = this.lastRawTiltAngle;
        this.tiltSmoothedAngle = 0;
        this.tiltAppliedAngle = 0;
        this.applyTiltGravity(true);
        this.setTiltControlState('active', 'TILT ACTIVE');
    }

    hasIncomingJokers() {
        return this.pendingSpawns > 0 || this.bodies.some(
            record => record.body.plugin?.isEntering
        );
    }

    applyTiltGravity(force = false) {
        if (!this.engine || !this.tiltEnabled || this.tiltFrozen) return;
        const change = Math.abs(JokerPhysicsService.normalizeAngle(
            this.tiltSmoothedAngle - this.tiltAppliedAngle
        ));
        if (!force && change < Math.PI / 240) return; // Three quarters of a degree.

        const angle = this.tiltSmoothedAngle;
        this.engine.gravity.x = Math.sin(angle) * this.tiltHorizontalStrength;
        this.engine.gravity.y = this.hasIncomingJokers()
            ? Math.max(0.18, Math.cos(angle))
            : Math.cos(angle);
        this.tiltAppliedAngle = angle;

        for (const record of this.bodies) {
            Matter.Sleeping.set(record.body, false);
        }
        this.startLoop();
    }

    resetGravity() {
        if (!this.engine) return;
        this.engine.gravity.x = 0;
        this.engine.gravity.y = 1;
        this.tiltAppliedAngle = 0;
    }

    fadeTiltControl() {
        if (!this.tiltControl || this.tiltControl.hidden) return;
        this.tiltControl.disabled = true;
        this.tiltControl.classList.add('tilt-control--fading');
        clearTimeout(this.tiltFadeTimer);
        this.tiltFadeTimer = setTimeout(() => {
            if (this.tiltControl) this.tiltControl.hidden = true;
        }, 450);
    }

    handleEnteringContacts(pairs) {
        for (const pair of pairs) {
            if (!pair.bodyA.plugin?.isJoker || !pair.bodyB.plugin?.isJoker) continue;

            const aIsEntering = pair.bodyA.plugin.isEntering;
            const bIsEntering = pair.bodyB.plugin.isEntering;
            if (aIsEntering && !bIsEntering) {
                pair.bodyA.plugin.isEntering = false;
            } else if (bIsEntering && !aIsEntering) {
                pair.bodyB.plugin.isEntering = false;
            }
        }
    }

    handleLandingContacts(pairs) {
        if (!this.floorEnabled) return;

        const floorContacts = [];
        const jokerContacts = [];

        for (const pair of pairs) {
            const bodyAIsJoker = pair.bodyA.plugin?.isJoker;
            const bodyBIsJoker = pair.bodyB.plugin?.isJoker;
            const bodyAIsFloor = pair.bodyA.plugin?.isJokerFloor;
            const bodyBIsFloor = pair.bodyB.plugin?.isJokerFloor;

            if (bodyAIsJoker && bodyBIsFloor) {
                floorContacts.push(pair.bodyA);
            } else if (bodyBIsJoker && bodyAIsFloor) {
                floorContacts.push(pair.bodyB);
            } else if (bodyAIsJoker && bodyBIsJoker) {
                jokerContacts.push([pair.bodyA, pair.bodyB]);
            }
        }

        for (const body of floorContacts) {
            this.markJokerLanded(body);
        }

        // Propagate landing through every currently connected Joker contact.
        // collisionActive covers cards that touched before the lower card was
        // grounded, while hasLanded prevents rebounds or pile shifts replaying.
        let landedAnotherJoker = true;
        while (landedAnotherJoker) {
            landedAnotherJoker = false;
            for (const [bodyA, bodyB] of jokerContacts) {
                if (bodyA.plugin.hasLanded && !bodyB.plugin.hasLanded) {
                    landedAnotherJoker = this.markJokerLanded(bodyB) || landedAnotherJoker;
                } else if (bodyB.plugin.hasLanded && !bodyA.plugin.hasLanded) {
                    landedAnotherJoker = this.markJokerLanded(bodyA) || landedAnotherJoker;
                }
            }
        }
    }

    markJokerLanded(body) {
        if (!body.plugin?.isJoker || body.plugin.hasLanded) return false;

        body.plugin.hasLanded = true;
        this.audioService?.playJokerImpactSound?.();
        return true;
    }

    rebuildBoundaries() {
        if (!this.engine || !this.width || !this.height) return;

        if (this.boundaries.length) {
            for (const boundary of this.boundaries) {
                Matter.Composite.remove(this.engine.world, boundary);
            }
        }
        this.boundaries = [];

        if (!this.floorEnabled) return;

        const sideThickness = 10;
        const capHeight = 22;
        const floorThickness = 80;
        const containmentInset = 2;
        const wallOptions = () => ({
            isStatic: true,
            friction: 0.9,
            restitution: 0
        });
        const floorOptions = {
            isStatic: true,
            friction: 0.9,
            restitution: 0,
            plugin: {
                isJokerFloor: true
            }
        };

        const mainWallHeight = this.height - capHeight + 2;
        const mainWallY = capHeight - 2 + mainWallHeight / 2;
        const leftWallX = containmentInset - sideThickness / 2;
        const rightWallX = this.width - containmentInset + sideThickness / 2;
        const leftWall = Matter.Bodies.rectangle(
            leftWallX, mainWallY, sideThickness, mainWallHeight, wallOptions()
        );
        const rightWall = Matter.Bodies.rectangle(
            rightWallX, mainWallY, sideThickness, mainWallHeight, wallOptions()
        );
        const leftCap = Matter.Bodies.trapezoid(
            leftWallX, capHeight / 2, sideThickness, capHeight, 0.999, wallOptions()
        );
        const rightCap = Matter.Bodies.trapezoid(
            rightWallX, capHeight / 2, sideThickness, capHeight, 0.999, wallOptions()
        );
        leftCap.label = 'Joker Rim Cap';
        rightCap.label = 'Joker Rim Cap';
        const floor = Matter.Bodies.rectangle(
            this.width / 2,
            this.height - containmentInset + floorThickness / 2,
            this.width - containmentInset * 2,
            floorThickness,
            floorOptions
        );

        this.boundaries = [leftWall, rightWall, leftCap, rightCap, floor];
        Matter.Composite.add(this.engine.world, this.boundaries);
    }

    handleResize() {
        if (!this.overlay) return;
        const previousWidth = this.width;
        const previousHeight = this.height;
        this.positionOverlay();

        if (!this.engine ||
            (Math.abs(previousWidth - this.width) < 0.5 &&
             Math.abs(previousHeight - this.height) < 0.5)) {
            return;
        }

        this.rebuildBoundaries();
        for (const record of this.bodies) {
            if (record.spilled) continue;
            const halfWidth = (record.body.bounds.max.x - record.body.bounds.min.x) / 2;
            const halfHeight = (record.body.bounds.max.y - record.body.bounds.min.y) / 2;
            const position = {
                x: Math.max(halfWidth, Math.min(this.width - halfWidth, record.body.position.x)),
                y: this.floorEnabled
                    ? Math.min(this.height - halfHeight, record.body.position.y)
                    : record.body.position.y
            };
            Matter.Body.setPosition(record.body, position);
            Matter.Sleeping.set(record.body, false);
        }
        this.startLoop();
    }

    setCount(count) {
        if (!this.active) return false;
        const nextCount = Math.max(0, Number(count) || 0);
        const difference = nextCount - this.targetCount;
        this.targetCount = nextCount;

        if (difference > 0) {
            for (let i = 0; i < difference; i++) this.scheduleSpawn(i * 120);
            this.startLoop();
        } else if (difference < 0) {
            const removed = this.bodies.splice(nextCount);
            for (const record of removed) {
                Matter.Composite.remove(this.engine.world, record.body);
                record.element.remove();
            }
        }
        return difference > 0;
    }

    scheduleSpawn(delay) {
        this.pendingSpawns += 1;
        this.applyTiltGravity(true);
        const timer = setTimeout(() => {
            this.pendingSpawns -= 1;
            this.spawn(this.reducedMotion);
            if (this.reducedMotion) {
                this.arrangeSettledPile();
                this.render();
            } else {
                this.startLoop();
            }
        }, delay);
        this.spawnTimers.push(timer);
    }

    spawn(settled = false) {
        if (!this.active || !this.overlay || !this.engine || !this.width || !this.height) return;

        const baseSize = Math.max(
            14,
            Math.min(46, Math.sqrt((this.width * this.height) / Math.max(this.targetCount, 1)) * 0.72)
        );
        const isMobileLayout = window.matchMedia('(max-width: 768px)').matches;
        const sizeMultiplier = isMobileLayout ? 0.675 : 2;
        const size = baseSize * sizeMultiplier;
        const halfSize = size / 2;
        const overlayRect = this.overlay.getBoundingClientRect();
        const angle = Math.random() * Math.PI * 2;
        // Use the square's largest possible rotated extent, rather than its
        // extent at the initial angle. It therefore remains over the poster
        // throughout freefall even while spinning.
        const spawnInset = halfSize * Math.SQRT2 + 4;
        const availableSpawnWidth = Math.max(0, this.width - spawnInset * 2);
        const x = availableSpawnWidth > 0
            ? spawnInset + Math.random() * availableSpawnWidth
            : this.width / 2;
        const y = settled
            ? this.height - halfSize
            : -overlayRect.top - halfSize - Math.random() * 120;
        const chamferRadius = Math.min(3, size * 0.04);

        const body = Matter.Bodies.rectangle(x, y, size, size, {
            angle,
            chamfer: { radius: chamferRadius },
            friction: 0.75,
            frictionStatic: 1.2,
            frictionAir: 0.01,
            restitution: 0.03,
            density: 0.002,
            sleepThreshold: 30,
            plugin: {
                isJoker: true,
                isEntering: !settled,
                hasLanded: settled,
                spawnX: x
            }
        });
        Matter.Body.setInertia(body, body.inertia * (2.5 + Math.random() * 1.5));
        Matter.Body.setVelocity(body, {
            x: 0,
            y: 0
        });
        Matter.Body.setAngularVelocity(
            body,
            (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.12)
        );

        const card = document.createElement('div');
        card.className = 'joker-physics-card';
        card.style.width = `${size}px`;
        card.style.height = `${size}px`;

        const img = document.createElement('img');
        img.src = this.imageSources[Math.floor(Math.random() * this.imageSources.length)];
        img.alt = '';
        card.appendChild(img);
        this.overlay.appendChild(card);

        Matter.Composite.add(this.engine.world, body);
        this.bodies.push({
            body,
            element: card,
            halfSize,
            spilled: false
        });
        if (settled) Matter.Sleeping.set(body, true);
        this.renderRecord(this.bodies[this.bodies.length - 1]);
    }

    arrangeSettledPile() {
        if (!this.engine || !this.width || !this.height) return;
        for (let index = 0; index < this.bodies.length; index++) {
            const record = this.bodies[index];
            const size = record.halfSize * 2;
            const columns = Math.max(1, Math.floor(this.width / size));
            const column = index % columns;
            const row = Math.floor(index / columns);
            Matter.Body.setPosition(record.body, {
                x: record.halfSize + column * size,
                y: this.height - record.halfSize - row * size
            });
            Matter.Body.setAngle(record.body, Math.random() * Math.PI * 2);
            Matter.Body.setVelocity(record.body, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(record.body, 0);
            Matter.Sleeping.set(record.body, true);
        }
    }

    startLoop() {
        if (this.frameId || this.reducedMotion || !this.engine) return;
        this.lastTime = performance.now();

        const frame = now => {
            if (!this.active || !this.engine) {
                this.frameId = null;
                return;
            }

            const elapsed = Math.min(now - this.lastTime, 50);
            this.lastTime = now;
            this.accumulator += elapsed;

            while (this.accumulator >= this.fixedStep) {
                Matter.Engine.update(this.engine, this.fixedStep);
                this.stabilizeIncomingBodies();
                this.accumulator -= this.fixedStep;
            }
            this.render();

            const allSleeping = this.floorEnabled &&
                this.pendingSpawns === 0 &&
                (this.bodies.length === 0 ||
                 this.bodies.every(record => record.body.isSleeping));
            if (allSleeping) {
                this.frameId = null;
                return;
            }
            this.frameId = requestAnimationFrame(frame);
        };

        this.frameId = requestAnimationFrame(frame);
    }

    stabilizeIncomingBodies() {
        let jokerFinishedEntering = false;
        for (const record of this.bodies) {
            const body = record.body;
            if (!body.plugin.isEntering) continue;
            if (body.bounds.max.y >= 0) {
                body.plugin.isEntering = false;
                jokerFinishedEntering = true;
                continue;
            }

            Matter.Body.setPosition(body, {
                x: body.plugin.spawnX,
                y: body.position.y
            });
            Matter.Body.setVelocity(body, {
                x: 0,
                y: body.velocity.y
            });
        }

        if (jokerFinishedEntering && !this.hasIncomingJokers()) {
            this.applyTiltGravity(true);
        }
    }

    render() {
        for (const record of this.bodies) {
            if (record.body.bounds.max.x < 0 || record.body.bounds.min.x > this.width) {
                record.spilled = true;
            }
            this.renderRecord(record);
        }

        const overlayTop = this.overlay.getBoundingClientRect().top;
        const escaped = this.bodies.filter(record => {
            const escapedBelow =
                overlayTop + record.body.bounds.min.y > window.innerHeight + 40;
            const escapedAbove = !record.body.plugin?.isEntering &&
                overlayTop + record.body.bounds.max.y < -40;
            return escapedBelow || escapedAbove;
        });
        for (const record of escaped) {
            Matter.Composite.remove(this.engine.world, record.body);
            record.element.remove();
        }
        this.bodies = this.bodies.filter(record => {
            const remainsAboveBottom =
                overlayTop + record.body.bounds.min.y <= window.innerHeight + 40;
            const remainsBelowTop = record.body.plugin?.isEntering ||
                overlayTop + record.body.bounds.max.y >= -40;
            return remainsAboveBottom && remainsBelowTop;
        });
    }

    renderRecord(record) {
        const degrees = record.body.angle * 180 / Math.PI;
        record.element.style.transform =
            `translate3d(${record.body.position.x - record.halfSize}px, ` +
            `${record.body.position.y - record.halfSize}px, 0) rotate(${degrees}deg)`;
    }

    release() {
        if (!this.active || !this.engine) return;
        this.tiltFrozen = true;
        this.stopTiltListening();
        this.resetGravity();
        this.floorEnabled = false;
        this.clearSpawnTimers();
        this.rebuildBoundaries();

        if (this.reducedMotion) {
            this.bodies.forEach((record, index) => {
                record.element.style.transition =
                    'transform 700ms cubic-bezier(.55, 0, 1, .45), opacity 500ms 250ms';
                record.element.style.transform =
                    `translate3d(${record.body.position.x - record.halfSize}px, ` +
                    `${window.innerHeight}px, 0) ` +
                    `rotate(${record.body.angle * 180 / Math.PI +
                        (index % 2 ? 70 : -70)}deg)`;
                record.element.style.opacity = '0';
            });
            return;
        }

        for (const record of this.bodies) {
            Matter.Sleeping.set(record.body, false);
            Matter.Body.setVelocity(record.body, {
                x: record.body.velocity.x + (Math.random() - 0.5) * 1.2,
                y: Math.max(0.5, record.body.velocity.y)
            });
        }
        this.startLoop();
    }

    clearSpawnTimers() {
        this.spawnTimers.forEach(clearTimeout);
        this.spawnTimers = [];
        this.pendingSpawns = 0;
    }

    unmount() {
        this.active = false;
        this.stopTiltListening();
        this.clearSpawnTimers();
        clearTimeout(this.tiltStatusTimer);
        clearTimeout(this.tiltFadeTimer);
        this.tiltStatusTimer = null;
        this.tiltFadeTimer = null;
        this.tiltEnabled = false;
        this.tiltFrozen = false;
        this.tiltBaselineAngle = null;
        this.tiltSmoothedAngle = 0;
        this.tiltAppliedAngle = 0;
        this.lastRawTiltAngle = null;
        if (this.tiltControl) {
            this.tiltControl.hidden = true;
            this.tiltControl.disabled = true;
            this.tiltControl.classList.remove('tilt-control--fading');
        }
        if (this.frameId) cancelAnimationFrame(this.frameId);
        this.frameId = null;
        if (this.anchorFrameId) cancelAnimationFrame(this.anchorFrameId);
        this.anchorFrameId = null;
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.resizeObserver = null;

        if (this.engine) {
            Matter.Composite.clear(this.engine.world, false, true);
            Matter.Engine.clear(this.engine);
        }
        this.engine = null;
        this.boundaries = [];
        this.bodies = [];
        if (this.viewportLayer) this.viewportLayer.remove();
        this.viewportLayer = null;
        this.overlay = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JokerPhysicsService };
}
