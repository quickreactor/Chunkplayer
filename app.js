// ====================
// MAIN APPLICATION
// ====================

/**
 * Refactored ChunkPlayerApp
 * Orchestrates all services and use cases for the movie chunk player application
 */
class ChunkPlayerApp {
    constructor() {
        // Services
        this.apiService = new ApiService(CONFIG.api.baseUrl);
        this.domService = new DOMService();
        this.audioService = new AudioService();
        this.videoService = new VideoService(this.domService, this.audioService);
        this.effectService = new EffectService();
        this.dateService = null; // Will be initialized after loading URLs
        this.soundBoardService = null;
        this.adminService = null; // Will be initialized after DOM service is ready
        this.graffitiService = null; // Will be initialized after services are ready

        // Runtime state
        this.urls = {};
        this.chunkArray = [];
        this.titleArray = [];
        this.selectedPunishmentPosterFile = null;

        // Use cases (initialized later)
        this.videoPlaybackUseCase = null;
        this.lockdownUseCase = null;
        this.diceRollUseCase = null;
        this.dailyFlowUseCase = null;
        this.coinFlipUseCase = null;

        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            await this.loadUrls();
            this.setupServices();
            this.setupUseCases();
            this.setupEventListeners();
            this.setupDebugMode();
            this.setupMorbUnlocks();
            await this.runMainLogic();
            this.initFlipCounter(
                CONFIG.movieData.jokerlessDaysOld || 0,
                CONFIG.movieData.jokerlessDays || 0
            );

            // Check for Rensday (Wednesday) and trigger effect
            if (this.dateService.isWednesday()) {
                console.log('🎉 Happy Rensday! Triggering Jeremy Renner animation...');
                this.effectService.triggerRensday();
            }
        } catch (error) {
            ErrorHandler.handle(error, 'ChunkPlayerApp.init');
        }
    }

    /**
     * Load URLs and movie data from API
     */
    async loadUrls() {
        try {
            // Load static URLs
            const response = await fetch("urls.json");
            this.urls = await response.json();

            // Load daily movie data with retry logic
            let response2;
            let retries = 3;
            let lastError;

            // Detect browser for debugging
            const isFirefox = navigator.userAgent.includes('Firefox');
            const isAndroid = navigator.userAgent.includes('Android');
            const isFirefoxAndroid = isFirefox && isAndroid;
            const connectionType = navigator.connection?.effectiveType || 'unknown';

            console.log(`📱 Device/Browser: Firefox=${isFirefox}, Android=${isAndroid}, Connection=${connectionType}`);

            for (let i = 0; i < retries; i++) {
                let controller = null;
                let timeoutId = null;
                let fetchStart = 0;

                try {
                    controller = new AbortController();
                    // Longer timeout for first attempt (cold start), shorter for retries
                    const timeoutMs = (i === 0) ? 15000 : 10000;
                    timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                    const fetchUrl = `${CONFIG.api.baseUrl}/get-daily-data`;
                    fetchStart = performance.now();

                    console.log(`🌐 [Attempt ${i + 1}/${retries}] Fetching from: ${fetchUrl}`);
                    console.log(`⏱️ Timeout set to ${timeoutMs}ms for this attempt`);

                    response2 = await fetch(fetchUrl, {
                        signal: controller.signal,
                        mode: 'cors',
                        credentials: 'omit'
                    });

                    const fetchDuration = Math.round(performance.now() - fetchStart);
                    clearTimeout(timeoutId);
                    timeoutId = null;

                    console.log(`✅ Response received in ${fetchDuration}ms | Status: ${response2.status}`);

                    if (!response2.ok) {
                        throw new Error(`API returned ${response2.status}: ${response2.statusText}`);
                    }

                    break; // Success, exit retry loop
                } catch (fetchError) {
                    if (timeoutId) clearTimeout(timeoutId);

                    const attemptDuration = fetchStart ? Math.round(performance.now() - fetchStart) + 'ms' : 'unknown';

                    lastError = fetchError;

                    // Detailed error logging for debugging first-load issues
                    console.group(`❌ Fetch attempt ${i + 1}/${retries} FAILED (${attemptDuration})`);
                    console.log('Error type:', fetchError.name);
                    console.log('Message:', fetchError.message);
                    console.log('Is timeout abort?', fetchError.name === 'AbortError');
                    console.log('Is network error?', fetchError.name === 'TypeError');
                    console.log('Full error:', fetchError);
                    console.groupEnd();

                    if (fetchError.name === 'AbortError' && i === 0) {
                        console.warn('⚠️ First attempt timed out - likely cold start or radio wake-up');
                        console.warn('🔄 Retrying with shorter timeout...');

                        // Mobile debug: show alert with diagnostic info
                        if (isFirefoxAndroid || isAndroid) {
                            alert(
                                `⏱️ Fetch timed out after ${attemptDuration}\n` +
                                `Error: ${fetchError.name}\n` +
                                `Connection: ${connectionType}\n` +
                                `Likely cause: cold start or slow network\n` +
                                `Retrying...`
                            );
                        }
                    }

                    if (i < retries - 1) {
                        const backoffTime = Math.pow(2, i) * 1000;
                        console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                    }
                }
            }

            if (!response2 || !response2.ok) {
                throw new Error(`Failed to fetch daily data after ${retries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
            }

            CONFIG.movieData = await response2.json();

            // Initialize DateService after movie data is loaded
            this.dateService = new DateService();

            // Determine target movie based on morb status
            const targetMovie = CONFIG.movieData.morbed
                ? CONFIG.movieData.punishmentMovie
                : CONFIG.movieData.normalMovie;

            this.chunkArray = targetMovie.chunks;
            this.titleArray = targetMovie.titles;

            // Configure services with URLs
            this.audioService.setUrls(this.urls);
            this.videoService.setUrls(this.urls);
            this.soundBoardService = new SoundBoardService(this.urls);

            // Setup special day sounds (Robert's birthday)
            if (this.dateService.isRobertBday()) {
                this.audioService.setSounds(this.urls.randomSounds_bday);
                this.effectService.letItSnowSonic();
            }

            // Update theme
            this.domService.updateTheme(targetMovie.bgColor);

        } catch (error) {
            ErrorHandler.handle(error, 'ChunkPlayerApp.loadUrls', { showToUser: true });
            throw error;
        }
    }

    /**
     * Setup services that depend on loaded data
     */
    setupServices() {
        // Initialize admin service after DOM service is ready
        this.adminService = new AdminService(this.apiService, this.domService);
        // Initialize drawing service
        this.drawingService = new DrawingService(this.apiService, this.domService);
        // Initialize graffiti service
        this.graffitiService = new GraffitiService(this.apiService, this.domService, this.drawingService);
    }

    /**
     * Setup use cases with their dependencies
     */
    setupUseCases() {
        // Video playback use case
        this.videoPlaybackUseCase = new VideoPlaybackUseCase(
            this.domService,
            this.videoService,
            this.audioService,
            this.soundBoardService,
            () => {
                this.showAdminSection();
                // Initialize graffiti when entering video playback
                if (this.graffitiService) {
                    this.graffitiService.init();
                }
            }
        );

        // Lockdown use case
        this.lockdownUseCase = new LockdownUseCase(
            this.domService,
            this.dateService,
            () => this.updateVideo(false), // onUnlock callback
            () => this.showAdminSection() // Show admin during lockdown
        );

        // Dice roll use case
        this.diceRollUseCase = new DiceRollUseCase(
            this.domService,
            this.videoService,
            this.audioService,
            this.effectService,
            this.videoPlaybackUseCase,
            VisitRepository,
            this
        );

        // Coin flip use case
        this.coinFlipUseCase = new CoinFlipUseCase(
            this.domService,
            this.videoService,
            this.audioService,
            this.effectService,
            VisitRepository
        );

        // Daily flow use case
        this.dailyFlowUseCase = new DailyFlowUseCase(
            this.dateService,
            this.domService,
            () => this.showSundayScreen(),        // onShowSunday
            () => this.lockdownUseCase.lockdown(), // onLockdown
            () => this.handleMainFlow()            // onDailyContent
        );
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.domService.elements.rollButton.addEventListener("click", () => {
            // Unlock rensday audio while we have user gesture context
            if (this.dateService.isWednesday()) {
                const audio = document.getElementById('renner-audio');
                if (audio) {
                    audio.play().then(() => audio.pause()).catch(() => { });
                }
            }
            this.diceRollUseCase.execute(
                CONFIG.movieData,
                this.dateService.now,
                CONFIG.debug.forceRoll
            );
        });

        // FLIP button click handler
        this.domService.elements.flipButton.addEventListener("click", async () => {
            await this.executeCoinFlip();
        });

        this.domService.elements.archiveButton.addEventListener("click", () => {
            this.updateVideo();
        });

        this.domService.elements.epTitle.addEventListener("click", () => {
            this.videoService.playDiceVideo(Math.floor(Math.random() * 20 + 1));
        });

        const rollButton = document.getElementById("roll-button");
        const deyeIdle = document.getElementById("deye-idle");
        const deyeHover = document.getElementById("deye-hover");
        if (rollButton) {
            rollButton.addEventListener("mouseenter", () => {
                deyeIdle.pause();

                deyeHover.currentTime = 0;
                deyeHover.style.opacity = 1;
                deyeHover.play();
            });

            deyeHover.addEventListener("ended", () => {
                deyeHover.pause(); // freezes on last frame
            });

            rollButton.addEventListener("mouseleave", () => {
                deyeHover.pause();
                deyeHover.currentTime = 0;
                deyeHover.style.opacity = 0;

                deyeIdle.play();
            });
        }

        // Admin toggle button
        this.domService.elements.adminToggleBtn?.addEventListener("click", () => {
            this.domService.elements.adminPanel.classList.toggle('hidden');
            this.domService.elements.adminPassword?.focus();

            // If panel opened and user already has stored clearance, show panels directly
            if (!this.domService.elements.adminPanel.classList.contains('hidden')) {
                const level = this.adminService.getClearance();
                if (level > 0) {
                    this.domService.elements.adminLogin.classList.add('display-none');
                    if (level >= 1) {
                        this.domService.elements.adminLevel1.classList.remove('display-none');
                    }
                    if (level >= 2) {
                        const alreadyVisible = !this.domService.elements.adminLevel2.classList.contains('display-none');
                        this.domService.elements.adminLevel2.classList.remove('display-none');
                        if (!alreadyVisible) {
                            this.initializePointerInputs();
                        }
                    }
                }
            }
        });

        // Admin login
        this.domService.elements.adminLoginBtn?.addEventListener("click", async () => {
            await this.handleAdminLogin();
        });

        // Allow Enter key to submit password
        this.domService.elements.adminPassword?.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') {
                this.handleAdminLogin();
            }
        });

        // Punishment report button
        this.domService.elements.punishmentReportBtn?.addEventListener("click", () => {
            this.adminService.handlePunishmentReport(
                () => this.executePunishmentReport()
            );
        });

        // Bypass lockdown button (Level 2)
        this.domService.elements.bypassLockdownBtn?.addEventListener("click", () => {
            this.lockdownUseCase.stop();
            this.updateVideo(false);
            this.adminService.showToast("Lockdown bypassed", "success");
        });

        // Bypass Sunday button (Level 2)
        this.domService.elements.bypassSundayBtn?.addEventListener("click", () => {
            Debug.bypassSunday();
            this.adminService.showToast("Sunday bypassed", "success");
        });

        // Set Test Date button (Level 2)
        this.domService.elements.setTestDateBtn?.addEventListener("click", () => {
            const day = this.domService.elements.testDateDay.value;
            const month = this.domService.elements.testDateMonth.value;
            const hour = this.domService.elements.testDateHour.value;
            Debug.setTestDate(`${day}/${month}`, parseInt(hour));
            this.adminService.showToast(`Test date set to ${day}/${month} at ${hour}:00`, "success");
        });

        // Stepper minus buttons (only update UI, no API call)
        this.domService.elements.stepperMinusBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const type = e.target.dataset.type;
                let inputId;
                if (type === 'fakeroll') {
                    inputId = 'fake-roll-input';
                } else if (type === 'jokerlessdays') {
                    inputId = 'jokerless-days-input';
                } else if (type === 'jokerlessdaysold') {
                    inputId = 'jokerless-days-old-input';
                } else if (type === 'testflip') {
                    inputId = 'test-flip-input';
                } else {
                    inputId = `${type}-pointer-input`;
                }
                const input = document.getElementById(inputId);
                const min = type.startsWith('jokerless') || type === 'testflip' ? 0 : 1;
                const currentValue = parseInt(input.value) || 0;
                input.value = Math.max(currentValue - 1, min);
                // No API call - only update input value
            });
        });

        // Stepper plus buttons (only update UI, no API call)
        this.domService.elements.stepperPlusBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const type = e.target.dataset.type;
                let inputId;
                if (type === 'fakeroll') {
                    inputId = 'fake-roll-input';
                } else if (type === 'jokerlessdays') {
                    inputId = 'jokerless-days-input';
                } else if (type === 'jokerlessdaysold') {
                    inputId = 'jokerless-days-old-input';
                } else if (type === 'testflip') {
                    inputId = 'test-flip-input';
                } else {
                    inputId = `${type}-pointer-input`;
                }
                const input = document.getElementById(inputId);
                const max = type === 'fakeroll' ? 20 : Infinity;
                const currentValue = parseInt(input.value) || 0;
                input.value = Math.min(currentValue + 1, max);
                // No API call - only update input value
            });
        });

        // Set buttons for pointers (triggers API call)
        this.domService.elements.stepperSetBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const type = e.target.dataset.type;
                let input;
                if (type === 'jokerlessdays') {
                    input = document.getElementById('jokerless-days-input');
                } else if (type === 'jokerlessdaysold') {
                    input = document.getElementById('jokerless-days-old-input');
                } else {
                    input = document.getElementById(`${type}-pointer-input`);
                }
                const value = parseInt(input.value);
                this.handlePointerChange(type, value);
            });
        });

        // Execute Fake Roll button
        this.domService.elements.adminExecuteFakeRollBtn?.addEventListener("click", () => {
            const rollValue = parseInt(this.domService.elements.adminFakeRollInput.value);
            if (rollValue >= 1 && rollValue <= 20) {
                this.adminService.executeFakeRoll(rollValue);
            } else {
                this.adminService.showToast('Roll must be between 1 and 20', 'error');
            }
        });

        // Clear Last Visit button (renamed from Reset Daily State)
        this.domService.elements.adminClearLastVisitBtn?.addEventListener("click", () => {
            this.adminService.clearLastVisitAndReload();
        });

        // Test Flip Counter button
        this.domService.elements.adminTestFlipBtn?.addEventListener("click", () => {
            const targetValue = parseInt(this.domService.elements.adminTestFlipInput.value);
            if (!isNaN(targetValue) && targetValue >= 0) {
                this.flipCounterTo(targetValue);
            }
        });

        // Normal poster upload controls
        this.domService.elements.selectPosterBtn?.addEventListener("click", () => {
            this.domService.elements.posterFileInput?.click();
        });

        this.domService.elements.posterFileInput?.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show the upload button and filename
                this.domService.elements.uploadPosterBtn.style.display = 'block';
                this.domService.elements.posterUploadStatus.textContent = `Selected: ${file.name}`;
                this.domService.elements.posterUploadStatus.className = 'upload-status';
                this.selectedPosterFile = file;
            }
        });

        this.domService.elements.uploadPosterBtn?.addEventListener("click", async () => {
            if (this.selectedPosterFile) {
                await this.adminService.handlePosterUpload(
                    this.selectedPosterFile,
                    this.domService.elements.posterUploadStatus,
                    CONFIG.movieData?.normalMovie?.name
                );
            }
        });

        // Punishment poster upload controls
        this.domService.elements.selectPunishmentPosterBtn?.addEventListener("click", () => {
            this.domService.elements.punishmentPosterFileInput?.click();
        });

        this.domService.elements.punishmentPosterFileInput?.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show the upload button and filename
                this.domService.elements.uploadPunishmentPosterBtn.style.display = 'block';
                this.domService.elements.punishmentPosterUploadStatus.textContent = `Selected: ${file.name}`;
                this.domService.elements.punishmentPosterUploadStatus.className = 'upload-status';
                this.selectedPunishmentPosterFile = file;
            }
        });

        this.domService.elements.uploadPunishmentPosterBtn?.addEventListener("click", async () => {
            if (this.selectedPunishmentPosterFile) {
                await this.adminService.handlePosterUpload(
                    this.selectedPunishmentPosterFile,
                    this.domService.elements.punishmentPosterUploadStatus,
                    CONFIG.movieData?.punishmentMovie?.name
                );
            }
        });
    }

    /**
     * Setup morb unlock easter eggs
     */
    setupMorbUnlocks() {
        // Keyboard typing "morbius"
        let buffer = "";
        document.addEventListener("keydown", (event) => {
            buffer += event.key;
            if (buffer.length > 7) {
                buffer = buffer.slice(-7);
            }
            if (buffer.toLowerCase() === "morbius") {
                this.morb();
            }
        });

        // Tap body 10 times in 3 seconds
        let tapCount = 0;
        let firstTapTime = 0;
        document.body.addEventListener("click", () => {
            const currentTime = new Date().getTime();
            if (this.graffitiService?.isEditing) return;

            if (tapCount === 0) {
                firstTapTime = currentTime;
            }

            tapCount++;

            if (tapCount === 10 && currentTime - firstTapTime <= 3000) {
                this.morb();
                tapCount = 0;
            } else if (currentTime - firstTapTime > 3000) {
                tapCount = 1;
                firstTapTime = currentTime;
            }
        });
    }

    /**
     * Setup debug mode
     */
    setupDebugMode() {
        if (CONFIG.debug.shouldClearLastVisit) {
            VisitRepository.clearLastVisit();
        }
    }

    /**
     * Run main application logic
     */
    async runMainLogic() {
        await this.dailyFlowUseCase.execute();
    }

    /**
     * Initialize flip counter animation
     * @param {number} jokerlessDaysOld - Starting value for first visit
     * @param {number} jokerlessDays - Target value if already rolled
     */
    initFlipCounter(jokerlessDaysOld = 0, jokerlessDays = 0) {
        const counter = document.getElementById('flip-counter');
        if (!counter) return;

        // Set label above flip counter
        const label = document.getElementById('flip-counter-label');
        if (label && CONFIG.movieData?.punishmentMovie?.name) {
            label.textContent = `Days since last ${CONFIG.movieData.punishmentMovie.name}`;
        }

        // Determine starting value based on whether user has already rolled today
        const hasRolledToday = !VisitRepository.isFirstVisitToday();
        const startValue = hasRolledToday ? jokerlessDays : jokerlessDaysOld;

        // Set initial data-value before parsing to avoid animation from 0
        if (typeof Tick !== 'undefined') {
            counter.setAttribute('data-value', startValue);
            Tick.DOM.parse(counter);
        }

        console.log(`%c[Flip] Counter initialized to "${String(startValue).padStart(3, '0')}" (hasRolledToday: ${hasRolledToday})`, 'color: #00ff00; font-weight: bold');
    }

    /**
     * Flip the counter to a target value
     * @param {number} targetValue - Value to animate to
     */
    flipCounterTo(targetValue) {
        const counter = document.getElementById('flip-counter');
        if (!counter) return;

        // Find existing tick instance created by initFlipCounter
        const tick = Tick.DOM.find(counter);

        if (!tick) {
            console.warn('Flip tick instance not found');
            return;
        }

        // Update the value - Tick will animate automatically
        tick.value = targetValue;

        console.log(`%c[Flip] Counter animating to "${String(targetValue).padStart(3, '0')}"`, 'color: #00ff00; font-weight: bold');
    }

    /**
     * Handle main flow (after Sunday/Lockdown checks)
     */
    async handleMainFlow() {
        if (VisitRepository.isFirstVisitToday()) {
            await this.handleFirstVisit();
        } else {
            await this.handleReturnVisit();
        }
    }

    /**
     * Handle first visit of the day - route based on coin-flip mode
     */
    async handleFirstVisit() {
        if (CONFIG.movieData.isCoinFlip) {
            await this.handleCoinFlipFirstVisit();
        } else {
            await this.handleNormalFirstVisit();
        }
    }

    /**
     * Handle coin-flip first visit - show two candidate posters with FLIP button
     */
    async handleCoinFlipFirstVisit() {
        const coinFlip = CONFIG.movieData.coinFlip;

        // Show candidate posters with FLIP button
        this.domService.show('posterSection');
        this.domService.elements.poster1.src = coinFlip.movie1.posterUrl;
        this.domService.elements.poster2.src = coinFlip.movie2.posterUrl;
        this.domService.elements.rollButton.style.display = 'none';
        this.domService.elements.flipButton.style.display = 'flex';

        // Theme: use movie1's colors
        this.domService.updateTheme(coinFlip.movie1.bgColor);

        // Show graffiti on pre-roll poster
        this.graffitiService.renderPrerollOverlay();
    }

    /**
     * Handle normal first visit - show poster selection
     */
    async handleNormalFirstVisit() {
        const targetMovie = CONFIG.movieData.morbed
            ? CONFIG.movieData.punishmentMovie
            : CONFIG.movieData.normalMovie;
        const punishmentMovie = CONFIG.movieData.punishmentMovie;
        const normalMovie = CONFIG.movieData.normalMovie;
        const videoNumberText = targetMovie.pointer;

        this.domService.show('posterSection');
        this.domService.elements.poster1.src = videoNumberText == 1 ? "images/question.jpg" : normalMovie.posterUrl;
        this.domService.elements.poster2.src = punishmentMovie.posterUrl;

        // Show graffiti on pre-roll poster
        this.graffitiService.renderPrerollOverlay();
    }

    /**
     * Execute coin flip flow
     */
    async executeCoinFlip() {
        const coinFlip = CONFIG.movieData.coinFlip;

        // Execute flip and get winner
        const winnerMovie = await this.coinFlipUseCase.execute(coinFlip);

        // Update CONFIG with winner as normalMovie
        CONFIG.movieData.normalMovie = winnerMovie;
        CONFIG.movieData.isCoinFlip = false;

        // Update runtime state
        this.chunkArray = winnerMovie.chunks;
        this.titleArray = winnerMovie.titles;

        // Update theme to winner
        this.domService.updateTheme(winnerMovie.bgColor);
        this.domService.changeFavicon(winnerMovie.faviconUrl);

        // Transition to roll flow
        await this.transitionToRollFlow(coinFlip);
    }

    /**
     * Transition from flip to roll flow
     */
    async transitionToRollFlow(coinFlip) {
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 4500));

        // Update poster2 to punishment movie (for roll animation)
        const punishmentMovie = CONFIG.movieData.punishmentMovie;
        this.domService.elements.poster2.src = punishmentMovie.posterUrl;

        // Update poster1 to winner
        const winnerIndex = coinFlip.candidateIndex;
        const winner = winnerIndex === 0 ? coinFlip.movie1 : coinFlip.movie2;
        this.domService.elements.poster1.src = winner.posterUrl;

        // Show ROLL button, hide FLIP button
        this.domService.elements.rollButton.style.display = 'flex';
        this.domService.elements.diceAndTextContainer.classList.remove('rolled');
        this.domService.elements.flipButton.style.display = 'none';

        // Reset roll button click handler
        this.domService.elements.rollButton.onclick = () => {
            // Unlock rensday audio while we have user gesture context
            if (this.dateService.isWednesday()) {
                const audio = document.getElementById('renner-audio');
                if (audio) {
                    audio.play().then(() => audio.pause()).catch(() => { });
                }
            }
            this.diceRollUseCase.execute(
                CONFIG.movieData,
                this.dateService.now,
                CONFIG.debug.forceRoll
            );
        };
    }

    /**
     * Handle return visit - skip poster selection
     */
    async handleReturnVisit() {
        // Check if debug roll is forced
        let effectiveRoll = CONFIG.movieData.roll;
        if (CONFIG.debug.forceRoll) {
            effectiveRoll = CONFIG.debug.forceRoll;
        }

        // Check for special day auto-crit
        if (DiceRollLogic.isAutoCritDay(this.dateService.now)) {
            effectiveRoll = 20;
        }

        // Route based on roll
        if (effectiveRoll === 1) {
            await this.morb();
        } else {
            await this.updateVideo();
        }
    }

    /**
     * Show Sunday rest day screen
     */
    showSundayScreen() {
        // Clean up graffiti elements
        if (this.graffitiService) {
            this.graffitiService.destroy();
        }
        this.domService.removeClass('container', 'hidden');
        this.domService.show('container');
        this.domService.elements.sundayDiv.style.justifyContent = "center";
        this.domService.show('sundayDiv');
        this.domService.hide('videoContainer');
        this.domService.hide('timerContainer');
        this.showAdminSection();
    }

    /**
     * Update and show video player
     * @param {boolean} isFirst - Is this the first video after roll
     */
    async updateVideo(isFirst = false) {
        const targetMovie = CONFIG.movieData.morbed
            ? CONFIG.movieData.punishmentMovie
            : CONFIG.movieData.normalMovie;

        await this.videoPlaybackUseCase.playNormalChunk(
            targetMovie,
            this.chunkArray,
            this.titleArray,
            isFirst
        );
    }

    /**
     * Trigger punishment (morb) mode
     * @param {boolean} isFirst - Is this the first video after trigger
     */
    async morb(isFirst = false) {
        const punishmentMovie = CONFIG.movieData.punishmentMovie;
        await this.videoPlaybackUseCase.playPunishmentChunk(punishmentMovie, isFirst);
    }

    /**
     * Handle admin login
     */
    async handleAdminLogin() {
        const password = this.domService.elements.adminPassword.value;
        const level = await this.adminService.login(password);

        if (level === 0) {
            this.domService.elements.adminError.textContent = "Invalid clearance code";
            return;
        }

        // Clear error and show appropriate admin level
        this.domService.elements.adminError.textContent = "";
        this.domService.elements.adminLogin.classList.add('display-none');

        if (level >= 1) {
            this.domService.elements.adminLevel1.classList.remove('display-none');
        }
        if (level >= 2) {
            this.domService.elements.adminLevel2.classList.remove('display-none');
            await this.initializePointerInputs();
        }

        this.adminService.showToast(`Level ${level} access granted`, "success");
    }

    /**
     * Execute the punishment report (after confirmation)
     */
    async executePunishmentReport() {
        try {
            // 1. Call API to increment pointer
            await this.apiService.reportPunishment();

            // 2. Show toast
            this.adminService.showToast("Punishment Recorded");

            // 3. Refresh daily data
            const response = await fetch(`${CONFIG.api.baseUrl}/get-daily-data`);
            CONFIG.movieData = await response.json();

            // 4. Update local state
            const targetMovie = CONFIG.movieData.punishmentMovie;
            this.chunkArray = targetMovie.chunks;
            this.titleArray = targetMovie.titles;

            // 5. Auto-play punishment chunk
            await this.morb(true); // isFirst=true

        } catch (error) {
            this.adminService.showToast("Failed to record punishment", "error");
            ErrorHandler.handle(error, 'executePunishmentReport');
        }
    }

    /**
     * Show admin section (call when entering after-roll state)
     */
    showAdminSection() {
        this.domService.elements.adminSection.classList.remove('hidden');

        // If user has stored clearance, skip login
        const level = this.adminService.getClearance();
        if (level > 0 && this.domService.elements.adminLogin.classList.contains('display-none') === false) {
            this.domService.elements.adminLogin.classList.add('display-none');
            if (level >= 1) {
                this.domService.elements.adminLevel1.classList.remove('display-none');
            }
            if (level >= 2) {
                this.domService.elements.adminLevel2.classList.remove('display-none');
                this.initializePointerInputs();
            }
        }
    }

    /**
     * Initialize pointer input fields with current values
     */
    async initializePointerInputs() {
        try {
            const data = await this.apiService.getDailyData();
            console.log('Daily data:', data);

            this.domService.elements.adminNormalPointerInput.value = data.normalMovie.pointer || 1;
            this.domService.elements.adminPunishmentPointerInput.value = data.punishmentMovie.pointer || 1;
            this.domService.elements.adminRewardPointerInput.value = data.rewardMovie.pointer || 1;
            this.domService.elements.adminFakeRollInput.value = data.roll || 10;
            this.domService.elements.adminJokerlessDaysInput.value = data.jokerlessDays ?? 0;
            this.domService.elements.adminJokerlessDaysOldInput.value = data.jokerlessDaysOld ?? 0;
            this.domService.elements.adminTestFlipInput.value = data.jokerlessDays ?? 0;
        } catch (error) {
            console.error('Failed to load pointer values:', error);
            // Set defaults
            this.domService.elements.adminNormalPointerInput.value = 1;
            this.domService.elements.adminPunishmentPointerInput.value = 1;
            this.domService.elements.adminRewardPointerInput.value = 1;
            this.domService.elements.adminFakeRollInput.value = 10;
            this.domService.elements.adminJokerlessDaysInput.value = 0;
            this.domService.elements.adminJokerlessDaysOldInput.value = 0;
            this.domService.elements.adminTestFlipInput.value = 0;
        }
    }

    /**
     * Handle pointer value change from stepper
     * @param {string} type - Pointer type
     * @param {number} value - New value
     */
    async handlePointerChange(type, value) {
        if (isNaN(value)) {
            this.adminService.showToast('Invalid value', 'error');
            return;
        }
        if (type === 'jokerlessdays') {
            await this.adminService.updateJokerlessDays(value);
        } else if (type === 'jokerlessdaysold') {
            await this.adminService.updateJokerlessDaysOld(value);
        } else if (value < 1) {
            this.adminService.showToast('Invalid pointer value', 'error');
        } else {
            await this.adminService.updatePointer(type, value);
        }
    }
}

// ====================
// INITIALIZE APPLICATION
// ====================
// Use defer on the script tag, so DOM and Plyr are ready when this runs
window.chunkPlayerApp = new ChunkPlayerApp();

// ====================
// DEBUG UTILITIES
// ====================

window.Debug = {
    /**
     * Set a test date and hour to bypass lockdown or test specific dates
     * Changes apply immediately for date-based logic
     * @param {string} ddmm - Date in DD/MM format (e.g., "23/02")
     * @param {number} hour - Hour in 24h format (0-23, default: 9)
     * @example Debug.setTestDate("23/02", 9)  // Feb 23 at 9 AM
     */
    setTestDate(ddmm, hour = 9) {
        CONFIG.debug.setTestDate(ddmm, hour);
    },

    /**
     * Clear the test date and return to real time
     */
    clearTestDate() {
        CONFIG.debug.clearTestDate();
    },

    /**
     * Force a specific dice roll outcome (1-20)
     * @param {number} roll - The roll value to force
     */
    forceRoll(roll) {
        CONFIG.debug.setForceRoll(roll);
    },

    /**
     * Clear the forced roll (return to random)
     */
    clearForceRoll() {
        CONFIG.debug.clearForceRoll();
    },

    /**
     * Bypass lockdown and directly load the video
     * This is the easiest way to test during lockdown hours
     */
    bypassLockdown() {
        if (!window.chunkPlayerApp) {
            console.error('%c[Debug] App not initialized yet', 'color: #ff0000; font-weight: bold');
            return;
        }
        console.log('%c[Debug] Bypassing lockdown and loading video...', 'color: #00ff00; font-weight: bold');
        window.chunkPlayerApp.lockdownUseCase.stop();
        window.chunkPlayerApp.updateVideo(false);
    },

    /**
     * Bypass Sunday rest day and show the roll screen
     * Sets test date to next day (Monday) at 9 AM and re-runs the daily flow
     */
    bypassSunday() {
        if (!window.chunkPlayerApp) {
            console.error('%c[Debug] App not initialized yet', 'color: #ff0000; font-weight: bold');
            return;
        }
        const monday = new Date();
        monday.setDate(monday.getDate() + 1);
        const dd = String(monday.getDate()).padStart(2, '0');
        const mm = String(monday.getMonth() + 1).padStart(2, '0');
        CONFIG.debug.setTestDate(`${dd}/${mm}`, 9);
        console.log('%c[Debug] Bypassing Sunday - re-running daily flow...', 'color: #00ff00; font-weight: bold');
        window.chunkPlayerApp.dailyFlowUseCase.execute();
    },

    /**
     * Clear last visit from localStorage (triggers poster selection)
     */
    clearLastVisit() {
        CONFIG.debug.clearLastVisit();
    },

    /**
     * Simulate tomorrow (sets date to next day at 9 AM)
     */
    fakeTomorrow() {
        CONFIG.debug.fakeTomorrow();
    },

    /**
     * Show current debug configuration
     */
    showConfig() {
        CONFIG.debug.showConfig();
    },

    /**
     * Show all localStorage data
     */
    showStorageData() {
        CONFIG.debug.showStorageData();
    },

    /**
     * Trigger punishment report via admin button
     */
    reportPunishment() {
        const btn = document.getElementById('punishment-report-btn');
        if (btn) btn.click();
    },

    /**
     * Force coin-flip mode for testing
     * @param {number} winnerIndex - 0 for movie1, 1 for movie2 (default: 0)
     */
    forceCoinFlip(winnerIndex = 0) {
        // Simulate coin-flip mode for testing
        CONFIG.movieData.isCoinFlip = true;
        CONFIG.movieData.coinFlip = {
            candidateIndex: winnerIndex,
            movie1: {
                chunks: CONFIG.movieData.normalMovie.chunks,
                titles: CONFIG.movieData.normalMovie.titles,
                posterUrl: CONFIG.movieData.normalMovie.posterUrl,
                bgColor: CONFIG.movieData.normalMovie.bgColor,
                faviconUrl: CONFIG.movieData.normalMovie.faviconUrl,
                name: "Test Movie A",
                pointer: 1
            },
            movie2: {
                chunks: CONFIG.movieData.punishmentMovie.chunks,
                titles: CONFIG.movieData.punishmentMovie.titles,
                posterUrl: CONFIG.movieData.punishmentMovie.posterUrl,
                bgColor: CONFIG.movieData.punishmentMovie.bgColor,
                faviconUrl: CONFIG.movieData.punishmentMovie.faviconUrl,
                name: "Test Movie B",
                pointer: 1
            },
            losingMoviePosterUrl: CONFIG.movieData.punishmentMovie.posterUrl,
            losingMovieBgColor: CONFIG.movieData.punishmentMovie.bgColor,
            losingMovieName: "Test Movie B"
        };
        console.log(`%c[Debug] Coin-flip mode forced (winner: movie${winnerIndex + 1})`, 'color: #00ff00; font-weight: bold');
        window.chunkPlayerApp = new ChunkPlayerApp();
    },

    /**
     * Trigger Rensday effect (Jeremy Renner walking + confetti + text)
     * @param {number} duration - Duration in milliseconds (default: 8000)
     */
    rensday(duration = 8000) {
        if (!window.chunkPlayerApp || !window.chunkPlayerApp.effectService) {
            console.error('%c[Debug] App not initialized', 'color: #ff0000; font-weight: bold');
            return;
        }
        console.log('%c[Debug] 🎉 Triggering Rensday!', 'color: #ff6b6b; font-weight: bold');
        window.chunkPlayerApp.effectService.triggerRensday(duration);
    },

    /**
     * Clear graffiti (for testing purposes)
     * Clears both server-side graffiti and re-initializes the UI
     */
    async clearGraffiti() {
        if (!window.chunkPlayerApp || !window.chunkPlayerApp.graffitiService) {
            console.error('%c[Debug] GraffitiService not initialized', 'color: #ff0000; font-weight: bold');
            return;
        }

        try {
            console.log('%c[Debug] 🎨 Clearing graffiti...', 'color: #00ff00; font-weight: bold');
            const result = await window.chunkPlayerApp.apiService.clearGraffiti();

            if (result.success) {
                console.log('%c[Debug] Graffiti cleared successfully!', 'color: #00ff00; font-weight: bold');
                // Re-initialize graffiti to update UI
                window.chunkPlayerApp.graffitiService.destroy();
                window.chunkPlayerApp.graffitiService.initialized = false;
                await window.chunkPlayerApp.graffitiService.init();
            } else {
                console.error('%c[Debug] Failed to clear graffiti:', 'color: #ff0000; font-weight: bold', result);
            }
        } catch (error) {
            console.error('%c[Debug] Error clearing graffiti:', 'color: #ff0000; font-weight: bold', error);
        }
    },

    /**
     * List all graffiti entries with their array indices
     */
    listDrawings() {
        const entries = window.chunkPlayerApp?.graffitiService?.graffitiEntries || [];
        if (!entries.length) {
            console.log('%c[Debug] No graffiti entries found', 'color: #ff9900; font-weight: bold');
            return;
        }
        console.log('%c[Debug] Graffiti entries:', 'color: #00ff00; font-weight: bold');
        entries.forEach((e, i) => {
            if (e.type === 'drawing') {
                const objCount = e.data?.objects?.length || 0;
                console.log(`  [${i}] Drawing (${e.width}x${e.height}, ${objCount} objects) — id: ${e.id}`);
            } else {
                console.log(`  [${i}] "${e.text}" — id: ${e.id}`);
            }
        });
    },

    /**
     * Shift all coordinates in a drawing entry by pixel offsets
     * @param {number} index - Array index of the drawing (use Debug.listDrawings() to find)
     * @param {number} offsetX - Pixels to shift horizontally (positive = right)
     * @param {number} offsetY - Pixels to shift vertically (positive = down)
     * @example Debug.shiftDrawing(2, 50, -30)  // shift 3rd entry right 50px, up 30px
     */
    async shiftDrawing(index, offsetX, offsetY) {
        const gs = window.chunkPlayerApp?.graffitiService;
        if (!gs?.graffitiEntries?.length) {
            console.error('%c[Debug] No graffiti entries loaded', 'color: #ff0000; font-weight: bold');
            return;
        }

        const entry = gs.graffitiEntries[index];
        if (!entry) {
            console.error(`%c[Debug] Invalid index ${index} (have ${gs.graffitiEntries.length} entries)`, 'color: #ff0000; font-weight: bold');
            return;
        }
        if (entry.type !== 'drawing' || !entry.data?.objects?.length) {
            console.error(`%c[Debug] Entry ${index} is not a drawing`, 'color: #ff0000; font-weight: bold');
            return;
        }

        console.log(`%c[Debug] Shifting drawing ${index} by (${offsetX}, ${offsetY})...`, 'color: #ffaa00; font-weight: bold');

        entry.data.objects.forEach(obj => {
            obj.left = (obj.left || 0) + offsetX;
            obj.top = (obj.top || 0) + offsetY;

            if (obj.path) {
                obj.path.forEach(cmd => {
                    for (let i = 1; i < cmd.length; i += 2) {
                        if (typeof cmd[i] === 'number') cmd[i] += offsetX;
                        if (typeof cmd[i + 1] === 'number') cmd[i + 1] += offsetY;
                    }
                });
            }
        });

        try {
            const result = await window.chunkPlayerApp.apiService.updateGraffiti(index, entry);
            if (result.success) {
                gs.renderOverlay();
                console.log(`%c[Debug] Drawing ${index} shifted and saved!`, 'color: #00ff00; font-weight: bold');
            } else {
                console.error(`%c[Debug] Failed to save:`, 'color: #ff0000; font-weight: bold', result);
            }
        } catch (error) {
            console.error(`%c[Debug] Error saving:`, 'color: #ff0000; font-weight: bold', error);
        }
    }
};
