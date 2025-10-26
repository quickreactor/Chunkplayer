// TODO make the call to CF workers just one per day that will return the movieCode, roll and morbcount

// redo a bunch of stuff with eventlisteners
// use metadata eventlistener to set size of vidoe player
// use canplay event to show the video player (fade in) when it's ready

//IDEAS
// travolta confused
// Wowww guy
// nice guy micheal rosen
//blinking guy
//
//
// ====================
// CONFIG & CONSTANTS
// ====================

const CONFIG = {
    movies: {
        old: {
            code: "inner",
            startDateString: "2025-09-29",
            bgColor: "#FA682F"
        },
        new: {
            code: "maximum",
            startDateString: "2025-10-28",
            bgColor: "#ADAE6C"
        },
    },
    api: {
        baseUrl: "https://morbcount-worker.quickreactor.workers.dev"
    },
    debug: {
        testDate: null, // Set to date string to test specific dates
        forceRoll: null, // Set to number 1-20 to force specific roll
        clearLastVisit: false,
        getTestDate: function (ddmm) {
            const [day, month] = ddmm.split("/").map(Number);
            const year = new Date().getFullYear();
            return new Date(year, month - 1, day, 8, 0, 0, 0);
        }
    },
    initialChunkNumber: 1,
    robMorbCount: 13,
};

// UNcommnet fdor testing specific dates
// CONFIG.debug.testDate = CONFIG.debug.getTestDate("28/10");

// ====================
// UTILITY FUNCTIONS
// ====================

const Utils = {
    getNZFormattedDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}${month}${day}`;
    },

    toSentenceCase(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    isDateSpecialDay(date, month, day) {
        return date.getMonth() === month && date.getDate() === day;
    },

    getDateBasedRandomIndex(length) {
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        const random = Math.sin(seed) * 10000;
        return Math.floor(Math.abs(random) % length);
    },

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ====================
// DATE & TIME MANAGER
// ====================

class DateManager {
    constructor() {
        this.now = CONFIG.debug.testDate ? new Date(CONFIG.debug.testDate) : new Date();
        this.currentMovie = this.getCurrentMovie();
        this.startDateMidnight = new Date(this.currentMovie.startDateString + "T00:00");
        this.startDate7AM = new Date(this.currentMovie.startDateString + "T07:00");
    }

    getCurrentMovie() {
        return this.now > new Date(CONFIG.movies.new.startDateString + "T00:00")
            ? CONFIG.movies.new
            : CONFIG.movies.old;
    }

    isTodaySunday() {
        return this.now.getDay() === 0;
    }

    isPastMidnight() {
        const currentHour = this.now.getHours();
        return currentHour >= 0 && currentHour < 7;
    }

    isRobertBday() {
        return Utils.isDateSpecialDay(this.now, 11, 28);
    }

    calculateChunkNumber() {
        let calculatedChunkNumber = CONFIG.initialChunkNumber - 1;
        for (let d = new Date(this.startDateMidnight); d <= this.now; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0) { // Skip Sundays
                calculatedChunkNumber++;
            }
        }
        return calculatedChunkNumber;
    }
}

// ====================
// API SERVICE
// ====================

class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetchText(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`);
            return await response.text();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    async getMorbCount() {
        const count = await this.fetchText('check');
        return parseInt(count);
    }

    async incrementMorbCount() {
        const count = await this.fetchText('increment');
        return parseInt(count);
    }

    async setMorbCount(value) {
        const count = await this.fetchText(`set?newValue=${value}`);
        return parseInt(count);
    }

    async getRoll() {
        const roll = await this.fetchText('roll');
        return parseInt(roll);
    }

    async resetDecision() {
        return await this.fetchText('resetdecision');
    }

    async getDecision() {
        return await this.fetchText('decisionroll');
    }
}

// ====================
// STORAGE MANAGER
// ====================

class StorageManager {
    static get(key) {
        return localStorage.getItem(key);
    }

    static set(key, value) {
        localStorage.setItem(key, value);
    }

    static getInt(key) {
        return parseInt(this.get(key)) || 0;
    }

    static setInt(key, value) {
        this.set(key, parseInt(value));
    }

    static isFirstVisitToday() {
        const currentDate = Utils.getNZFormattedDate();
        const lastVisit = this.get("lastVisit");
        return !lastVisit || lastVisit !== currentDate;
    }

