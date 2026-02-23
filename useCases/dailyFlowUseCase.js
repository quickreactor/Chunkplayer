// ====================
// DAILY FLOW USE CASE
// ====================

/**
 * Handles the daily flow logic:
 * - Check if Sunday (rest day)
 * - Check if lockdown (before 8 AM)
 * - Show appropriate screen
 */
class DailyFlowUseCase {
    /**
     * @param {DateService} dateService - Date service instance
     * @param {DOMService} domService - DOM service instance
     * @param {Function} onShowSunday - Callback for Sunday screen
     * @param {Function} onLockdown - Callback for lockdown
     * @param {Function} onDailyContent - Callback for normal daily content
     */
    constructor(dateService, domService, onShowSunday, onLockdown, onDailyContent) {
        this.dateService = dateService;
        this.domService = domService;
        this.onShowSunday = onShowSunday;
        this.onLockdown = onLockdown;
        this.onDailyContent = onDailyContent;
    }

    /**
     * Execute the daily flow logic
     * @returns {Promise<void>}
     */
    async execute() {
        if (this.dateService.isTodaySunday()) {
            await this.onShowSunday();
        } else if (this.dateService.shouldLockdown()) {
            await this.onLockdown();
        } else {
            await this.onDailyContent();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DailyFlowUseCase };
}
