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
            return 2;
        }

        // Check level 1
        if (await this.apiService.verifyPassword(password, 1)) {
            this.currentClearance = 1;
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminService };
}