    static registerVisit() {
        this.set("lastVisit", Utils.getNZFormattedDate());
    }

    static clearLastVisit() {
        this.set("lastVisit", "");
    }
}

// ====================
// DOM MANAGER
// ====================

class DOMManager {
    constructor() {
        this.elements = this.getElements();
        this.setupPlayer();
    }

    getElements() {
        return {
            // Video elements
            videoPlayer: document.getElementById("videoPlayer"),
            d20RollerVideo: document.getElementById("d20RollerVideo"),

            // UI containers
            container: document.querySelector(".container"),
            videoContainer: document.querySelector(".videoContainer"),
            timerContainer: document.querySelector(".timer-container"),
            posterSection: document.querySelector(".poster-section"),
            sundayDiv: document.querySelector(".sunday-div"),

            // Posters
            poster1: document.getElementById("poster-image-1"),
            poster2: document.getElementById("poster-image-2"),
            todaysPoster: document.querySelector("#todays-poster"),

            // Controls
            rollButton: document.getElementById("roll-button"),
            chunkSelector: document.getElementById("chunkSelector"),
            archiveButton: document.querySelector(".archive-button"),

            // Displays
            dayCountDisplay: document.getElementById("dayCount"),
            numberDisplay: document.querySelector(".numberDisplay"),
            epTitle: document.querySelector(".ep-title"),
            countdownTimer: document.getElementById("countdown-timer"),

            // Audio
            randomAudio: document.getElementById("randomAudio"),
            diceAudio: document.getElementById("diceAudio"),
            morbiusSound: document.getElementById("morbius-sound"),

            // Special
            sonic: document.querySelector("#sonic")
        };
    }

    setupPlayer() {
        this.player = new Plyr("#videoPlayer", {
            fullscreen: {
                enabled: true,
                fallback: true,
                iosNative: true,
            },
            controls: [
                "play-large", "play", "progress", "current-time",
                "duration", "pip", "fullscreen",
            ],
        });
    }

    show(element) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.style.display = "flex";
    }

    hide(element) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.style.display = "none";
    }

    addClass(element, className) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.classList.add(className);
    }

    removeClass(element, className) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.classList.remove(className);
    }

    setText(element, text) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.textContent = text;
    }

    setHTML(element, html) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.innerHTML = html;
    }

    changeFavicon(src) {
        const link = document.getElementById("dynamic-favicon");
        link.href = src;
    }

    updateTheme(bgColor) {
        document.documentElement.style.setProperty('--plyr-video-background', bgColor);
        document.documentElement.style.setProperty('--poster-color', bgColor);
    }
}

// ====================
// AUDIO MANAGER
// ====================

class AudioManager {
    constructor(urls = {}) {
        this.urls = urls;
        this.sounds = [];
    }

    setUrls(urls) {
        this.urls = urls;
    }

    setSounds(sounds) {
        this.sounds = sounds;
    }

    playDiceSound() {
        const diceSounds = [
            "audio/dice-roll01.mp3",
            "audio/dice-roll02.mp3",
            "audio/dice-roll03.mp3"
        ];
        const randomIndex = Math.floor(Math.random() * diceSounds.length);
        const audio = document.getElementById("diceAudio");
        audio.src = diceSounds[randomIndex];
        audio.play();
        console.log(`Playing dice roll sound ${randomIndex + 1}`);
    }

    playRandomSound(num) {
        const audioElement = document.getElementById("randomAudio");
        const randomArrNumber = Utils.getDateBasedRandomIndex(this.urls.randomSoundsCollection.length);
        const sounds = this.urls.randomSoundsCollection[randomArrNumber];

        console.log(`Random sound - Group ${randomArrNumber}, Sound ${num}, File - ${sounds[num - 1]}`);
        audioElement.src = sounds[num - 1];
        audioElement.play();

        if (num === 20) {
            this.showSonic();
        }
    }

    showSonic() {
        const sonic = document.querySelector("#sonic");
        sonic.style.display = "block";
        sonic.classList.add("animate");
        setTimeout(() => {
            sonic.style.display = "none";
        }, 6000);
    }

    playMorbiusSound() {
        const audio = document.getElementById("morbius-sound");
        audio.play();
    }
}

