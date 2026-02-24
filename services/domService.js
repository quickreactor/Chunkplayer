// ====================
// DOM SERVICE
// ====================

/**
 * Handles DOM manipulation and UI state management
 */
class DOMService {
    constructor() {
        this.elements = this.getElements();
        this.player = null;
        this.setupPlayer();
    }

    /**
     * Cache all DOM element references
     * @returns {Object} Object containing all DOM elements
     */
    getElements() {
        return {
            videoPlayer: document.getElementById("videoPlayer"),
            d20RollerVideo: document.getElementById("d20RollerVideo"),
            container: document.querySelector(".container"),
            videoContainer: document.querySelector(".videoContainer"),
            timerContainer: document.querySelector(".timer-container"),
            posterSection: document.querySelector(".poster-section"),
            sundayDiv: document.querySelector(".sunday-div"),
            poster1: document.getElementById("poster-image-1"),
            poster2: document.getElementById("poster-image-2"),
            todaysPoster: document.querySelector("#todays-poster"),
            rollButton: document.getElementById("roll-button"),
            flipButton: document.getElementById("flip-button"),
            chunkSelector: document.getElementById("chunkSelector"),
            archiveButton: document.querySelector(".archive-button"),
            dayCountDisplay: document.getElementById("dayCount"),
            numberDisplay: document.querySelector(".numberDisplay"),
            epTitle: document.querySelector(".ep-title"),
            countdownTimer: document.getElementById("countdown-timer"),
            randomAudio: document.getElementById("randomAudio"),
            diceAudio: document.getElementById("diceAudio"),
            morbiusSound: document.getElementById("morbius-sound"),
            sonic: document.querySelector("#sonic"),

            // Admin section
            adminSection: document.getElementById("admin-section"),
            adminToggleBtn: document.getElementById("admin-toggle-btn"),
            adminPanel: document.getElementById("admin-panel"),
            adminLogin: document.getElementById("admin-login"),
            adminPassword: document.getElementById("admin-password"),
            adminLoginBtn: document.getElementById("admin-login-btn"),
            adminError: document.getElementById("admin-error"),
            adminLevel1: document.getElementById("admin-level-1"),
            adminLevel2: document.getElementById("admin-level-2"),
            punishmentReportBtn: document.getElementById("punishment-report-btn"),
            bypassLockdownBtn: document.getElementById("bypass-lockdown-btn"),
            adminResetBtn: document.getElementById("admin-reset-btn"),
            adminForceRollBtn: document.getElementById("admin-force-roll-btn"),

            // Pointer controls
            adminNormalPointerInput: document.getElementById("normal-pointer-input"),
            adminPunishmentPointerInput: document.getElementById("punishment-pointer-input"),
            adminRewardPointerInput: document.getElementById("reward-pointer-input"),
            adminFakeRollInput: document.getElementById("fake-roll-input"),
            adminExecuteFakeRollBtn: document.getElementById("execute-fake-roll-btn"),
            adminClearLastVisitBtn: document.getElementById("clear-last-visit-btn"),
            stepperMinusBtns: document.querySelectorAll(".stepper-minus"),
            stepperPlusBtns: document.querySelectorAll(".stepper-plus"),
            stepperSetBtns: document.querySelectorAll('.stepper-set-btn'),

            // Dialog and toast
            confirmDialog: document.getElementById("confirm-dialog"),
            confirmMessage: document.getElementById("confirm-message"),
            confirmYes: document.getElementById("confirm-yes"),
            confirmNo: document.getElementById("confirm-no"),
            toast: document.getElementById("toast"),
            toastMessage: document.getElementById("toast-message")
        };
    }

    /**
     * Setup Plyr video player
     */
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

    /**
     * Show element by setting display to flex
     * @param {string|HTMLElement} element - Element or element key
     */
    show(element) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.style.display = "flex";
    }

    /**
     * Hide element by setting display to none
     * @param {string|HTMLElement} element - Element or element key
     */
    hide(element) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.style.display = "none";
    }

    /**
     * Add CSS class to element
     * @param {string|HTMLElement} element - Element or element key
     * @param {string} className - Class name to add
     */
    addClass(element, className) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.classList.add(className);
    }

    /**
     * Remove CSS class from element
     * @param {string|HTMLElement} element - Element or element key
     * @param {string} className - Class name to remove
     */
    removeClass(element, className) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.classList.remove(className);
    }

    /**
     * Set text content of element
     * @param {string|HTMLElement} element - Element or element key
     * @param {string} text - Text content
     */
    setText(element, text) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.textContent = text;
    }

    /**
     * Set inner HTML of element
     * @param {string|HTMLElement} element - Element or element key
     * @param {string} html - HTML content
     */
    setHTML(element, html) {
        if (typeof element === 'string') {
            element = this.elements[element];
        }
        element.innerHTML = html;
    }

    /**
     * Update favicon
     * @param {string} src - Favicon URL
     */
    changeFavicon(src) {
        const link = document.getElementById("dynamic-favicon");
        link.href = src;
    }

    /**
     * Update theme colors
     * @param {string} bgColor - Background color
     */
    updateTheme(bgColor) {
        document.documentElement.style.setProperty('--plyr-video-background', bgColor);
        document.documentElement.style.setProperty('--poster-color', bgColor);
    }

    /**
     * Show error message to user
     * @param {string} errorMessage - Error message to display
     */
    showError(errorMessage) {
        // Remove existing error if present
        const existingError = document.getElementById('app-error-display');
        if (existingError) {
            existingError.remove();
        }

        // Create error display element
        const errorDiv = document.createElement('div');
        errorDiv.id = 'app-error-display';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #dc3545;
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            z-index: 9999;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
        `;
        errorDiv.innerHTML = `
            <strong style="font-size: 16px;">❌ Error</strong><br>
            ${errorMessage}
        `;
        document.body.appendChild(errorDiv);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMService };
}
