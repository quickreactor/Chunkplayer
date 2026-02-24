// ====================
// ADMIN SERVICE
// ====================

/**
 * Admin Service - handles password-protected admin features
 */
class AdminService {
    constructor(apiService, domService) {
        this.apiService = apiService;
        this.domService = domService;
        this.currentClearance = 0; // 0 = none, 1 = self-report, 2 = full admin
        this.pendingAction = null;
        this.STORAGE_KEY = 'admin_clearance';
        this.DATE_KEY = 'admin_clearance_date';

        // Restore clearance from localStorage if it's from today
        this.restoreClearance();
    }

    /**
     * Get today's date key for localStorage
     */
    _getTodayKey() {
        const today = new Date();
        return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    }

    /**
     * Restore clearance from localStorage if it's from today
     */
    restoreClearance() {
        const savedDate = localStorage.getItem(this.DATE_KEY);
        const today = this._getTodayKey();

        if (savedDate === today) {
            const savedClearance = localStorage.getItem(this.STORAGE_KEY);
            if (savedClearance) {
                this.currentClearance = parseInt(savedClearance);
                console.log(`%c[Admin] Restored clearance level ${this.currentClearance} for ${today}`, 'color: #00ff00; font-weight: bold');
            }
        } else {
            // Clear stale clearance from previous day
            this.clearStoredClearance();
        }
    }

    /**
     * Save clearance to localStorage
     */
    saveClearance() {
        const today = this._getTodayKey();
        localStorage.setItem(this.STORAGE_KEY, this.currentClearance.toString());
        localStorage.setItem(this.DATE_KEY, today);
    }

    /**
     * Clear stored clearance from localStorage
     */
    clearStoredClearance() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.DATE_KEY);
    }

    /**
     * Attempt login with password
     * @param {string} password - Password to verify
     * @returns {Promise<number>} Clearance level achieved (0, 1, or 2)
     */
    async login(password) {
        // Check level 2 first (higher clearance)
        if (await this.apiService.verifyPassword(password, 2)) {
            this.currentClearance = 2;
            this.saveClearance();
            return 2;
        }

        // Check level 1
        if (await this.apiService.verifyPassword(password, 1)) {
            this.currentClearance = 1;
            this.saveClearance();
            return 1;
        }

        this.currentClearance = 0;
        return 0;
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback if confirmed
     */
    showConfirmation(message, onConfirm) {
        const dialog = this.domService.elements.confirmDialog;
        const messageEl = this.domService.elements.confirmMessage;
        const yesBtn = this.domService.elements.confirmYes;
        const noBtn = this.domService.elements.confirmNo;

        messageEl.textContent = message;
        dialog.classList.remove('hidden');

        const cleanup = () => {
            dialog.classList.add('hidden');
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
        };

        const onYes = async () => {
            cleanup();
            await onConfirm();
        };

        const onNo = () => {
            cleanup();
        };

        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', or 'info'
     */
    showToast(message, type = 'success') {
        const toast = this.domService.elements.toast;
        const toastMessage = this.domService.elements.toastMessage;

        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    /**
     * Handle punishment report with confirmation
     * @param {Function} onConfirmed - Callback after user confirms
     */
    handlePunishmentReport(onConfirmed) {
        this.showConfirmation(
            "Are you sure you are ready to morb?",
            onConfirmed
        );
    }

    /**
     * Get current clearance level
     * @returns {number} Current clearance level
     */
    getClearance() {
        return this.currentClearance;
    }

    /**
     * Reset clearance level
     */
    resetClearance() {
        this.currentClearance = 0;
    }

    /**
     * Update a movie queue pointer
     * @param {string} type - 'normal', 'punishment', or 'reward'
     * @param {number} value - New pointer value
     * @returns {Promise<boolean>} Success status
     */
    async updatePointer(type, value) {
        try {
            let result;
            switch (type) {
                case 'normal':
                    result = await this.apiService.setNormalPointer(value);
                    break;
                case 'punishment':
                    result = await this.apiService.setPunishmentPointer(value);
                    break;
                case 'reward':
                    result = await this.apiService.setRewardPointer(value);
                    break;
                default:
                    throw new Error(`Invalid pointer type: ${type}`);
            }

            if (result.success) {
                this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} pointer set to ${value}`, 'success');
                return true;
            }
            return false;
        } catch (error) {
            this.showToast(`Failed to update ${type} pointer`, 'error');
            console.error(error);
            return false;
        }
    }

    /**
     * Execute fake roll with clear last visit
     * @param {number} rollValue - Roll value (1-20)
     */
    executeFakeRoll(rollValue) {
        Debug.forceRoll(rollValue);
        VisitRepository.clearLastVisit();
        this.showToast(`Fake roll ${rollValue} set - showing poster selection...`, 'success');

        // Trigger poster selection without reloading (preserves debug.forceRoll)
        setTimeout(() => {
            if (window.chunkPlayerApp) {
                window.chunkPlayerApp.handleNormalFirstVisit();
            }
        }, 500);
    }

    /**
     * Clear last visit and reload
     */
    clearLastVisitAndReload() {
        VisitRepository.clearLastVisit();
        this.showToast('Last visit cleared - reloading...', 'success');
        setTimeout(() => location.reload(), 1000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminService };
}
