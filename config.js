// ====================
// CONFIG & CONSTANTS
// ====================

/**
 * Immutable application configuration
 * Contains static settings that don't change at runtime
 */
class AppConfig {
    // Automatically detect local vs production environment
    static get API_BASE_URL() {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

        return isLocal
            ? "http://localhost:8787"  // Local Wrangler dev server
            : "https://chunkplayerneo.quickreactor.workers.dev";  // Production
    }

    static INITIAL_CHUNK_NUMBER = 1;
}

/**
 * Debug configuration - mutable for testing purposes
 */
class DebugConfig {
    constructor() {
        this.testDate = null;
        this.forceRoll = null;
        this.clearLastVisit = false;
    }

    getTestDate(ddmm, h) {
        const [day, month] = ddmm.split("/").map(Number);
        const year = new Date().getFullYear();
        return new Date(year, month - 1, day, h, 0, 0, 0);
    }

    /**
     * Set a test date and hour for debugging
     * @param {string} ddmm - Date in DD/MM format (e.g., "23/02")
     * @param {number} hour - Hour in 24h format (0-23, e.g., 9 for 9 AM)
     */
    setTestDate(ddmm, hour = 9) {
        this.testDate = this.getTestDate(ddmm, hour);
        console.log(`%c[Debug] Test date set to: ${this.testDate.toLocaleString()}`, 'color: #00ff00; font-weight: bold');
        console.log('%c[Debug] Changes apply immediately for date-based logic', 'color: #ffaa00');
    }

    /**
     * Clear the test date and return to real time
     */
    clearTestDate() {
        this.testDate = null;
        console.log('%c[Debug] Test date cleared - using real time', 'color: #ffaa00; font-weight: bold');
    }

    /**
     * Force a specific dice roll outcome (1-20)
     * @param {number} roll - The roll value to force
     */
    setForceRoll(roll) {
        this.forceRoll = roll;
        console.log(`%c[Debug] Forced roll set to: ${roll}`, 'color: #00ff00; font-weight: bold');
    }

    /**
     * Clear the forced roll
     */
    clearForceRoll() {
        this.forceRoll = null;
        console.log('%c[Debug] Forced roll cleared - using random roll', 'color: #ffaa00; font-weight: bold');
    }

    /**
     * Show current debug configuration
     */
    showConfig() {
        console.table({
            testDate: this.testDate ? this.testDate.toLocaleString() : 'null (real time)',
            forceRoll: this.forceRoll || 'null (random)',
            clearLastVisit: this.clearLastVisit
        });
    }

    /**
     * Clear last visit from localStorage (triggers poster selection)
     */
    clearLastVisit() {
        const todayKey = DateHelpers.getNZFormattedDate();
        localStorage.removeItem(`lastVisit_${todayKey}`);
        console.log(`%c[Debug] Cleared last visit for ${todayKey}`, 'color: #00ff00; font-weight: bold');
        console.log('%c[Debug] Reload the page to see poster selection screen', 'color: #ffaa00');
    }

    /**
     * Show all localStorage data
     */
    showStorageData() {
        console.log('%c[Debug] localStorage data:', 'color: #00ff00; font-weight: bold');
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('lastVisit_')) {
                data[key] = localStorage.getItem(key);
            }
        }
        console.table(data);
    }

    /**
     * Simulate tomorrow (sets date to next day at 9 AM)
     */
    fakeTomorrow() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        this.setTestDate(`${dd}/${mm}`, 9);
    }
}

/**
 * Runtime application state
 * State that changes during application execution
 */
class AppState {
    constructor() {
        this.movieData = null;
        this.urls = {};
        this.chunkArray = [];
        this.titleArray = [];
        this.debug = new DebugConfig();
    }
}

// Global instances
const CONFIG = {
    api: {
        baseUrl: AppConfig.API_BASE_URL
    },
    debug: new DebugConfig(),
    movieData: null,
    initialChunkNumber: AppConfig.INITIAL_CHUNK_NUMBER
};

// Uncomment for testing specific dates
// CONFIG.debug.testDate = CONFIG.debug.getTestDate("19/01", 9);