// ====================
// VIDEO MANAGER
// ====================

class VideoManager {
    constructor(domManager, audioManager) {
        this.dom = domManager;
        this.audio = audioManager;
        this.urls = {};
    }

    setUrls(urls) {
        this.urls = urls;
    }

    async playDiceVideo(number) {
        return new Promise((resolve) => {
            // Update video sources
            document.getElementById("diceSource1").src = this.urls.d20HEVCArray[number - 1];
            document.getElementById("diceSource2").src = this.urls.d20webmArray[number - 1];

            const video = this.dom.elements.d20RollerVideo;
            video.style.display = "block";
            video.load();

            const handleEnd = () => {
                this.audio.playRandomSound(number);

                setTimeout(() => video.classList.add("hidden"), 2000);
                setTimeout(() => {
                    video.style.display = "none";
                    video.classList.remove("hidden");
                }, 4000);

                video.removeEventListener("ended", handleEnd);
                resolve();
            };

            video.addEventListener("ended", handleEnd);
        });
    }

    setupChunkSelector(calculatedChunkNumber, morbCount, chunkArray, titleArray) {
        const selector = this.dom.elements.chunkSelector;
        const maxChunk = calculatedChunkNumber - morbCount;

        // Clear existing options
        selector.innerHTML = '';

        // Add options
        for (let i = 0; i < maxChunk; i++) {
            const option = document.createElement("option");
            option.value = i + 1;
            option.dataset.display = i + 1;
            option.dataset.descr = titleArray[i];
            option.textContent = i + 1;
            selector.prepend(option);
        }

        // Set current value
        selector.value = maxChunk;
        this.dom.setText('numberDisplay', maxChunk);

        // Setup event listeners
        this.setupSelectorEvents(selector, chunkArray, titleArray);
    }

    setupSelectorEvents(selector, chunkArray, titleArray) {
        selector.addEventListener("change", (e) => {
            const selectedValue = parseInt(e.target.value);
            const selectedIndex = selectedValue - 1;

            this.dom.elements.videoPlayer.src = chunkArray[selectedIndex];
            this.dom.setText('epTitle', titleArray[selectedIndex]);
            this.dom.setText('numberDisplay', selectedValue);
            e.target.blur();
        });

        const focusHandler = function () {
            Array.from(this.options).forEach(o => {
                o.textContent = `${o.getAttribute("value")}: ${o.getAttribute("data-descr")}`;
            });
        };

        const blurHandler = function () {
            Array.from(this.options).forEach(o => {
                o.textContent = o.getAttribute("value");
            });
        };

        selector.addEventListener("focus", focusHandler);
        selector.addEventListener("blur", blurHandler);
        blurHandler.call(selector);
    }
}

// ====================
// EFFECT MANAGER
// ====================

class EffectManager {
    constructor() { }

    async movieWinnerLoser(winner, loser, rollButton) {
        return new Promise((resolve) => {
            winner.classList.add("winner");
            const posterComputed = getComputedStyle(winner);
            const posterMargin = parseFloat(posterComputed.marginLeft);
            const posterWidth = winner.getBoundingClientRect().width;
            const rollButtonWidth = rollButton.getBoundingClientRect().width;
            const movementDistance = posterWidth / 2 + posterMargin + rollButtonWidth / 2;

            if (winner.id === "poster-image-1") {
                winner.style.transform = `translate(${movementDistance}px, 0)`;
            }

            loser.classList.add("hidden", "fade-out-fast");

            setTimeout(() => {
                document.querySelector(".poster-section").classList.add("hidden", "fade-out-slow");
            }, 2000);

            setTimeout(() => {
                document.querySelector(".poster-section").style.display = "none";
                requestAnimationFrame(() => resolve());
            }, 4000);
        });
    }

    letItSnowSonic(imageUrl = "./images/sonic-snow.gif") {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
        script.onload = () => {
            particlesJS("snow", {
                particles: {
                    number: { value: 100, density: { enable: true, value_area: 800 } },
                    shape: { type: "image", image: { src: imageUrl, width: 100, height: 100 } },
                    opacity: { value: 0.7, random: false, anim: { enable: false } },
                    size: { value: 20, random: true, anim: { enable: false } },
                    line_linked: { enable: false },
                    move: {
                        enable: true, speed: 5, direction: "bottom", random: true,
                        straight: false, out_mode: "out", bounce: false,
                        attract: { enable: true, rotateX: 300, rotateY: 1200 }
                    }
                },
                interactivity: {
                    events: { onhover: { enable: false }, onclick: { enable: false }, resize: false }
                },
                retina_detect: true
            });
        };
        document.head.append(script);
    }
}

