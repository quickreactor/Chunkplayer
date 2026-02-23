// ====================
// DICE ROLL LOGIC
// ====================

/**
 * Dice roll outcome constants
 */
const RollOutcome = {
    CRITICAL_FAIL: 'CRITICAL_FAIL',      // Roll of 1 - punishment movie
    CRITICAL_SUCCESS: 'CRITICAL_SUCCESS', // Roll of 20 - Dark Realm sequence
    NORMAL: 'NORMAL'                      // Roll of 2-19 - normal movie chunk
};

/**
 * Handles dice roll logic and outcome determination
 */
class DiceRollLogic {
    /**
     * Determine the outcome of a dice roll
     * @param {number} roll - The dice roll value (1-20)
     * @returns {string} RollOutcome constant
     */
    static determineOutcome(roll) {
        if (roll === 1) {
            return RollOutcome.CRITICAL_FAIL;
        }
        if (roll === 20) {
            return RollOutcome.CRITICAL_SUCCESS;
        }
        return RollOutcome.NORMAL;
    }

    /**
     * Check if a specific date triggers a special roll outcome
     * @param {Date} date - The date to check
     * @param {number} month - Month (1-12)
     * @param {number} day - Day of month
     * @returns {boolean} True if the date matches
     */
    static isDateSpecialDay(date, month, day) {
        return date.getMonth() === month - 1 && date.getDate() === day;
    }

    /**
     * Check if the date triggers auto-critical success (Dec 18)
     * @param {Date} date - The date to check
     * @returns {boolean} True if date triggers auto-crit
     */
    static isAutoCritDay(date) {
        return this.isDateSpecialDay(date, 12, 18);
    }

    /**
     * Get the actual roll value, accounting for debug overrides and special days
     * @param {number} dailyRoll - The roll value from API
     * @param {Date} currentDate - Current date
     * @param {number|null} debugForceRoll - Optional debug override
     * @returns {number} The final roll value to use
     */
    static getEffectiveRoll(dailyRoll, currentDate, debugForceRoll = null) {
        // Debug override takes precedence
        if (debugForceRoll !== null) {
            return debugForceRoll;
        }

        // Dec 18 triggers auto-crit
        if (this.isAutoCritDay(currentDate)) {
            return 20;
        }

        return dailyRoll;
    }

    /**
     * Check if a roll result is a failure (roll of 1)
     * @param {number} roll - The roll value
     * @returns {boolean} True if critical failure
     */
    static isCriticalFail(roll) {
        return roll === 1;
    }

    /**
     * Check if a roll result is a critical success (roll of 20)
     * @param {number} roll - The roll value
     * @returns {boolean} True if critical success
     */
    static isCriticalSuccess(roll) {
        return roll === 20;
    }

    /**
     * Check if a roll result is normal (2-19)
     * @param {number} roll - The roll value
     * @returns {boolean} True if normal roll
     */
    static isNormalRoll(roll) {
        return roll >= 2 && roll <= 19;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DiceRollLogic, RollOutcome };
}
