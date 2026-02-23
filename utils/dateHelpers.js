// ====================
// DATE HELPER UTILITIES
// ====================

/**
 * Date helper utilities for consistent date operations across the app
 */
class DateHelpers {
    /**
     * Get NZ formatted date string (YYYYMMDD)
     * Uses test date if configured for debugging
     * @returns {string} Formatted date string
     */
    static getNZFormattedDate() {
        const date = CONFIG.debug.testDate ? new Date(CONFIG.debug.testDate) : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}${month}${day}`;
    }

    /**
     * Check if a date is a specific day/month
     * @param {Date} date - Date to check
     * @param {number} month - Month (1-12)
     * @param {number} day - Day of month
     * @returns {boolean} True if date matches
     */
    static isDateSpecialDay(date, month, day) {
        return date.getMonth() === month - 1 && date.getDate() === day;
    }

    /**
     * Get a seed value for date-based randomization
     * Ensures consistent random values across users for the same date
     * @param {Date} date - Date to generate seed from
     * @returns {number} Seed value
     */
    static getDateSeed(date) {
        return date.getFullYear() * 10000 +
               (date.getMonth() + 1) * 100 +
               date.getDate();
    }

    /**
     * Get date-based random index for consistent selection
     * @param {number} length - Length of array to index into
     * @param {Date} date - Date to base randomness on (defaults to today)
     * @returns {number} Random index based on date
     */
    static getDateBasedRandomIndex(length, date = new Date()) {
        const seed = this.getDateSeed(date);
        const random = Math.sin(seed) * 10000;
        return Math.floor(Math.abs(random) % length);
    }

    /**
     * Calculate days passed between two dates, excluding Sundays
     * @param {Date} startDate - Start date (midnight)
     * @param {Date} endDate - End date (midnight)
     * @returns {number} Days passed (excluding Sundays)
     */
    static calculateDaysPassedExcludingSundays(startDate, endDate) {
        let daysPassed = 0;

        for (let d = new Date(startDate.getTime()); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0) { // Not Sunday
                daysPassed++;
            }
        }

        return daysPassed;
    }

    /**
     * Check if current time is past midnight (before 7 AM)
     * @param {Date} date - Date to check
     * @returns {boolean} True if past midnight but before 7 AM
     */
    static isPastMidnight(date) {
        const hour = date.getHours();
        return hour >= 0 && hour < 7;
    }

    /**
     * Check if date is Sunday
     * @param {Date} date - Date to check
     * @returns {boolean} True if Sunday
     */
    static isSunday(date) {
        return date.getDay() === 0;
    }

    /**
     * Create date at midnight (00:00:00.000)
     * @param {Date} date - Date to convert
     * @returns {Date} Date at midnight
     */
    static toMidnight(date) {
        const midnight = new Date(date);
        midnight.setHours(0, 0, 0, 0);
        return midnight;
    }

    /**
     * Create date at 7 AM (07:00:00.000)
     * @param {Date} date - Date to convert
     * @returns {Date} Date at 7 AM
     */
    static to7AM(date) {
        const at7AM = new Date(date);
        at7AM.setHours(7, 0, 0, 0);
        return at7AM;
    }

    /**
     * Create date at 8 AM (08:00:00.000)
     * @param {Date} date - Date to convert
     * @returns {Date} Date at 8 AM
     */
    static to8AM(date) {
        const at8AM = new Date(date);
        at8AM.setHours(8, 0, 0, 0);
        return at8AM;
    }

    /**
     * Get next 7 AM time from current time
     * Lockdown ends at 7 AM across the entire application
     * @param {Date} now - Current date/time
     * @returns {Date} Next 7 AM (today or tomorrow)
     */
    static getNext7AM(now) {
        const next7AM = this.to7AM(now);

        // If already past 7 AM, move to tomorrow
        if (now.getHours() >= 7) {
            next7AM.setDate(now.getDate() + 1);
        }

        return next7AM;
    }

    /**
     * Format milliseconds to HH:MM:SS
     * @param {number} ms - Milliseconds to format
     * @returns {string} Formatted time string
     */
    static formatTime(ms) {
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);

        return [hours, minutes, seconds]
            .map(n => String(n).padStart(2, "0"))
            .join(":");
    }

    /**
     * Convert string to sentence case
     * @param {string} string - String to convert
     * @returns {string} Sentence cased string
     */
    static toSentenceCase(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    /**
     * Delay execution for specified milliseconds
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DateHelpers };
}