// ====================
// SOUND BOARD MANAGER
// ====================

class SoundBoardManager {
    constructor(urls) {
        this.urls = urls;
    }

    init() {
        const soundSets = this.urls.randomSoundsCollection;
        const grid = document.querySelector('.grid');
        const tabsContainer = document.querySelector('.tabs');
        let currentTab = 0;

        const renderTabs = () => {
            tabsContainer.innerHTML = '';
            soundSets.forEach((_, index) => {
                const tab = document.createElement('div');
                tab.className = 'tab' + (index === 0 ? ' active' : '');
                tab.dataset.tab = index;
                tab.textContent = `Set ${index + 1}`;
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentTab = index;
                    renderGrid();
                });
                tabsContainer.appendChild(tab);
            });
        };

        const renderGrid = () => {
            grid.innerHTML = '';
            const set = soundSets[currentTab];
            set.forEach((sound, i) => {
                const btn = document.createElement('button');
                btn.innerHTML = `${i + 1}<br>${sound.split("/").pop().split(".")[0].replace(/^\d+\s*-\s*/, "")}`;
                btn.addEventListener('click', () => {
                    const audio = new Audio(sound);
                    audio.play();
                });
                grid.appendChild(btn);
            });
        };

        renderTabs();
        renderGrid();
    }
}

// ====================
// MAIN APPLICATION
// ====================

class ChunkPlayerApp {
    constructor() {
        this.dateManager = new DateManager();
        this.apiService = new ApiService(CONFIG.api.baseUrl);
        this.domManager = new DOMManager();
        this.audioManager = new AudioManager(); // Remove the empty object
        this.videoManager = new VideoManager(this.domManager, this.audioManager);
        this.effectManager = new EffectManager();
        this.soundBoardManager = null;

        this.urls = {};
        this.chunkArray = [];
        this.titleArray = [];
        this.morbCount = 0;
        this.randomNumber = 0;

        this.init();
    }

    async init() {
        try {
            await this.loadUrls();
            this.setupEventListeners();
            this.setupDebugMode();
            await this.runMainLogic();
        } catch (error) {
            console.error("Application initialization failed:", error);
        }
    }

    async loadUrls() {
        const response = await fetch("urls.json");
        this.urls = await response.json();

        this.chunkArray = this.urls[this.dateManager.currentMovie.code].chunks;
        this.titleArray = this.urls[this.dateManager.currentMovie.code].titles;

        this.audioManager.setUrls(this.urls);
        this.videoManager.setUrls(this.urls);
        this.soundBoardManager = new SoundBoardManager(this.urls);

        // Setup special day sounds
        if (this.dateManager.isRobertBday()) {
            this.audioManager.setSounds(this.urls.randomSounds_bday);
            this.effectManager.letItSnowSonic();
        }

        // Update theme
        this.domManager.updateTheme(this.dateManager.currentMovie.bgColor);
    }

    setupEventListeners() {
        // Roll button
        this.domManager.elements.rollButton.addEventListener("click", () => this.rollForMovieChoice());

        // Archive button
        this.domManager.elements.archiveButton.addEventListener("click", () => this.updateVideo());

        // Episode title click (debug dice)
        this.domManager.elements.epTitle.addEventListener("click", () => {
            this.videoManager.playDiceVideo(Math.floor(Math.random() * 20 + 1));
        });

        // Morb unlock mechanisms
        this.setupMorbUnlocks();
    }

