// ====================
// JOKER PHYSICS SERVICE
// ====================

/**
 * Uses Matter.js to drop Joker cards into the punishment poster.
 * A fixed DOM layer tracks the poster without affecting document scroll size,
 * while matching Matter bodies provide collision, stacking, and sleeping.
 */
class JokerPhysicsService {
    constructor(posterContainer, posterImage) {
        this.posterContainer = posterContainer;
        this.posterImage = posterImage;
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

    async mount(count) {
        if (!this.posterContainer || !this.posterImage) return;
        if (typeof Matter === 'undefined') {
            console.error('Matter.js is required for Joker poster physics.');
            return;
        }

        this.unmount();
        this.active = true;
        this.floorEnabled = true;
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
            for (const pair of event.pairs) {
                if (pair.bodyA.plugin?.isJoker && pair.bodyB.plugin?.isJoker) {
                    const aIsEntering = pair.bodyA.plugin.isEntering;
                    const bIsEntering = pair.bodyB.plugin.isEntering;
                    if (aIsEntering && !bIsEntering) {
                        pair.bodyA.plugin.isEntering = false;
                    } else if (bIsEntering && !aIsEntering) {
                        pair.bodyB.plugin.isEntering = false;
                    }
                }
            }
        });
        this.rebuildBoundaries();
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
            restitution: 0
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
        for (const record of this.bodies) {
            const body = record.body;
            if (!body.plugin.isEntering) continue;
            if (body.bounds.max.y >= 0) {
                body.plugin.isEntering = false;
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
    }

    render() {
        for (const record of this.bodies) {
            if (record.body.bounds.max.x < 0 || record.body.bounds.min.x > this.width) {
                record.spilled = true;
            }
            this.renderRecord(record);
        }

        const overlayTop = this.overlay.getBoundingClientRect().top;
        const escaped = this.bodies.filter(
            record => overlayTop + record.body.bounds.min.y > window.innerHeight + 40
        );
        for (const record of escaped) {
            Matter.Composite.remove(this.engine.world, record.body);
            record.element.remove();
        }
        this.bodies = this.bodies.filter(
            record => overlayTop + record.body.bounds.min.y <= window.innerHeight + 40
        );
    }

    renderRecord(record) {
        const degrees = record.body.angle * 180 / Math.PI;
        record.element.style.transform =
            `translate3d(${record.body.position.x - record.halfSize}px, ` +
            `${record.body.position.y - record.halfSize}px, 0) rotate(${degrees}deg)`;
    }

    release() {
        if (!this.active || !this.engine) return;
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
        this.clearSpawnTimers();
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
