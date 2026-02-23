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

        // Runtime state
        this.urls = {};
        this.chunkArray = [];
        this.titleArray = [];

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

            // Load daily movie data
            const response2 = await fetch(`${CONFIG.api.baseUrl}/get-daily-data`);
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
            this.soundBoardService
        );

        // Lockdown use case
        this.lockdownUseCase = new LockdownUseCase(
            this.domService,
            this.dateService,
            () => this.updateVideo(false) // onUnlock callback
        );

        // Dice roll use case
        this.diceRollUseCase = new DiceRollUseCase(
            this.domService,
            this.videoService,
            this.audioService,
            this.effectService,
            this.videoPlaybackUseCase,
            VisitRepository
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

        // Admin toggle button
        this.domService.elements.adminToggleBtn?.addEventListener("click", () => {
            this.domService.elements.adminPanel.classList.toggle('hidden');
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

        // Admin reset button (Level 2)
        this.domService.elements.adminResetBtn?.addEventListener("click", () => {
            this.adminService.showToast("Reset feature coming soon", "info");
        });

        // Admin force roll button (Level 2)
        this.domService.elements.adminForceRollBtn?.addEventListener("click", () => {
            this.adminService.showToast("Force roll feature coming soon", "info");
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
        if (CONFIG.debug.clearLastVisit) {
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
        this.domService.elements.rollButton.classList.remove('rolled');
        this.domService.elements.flipButton.style.display = 'none';

        // Reset roll button click handler
        this.domService.elements.rollButton.onclick = () => {
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
        this.domService.removeClass('container', 'hidden');
        this.domService.show('container');
        this.domService.elements.sundayDiv.style.justifyContent = "center";
        this.domService.show('sundayDiv');
        this.domService.hide('videoContainer');
        this.domService.hide('timerContainer');
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
        this.domService.elements.adminLogin.classList.add('hidden');

        if (level >= 1) {
            this.domService.elements.adminLevel1.classList.remove('hidden');
        }
        if (level >= 2) {
            this.domService.elements.adminLevel2.classList.remove('hidden');
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
    }
}

// ====================
// INITIALIZE APPLICATION
// ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.chunkPlayerApp = new ChunkPlayerApp();
    });
} else {
    window.chunkPlayerApp = new ChunkPlayerApp();
}

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
    }
};