    setupMorbUnlocks() {
        // Keyboard unlock
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

        // Tap unlock
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

    setupDebugMode() {
        if (CONFIG.debug.clearLastVisit) {
            StorageManager.clearLastVisit();
        }
    }

    async runMainLogic() {
        if (this.dateManager.isTodaySunday()) {
            this.showSundayScreen();
        } else if (this.shouldLockdown()) {
            this.lockdown();
        } else {
            await this.handleMainFlow();
        }
    }

    shouldLockdown() {
        return this.dateManager.isPastMidnight() ||
            this.dateManager.startDateMidnight > this.dateManager.now;
    }

    async handleMainFlow() {
        if (StorageManager.isFirstVisitToday()) {
            await this.handleFirstVisit();
        } else {
            await this.handleReturnVisit();
        }
    }

    async handleFirstVisit() {
        const calculatedChunkNumber = this.dateManager.calculateChunkNumber();
        const videoNumberText = calculatedChunkNumber - this.morbCount;

        // Setup posters
        this.domManager.show('posterSection');
        this.domManager.elements.poster1.src = videoNumberText == 1 ? "images/question.jpg" : this.urls[this.dateManager.currentMovie.code].poster;
        this.domManager.elements.poster2.src = this.urls.morb.poster;
    }

    async handleReturnVisit() {
        this.randomNumber = StorageManager.getInt("randomNumber");
        this.morbCount = StorageManager.getInt("dailyMorbCount");

        // Apply debug overrides
        if (CONFIG.debug.forceRoll) {
            this.randomNumber = CONFIG.debug.forceRoll;
        }

        if (this.randomNumber === 1) {
            await this.morb();
        } else {
            await this.updateVideo();
        }
    }

    showSundayScreen() {
        this.domManager.removeClass('container', 'hidden');
        this.domManager.show('container');
        this.domManager.elements.sundayDiv.style.justifyContent = "center";
        this.domManager.show('sundayDiv');
        this.domManager.hide('videoContainer');
        this.domManager.hide('timerContainer');
    }

    lockdown() {
        console.log("lockdown");
        this.domManager.removeClass('container', 'hidden');
        this.domManager.show('container');
        document.getElementById("snow").style.display = "none";

        this.domManager.hide('videoContainer');
        this.domManager.show('timerContainer');

        let movieSpoilerCode = this.dateManager.currentMovie.code;
        if (this.dateManager.startDate7AM > this.dateManager.now) {
            movieSpoilerCode = "???";
        }

        this.domManager.setText('epTitle', `The next ${movieSpoilerCode}chunk is currently locked, it will unlock in`);
        this.updateCountdown();
    }

    updateCountdown() {
        const now = new Date();
        const nextEightAM = new Date(now);
        nextEightAM.setHours(8, 0, 0, 0);

        if (now.getHours() >= 8) {
            nextEightAM.setDate(now.getDate() + 1);
        }

        const timeDifference = nextEightAM - now;

        if (!this.dateManager.isPastMidnight() &&
            this.dateManager.startDateMidnight < new Date()) {
            this.updateVideo();
        } else {
            const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

            const formatted = [hours, minutes, seconds]
                .map(n => String(n).padStart(2, "0"))
                .join(":");

            this.domManager.setText('countdownTimer', formatted);
            setTimeout(() => this.updateCountdown(), 1000);
        }
    }

    async updateVideo(isFirst = false) {
        console.log("update video");

        this.domManager.show('videoContainer');
        this.domManager.hide('timerContainer');
        this.domManager.hide('sundayDiv');

        const calculatedChunkNumber = this.dateManager.calculateChunkNumber();
        this.morbCount = await this.apiService.getMorbCount();

        const videoNumberText = calculatedChunkNumber - this.morbCount;
        const videoNumberIndex = videoNumberText - 1;

        // Update video
        this.domManager.elements.videoPlayer.src = this.chunkArray[videoNumberIndex];
        this.domManager.show('container');

        // Update displays
        this.domManager.setText('dayCountDisplay', `/ ${this.chunkArray.length}`);
        this.domManager.setText('epTitle', this.titleArray[videoNumberIndex]);

        // Update poster and favicon
        const posterSrc = videoNumberText == 1 ? "images/question.jpg" : this.urls[this.dateManager.currentMovie.code].poster;
        this.domManager.elements.todaysPoster.src = posterSrc;
        this.domManager.changeFavicon(this.urls[this.dateManager.currentMovie.code].favicon);
        document.title = `${Utils.toSentenceCase(this.dateManager.currentMovie.code)} Chunk Player`;

        // Setup selector
        this.videoManager.setupChunkSelector(calculatedChunkNumber, this.morbCount, this.chunkArray, this.titleArray);

        console.log(`Days passed: ${calculatedChunkNumber} - Morb count ${this.morbCount} = ${videoNumberText}`);

        if (isFirst) {
            requestAnimationFrame(() => {
                void this.domManager.elements.container.offsetWidth;
                this.domManager.removeClass('container', 'hidden');
            });
        } else {
            this.domManager.removeClass('container', 'hidden');
        }

        this.soundBoardManager.init();
    }

    async morb(isFirst = false) {
        document.title = "Clifford Chunk Player";
        this.domManager.changeFavicon(this.urls.morb.favicon);

        let currentMorbCount = StorageManager.getInt("dailyMorbCount");
        currentMorbCount += CONFIG.robMorbCount;
        if (currentMorbCount === 0) currentMorbCount = 1;

        this.domManager.elements.videoPlayer.src = this.urls.morb.chunks[currentMorbCount - 1];
        this.domManager.show('container');

        if (isFirst) {
            requestAnimationFrame(() => {
                this.domManager.addClass('container', 'unhidden');
            });
        } else {
            this.domManager.removeClass('container', 'hidden');
        }

        this.domManager.setText('dayCountDisplay', `/ ${this.urls.morb.chunks.length}`);
        this.domManager.setText('epTitle', "It's Cliffordin' Time");
        this.domManager.setText('numberDisplay', currentMorbCount);
        this.domManager.elements.todaysPoster.src = this.urls.morb.poster;
        this.domManager.elements.chunkSelector.style.pointerEvents = "none";
        this.domManager.setText('dayCountDisplay', `${this.urls.morb.chunks.length}`);

        this.audioManager.playMorbiusSound();
    }

    async rollForMovieChoice() {
        // Setup dice video event
        this.domManager.elements.d20RollerVideo.addEventListener("playing", () => {
            this.audioManager.playDiceSound();
        });

        this.domManager.addClass('rollButton', 'rolled');

        // Get roll from API or use debug override
        const roll = CONFIG.debug.forceRoll || await this.apiService.getRoll();
        const morbCount = await this.apiService.getMorbCount();

        StorageManager.setInt("randomNumber", roll);
        StorageManager.setInt("dailyMorbCount", morbCount);

        this.randomNumber = roll;
        this.morbCount = morbCount;

        console.log(`Daily roll is: ${roll}`);

        await this.videoManager.playDiceVideo(roll);

        // Register visit
        StorageManager.registerVisit();

        if (roll === 1) {
            await this.effectManager.movieWinnerLoser(
                this.domManager.elements.poster2,
                this.domManager.elements.poster1,
                this.domManager.elements.rollButton
            );
            setTimeout(() => this.morb(true), 4000);
        } else {
            await this.effectManager.movieWinnerLoser(
                this.domManager.elements.poster1,
                this.domManager.elements.poster2,
                this.domManager.elements.rollButton
            );
            this.updateVideo(true);
        }
    }
}

// ====================
// INITIALIZE APPLICATION
// ====================

// Initialize the application when DOM is loaded
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

// Add some helpful debug functions to window for console use
window.ChunkPlayerDebug = {
    clearLastVisit() {
        StorageManager.clearLastVisit();
        console.log("Last visit cleared, roll on!");
    },

    setTestDate(dateString) {
        CONFIG.debug.testDate = dateString;
        console.log(`Test date set to: ${dateString}`);
    },

    forceRoll(number) {
        CONFIG.debug.forceRoll = number;
        console.log(`Next roll forced to: ${number}`);
    },

    fakeTomorrow() {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        CONFIG.debug.testDate = tomorrow.toISOString();
        window.chunkPlayerApp.dateManager.now = tomorrow;
        window.chunkPlayerApp = new ChunkPlayerApp();
        console.log(`Faked tomorrow: ${tomorrow}`);
    },

    showConfig() {
        console.log("Current CONFIG:", CONFIG);
    },

    showStorageData() {
        const data = {
            lastVisit: StorageManager.get("lastVisit"),
            randomNumber: StorageManager.getInt("randomNumber"),
            dailyMorbCount: StorageManager.getInt("dailyMorbCount"),
            decision: StorageManager.get("decision")
        };
        console.log("Storage data:", data);
    }
};