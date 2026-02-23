// ====================
// DATE SERVICE
// ====================

/**
 * Service for date-related operations and time-based rules
 */
class DateService {
    constructor(startDateMidnight = null) {
        // Use test date if configured, otherwise use current date
        this.now = CONFIG.debug.testDate ? new Date(CONFIG.debug.testDate) : new Date();

        // Set start date (when chunk player began)
        // Default to Jan 1, 2024 at midnight if not specified
        this.startDateMidnight = startDateMidnight || new Date('2024-01-01T00:00:00');
        this.startDate7AM = new Date(this.startDateMidnight);
        this.startDate7AM.setHours(7, 0, 0, 0);

        // Initial chunk number
        this.initialChunkNumber = 1;
    }

    /**
     * Check if today is Sunday
     * @returns {boolean} True if Sunday
     */
    isTodaySunday() {
        return DateHelpers.isSunday(this.now);
    }

    /**
     * Check if current time is past midnight (before 7 AM)
     * @returns {boolean} True if past midnight
     */
    isPastMidnight() {
        return DateHelpers.isPastMidnight(this.now);
    }

    /**
     * Check if today is Robert's birthday (Nov 28)
     * @returns {boolean} True if Robert's birthday
     */
    isRobertBday() {
        return DateHelpers.isDateSpecialDay(this.now, 11, 28);
    }

    /**
     * Check if we should be in lockdown mode
     * Lockdown if: past midnight OR before start date
     * @returns {boolean} True if should lockdown
     */
    shouldLockdown() {
        return this.isPastMidnight() || this.startDateMidnight > this.now;
    }

    /**
     * Calculate current chunk number based on days passed
     * @returns {number} Calculated chunk number
     */
    calculateChunkNumber() {
        let calculatedChunkNumber = this.initialChunkNumber - 1;

        const today = DateHelpers.toMidnight(new Date(this.now));

        for (let d = new Date(this.startDateMidnight.getTime()); d <= today; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0) { // Not Sunday
                calculatedChunkNumber++;
            }
        }

        return calculatedChunkNumber;
    }

    /**
     * Update the current date (for testing/debugging)
     * @param {Date} newDate - New date to use
     */
    setDate(newDate) {
        this.now = newDate;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DateService };
}
