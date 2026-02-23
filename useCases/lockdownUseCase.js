// ====================
// LOCKDOWN USE CASE
// ====================

/**
 * Handles lockdown countdown and early morning restrictions
 */
class LockdownUseCase {
    /**
     * @param {DOMService} domService - DOM service instance
     * @param {DateService} dateService - Date service instance
     * @param {Function} onUnlock - Callback when lockdown ends
     * @param {Function} onShowAdmin - Callback to show admin section
     */
    constructor(domService, dateService, onUnlock, onShowAdmin = null) {
        this.dom = domService;
        this.dateService = dateService;
        this.onUnlock = onUnlock;
        this.onShowAdmin = onShowAdmin;
        this.timeoutId = null;
    }

    /**
     * Show lockdown screen and start countdown
     */
    lockdown() {
        console.log("lockdown");
        this.dom.removeClass('container', 'hidden');
        this.dom.show('container');
        document.getElementById("snow").style.display = "none";

        this.dom.hide('videoContainer');
        this.dom.show('timerContainer');

        // Show admin section during lockdown
        if (this.onShowAdmin) this.onShowAdmin();

        let movieSpoilerCode = CONFIG.movieData.normalMovie.name;
        if (this.dateService.startDate7AM > this.dateService.now) {
            movieSpoilerCode = "???";
        }

        this.dom.setText('epTitle', `The next ${movieSpoilerCode} chunk is currently locked, it will unlock in`);
        this.updateCountdown();
    }

    /**
     * Update countdown timer every second
     */
    updateCountdown() {
        // Clear existing timeout if any
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        // Use test date if configured, otherwise use current time
        const now = CONFIG.debug.testDate ? new Date(CONFIG.debug.testDate) : new Date();
        const next7AM = DateHelpers.getNext7AM(now);
        const timeDifference = next7AM - now;

        // Check if lockdown should end (past 7 AM)
        if (!this.dateService.isPastMidnight()) {
            this.onUnlock();
            return;
        }

        // Update display
        const formatted = DateHelpers.formatTime(timeDifference);
        this.dom.setText('countdownTimer', formatted);

        // Schedule next update
        this.timeoutId = setTimeout(() => this.updateCountdown(), 1000);
    }

    /**
     * Stop countdown (cleanup)
     */
    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LockdownUseCase };
}
