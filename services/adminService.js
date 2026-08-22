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
        this.currentClearance = this.apiService.getClearance(); // 0 = none, 1 = self-report, 2 = full admin
        this.pendingAction = null;
    }

    /**
     * Attempt login with password
     * @param {string} password - Password to verify
     * @returns {Promise<number>} Clearance level achieved (0, 1, or 2)
     */
    async login(password) {
        try {
            this.currentClearance = await this.apiService.login(password);
            return this.currentClearance;
        } catch (error) {
            this.currentClearance = 0;
            this.apiService.clearAdminSession();
            return 0;
        }
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback if confirmed
     * @param {string} confirmText - Text displayed on the confirmation button
     */
    showConfirmation(message, onConfirm, confirmText = 'Confirm') {
        const dialog = this.domService.elements.confirmDialog;
        const messageEl = this.domService.elements.confirmMessage;
        const yesBtn = this.domService.elements.confirmYes;
        const noBtn = this.domService.elements.confirmNo;

        messageEl.textContent = message;
        yesBtn.textContent = confirmText;
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
        this.domService.showToast(message, type);
    }

    /**
     * Handle punishment report with confirmation
     * @param {Function} onConfirmed - Callback after user confirms
     */
    handlePunishmentReport(onConfirmed) {
        this.showConfirmation(
            "Are you sure you are ready to morb?",
            onConfirmed,
            "Yes, I morbed"
        );
    }

    /**
     * Get current clearance level
     * @returns {number} Current clearance level
     */
    getClearance() {
        this.currentClearance = this.apiService.getClearance();
        return this.currentClearance;
    }

    /**
     * Reset clearance level
     */
    resetClearance() {
        this.currentClearance = 0;
        this.apiService.clearAdminSession();
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
     * Update jokerless days
     * @param {number} value - New jokerless days value
     * @returns {Promise<boolean>} Success status
     */
    async updateJokerlessDays(value) {
        try {
            const result = await this.apiService.setJokerlessDays(value);
            if (result.success) {
                this.showToast(`Jokerless days set to ${value}`, 'success');
                return true;
            }
            return false;
        } catch (error) {
            this.showToast('Failed to update jokerless days', 'error');
            console.error(error);
            return false;
        }
    }

    /**
     * Update jokerless days old
     * @param {number} value - New jokerless days old value
     * @returns {Promise<boolean>} Success status
     */
    async updateJokerlessDaysOld(value) {
        try {
            const result = await this.apiService.setJokerlessDaysOld(value);
            if (result.success) {
                this.showToast(`Jokerless days old set to ${value}`, 'success');
                return true;
            }
            return false;
        } catch (error) {
            this.showToast('Failed to update jokerless days old', 'error');
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

    /**
     * Handle poster upload flow
     * @param {File} file - Selected image file
     * @param {HTMLElement} statusEl - Status element for displaying messages
     * @param {string} movieName - Movie name for path construction
     * @returns {Promise<boolean>} Success status
     */
    async handlePosterUpload(file, statusEl, movieName) {
        // 1. Validate file type (JPEG/PNG only)
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            statusEl.textContent = 'Invalid file type. Only JPEG and PNG allowed.';
            statusEl.className = 'upload-status error';
            return false;
        }

        // 2. Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            statusEl.textContent = 'File too large. Maximum size is 10MB.';
            statusEl.className = 'upload-status error';
            return false;
        }

        // 3. Validate movie name
        if (!movieName) {
            statusEl.textContent = 'Movie name not available.';
            statusEl.className = 'upload-status error';
            return false;
        }

        // 4. Show uploading status
        statusEl.textContent = 'Uploading...';
        statusEl.className = 'upload-status';

        try {
            // 5. Call API
            const result = await this.apiService.uploadPoster(file, movieName);

            if (result.success) {
                statusEl.textContent = 'Poster updated!';
                statusEl.className = 'upload-status success';
                this.showToast('Poster uploaded successfully!', 'success');

                // 6. Reload page to show new poster
                setTimeout(() => location.reload(), 1500);
                return true;
            } else {
                statusEl.textContent = result.error || 'Upload failed.';
                statusEl.className = 'upload-status error';
                return false;
            }
        } catch (error) {
            console.error('Poster upload error:', error);
            statusEl.textContent = 'Upload failed. Please try again.';
            statusEl.className = 'upload-status error';
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminService };
}
