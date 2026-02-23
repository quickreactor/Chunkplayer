// ====================
// VISIT REPOSITORY
// ====================

/**
 * Repository for managing visit state in localStorage
 * Abstracts localStorage access for easier testing and cleaner code
 */
class VisitRepository {
    static STORAGE_KEY_LAST_VISIT = "lastVisit";

    /**
     * Get the last visit date string
     * @returns {string|null} Last visit date in YYYYMMDD format
     */
    static getLastVisit() {
        return localStorage.getItem(this.STORAGE_KEY_LAST_VISIT);
    }

    /**
     * Set the last visit date
     * @param {string} dateStr - Date string in YYYYMMDD format
     */
    static setLastVisit(dateStr) {
        localStorage.setItem(this.STORAGE_KEY_LAST_VISIT, dateStr);
    }

    /**
     * Clear the last visit (for testing/debugging)
     */
    static clearLastVisit() {
        localStorage.setItem(this.STORAGE_KEY_LAST_VISIT, "");
    }

    /**
     * Check if this is the first visit today
     * @param {string} currentDate - Current date in YYYYMMDD format (optional, defaults to today)
     * @returns {boolean} True if first visit today
     */
    static isFirstVisitToday(currentDate = null) {
        const today = currentDate || DateHelpers.getNZFormattedDate();
        const lastVisit = this.getLastVisit();
        return !lastVisit || lastVisit !== today;
    }

    /**
     * Register that the user has visited today
     * @param {string} dateStr - Date string in YYYYMMDD format (optional, defaults to today)
     */
    static registerVisit(dateStr = null) {
        const today = dateStr || DateHelpers.getNZFormattedDate();
        this.setLastVisit(today);
    }

    /**
     * Get integer value from localStorage
     * @param {string} key - Storage key
     * @returns {number} Integer value or 0 if not found
     */
    static getInt(key) {
        return parseInt(localStorage.getItem(key)) || 0;
    }

    /**
     * Set integer value in localStorage
     * @param {string} key - Storage key
     * @param {number} value - Integer value to store
     */
    static setInt(key, value) {
        localStorage.setItem(key, parseInt(value));
    }

    /**
     * Get string value from localStorage
     * @param {string} key - Storage key
     * @returns {string|null} Value or null if not found
     */
    static get(key) {
        return localStorage.getItem(key);
    }

    /**
     * Set string value in localStorage
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     */
    static set(key, value) {
        localStorage.setItem(key, value);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VisitRepository };
}
