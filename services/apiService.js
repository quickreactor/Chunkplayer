// ====================
// API SERVICE
// ====================

/**
 * Handles all API communication with Cloudflare Workers
 */
class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.ADMIN_SESSION_KEY = 'chunkplayer_admin_session';
        this.adminSession = this.loadAdminSession();
    }

    loadAdminSession() {
        try {
            const saved = sessionStorage.getItem(this.ADMIN_SESSION_KEY);
            const session = saved ? JSON.parse(saved) : null;
            if (session?.token && [1, 2].includes(session.level)) return session;
        } catch (error) {
            console.warn('Could not restore admin session:', error);
        }
        return null;
    }

    getClearance() {
        return this.adminSession?.level || 0;
    }

    clearAdminSession() {
        this.adminSession = null;
        sessionStorage.removeItem(this.ADMIN_SESSION_KEY);
    }

    async adminFetch(endpoint, options = {}) {
        const token = this.adminSession?.token;
        if (!token) {
            throw new Error('Admin clearance required');
        }

        const headers = new Headers(options.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            this.clearAdminSession();
            throw new Error('Admin session expired. Please log in again.');
        }
        return response;
    }

    /**
     * Fetch text response from API endpoint
     * @param {string} endpoint - API endpoint path
     * @returns {Promise<string>} Response text
     */
    async fetchText(endpoint) {
        try {
            console.log(`📡 Fetching from ${this.baseUrl}/${endpoint}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.text();
            console.log(`✅ Result from ${endpoint}:`, result);
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`❌ API Timeout (${endpoint}): Request took too long`);
                throw new Error(`Request timeout - the server took too long to respond`);
            }
            console.error(`❌ API Error (${endpoint}):`, error);
            ErrorHandler.handle(error, 'ApiService.fetchText', { throw: true });
        }
    }

    /**
     * Trigger self-morb (admin function)
     * @returns {Promise<Object>} JSON response
     */
    async selfMorb() {
        const response = await this.adminFetch('/self-morb', { method: 'POST' });
        return await response.json();
    }

    /**
     * Set normal movie pointer
     * @param {number} value - New pointer value
     * @returns {Promise<Object>} JSON response
     */
    async setNormalPointer(value) {
        const response = await this.adminFetch(`/set-normal-pointer?value=${value}`, { method: 'POST' });
        return await response.json();
    }

    /**
     * Set punishment movie pointer
     * @param {number} value - New pointer value
     * @returns {Promise<Object>} JSON response
     */
    async setPunishmentPointer(value) {
        const response = await this.adminFetch(`/set-punishment-pointer?value=${value}`, { method: 'POST' });
        return await response.json();
    }

    /**
     * Set reward movie pointer
     * @param {number} value - New pointer value
     * @returns {Promise<Object>} JSON response
     */
    async setRewardPointer(value) {
        const response = await this.adminFetch(`/set-reward-pointer?value=${value}`, { method: 'POST' });
        return await response.json();
    }

    /**
     * Set jokerless days
     * @param {number} value - New jokerless days value
     * @returns {Promise<Object>} JSON response
     */
    async setJokerlessDays(value) {
        const response = await this.adminFetch(`/set-jokerless-days?value=${value}`, { method: 'POST' });
        return await response.json();
    }

    /**
     * Set jokerless days old
     * @param {number} value - New jokerless days old value
     * @returns {Promise<Object>} JSON response
     */
    async setJokerlessDaysOld(value) {
        const response = await this.adminFetch(`/set-jokerless-days-old?value=${value}`, { method: 'POST' });
        return await response.json();
    }

    /**
     * Get daily data (roll value, movie information)
     * @returns {Promise<Object>} Daily data object
     */
    async getDailyData() {
        const response = await fetch(`${this.baseUrl}/get-daily-data`);
        return await response.json();
    }

    async getForcedRoll() {
        const response = await this.adminFetch('/admin/forced-roll');
        return await response.json();
    }

    async setForcedRoll(date, roll) {
        const response = await this.adminFetch('/admin/forced-roll', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, roll })
        });
        return await response.json();
    }

    async clearForcedRoll() {
        const response = await this.adminFetch('/admin/forced-roll', { method: 'DELETE' });
        return await response.json();
    }

    /**
     * Log in through the Worker. Passwords are never checked or stored in the browser.
     */
    async login(password) {
        const response = await fetch(`${this.baseUrl}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Invalid clearance code');
        }

        this.adminSession = { token: result.token, level: result.level };
        sessionStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(this.adminSession));
        return result.level;
    }

    /**
     * Report that punishment chunk was watched
     * Increments global punishment pointer
     * @returns {Promise<Object>} Updated state
     */
    async reportPunishment() {
        try {
            console.log('📡 Reporting punishment watch...');
            const response = await this.adminFetch('/report-punishment', {
                method: 'POST'
            });
            const result = await response.json();
            console.log('✅ Punishment reported, new pointer:', result.punishmentPointer);
            return result;
        } catch (error) {
            console.error('❌ Failed to report punishment:', error);
            ErrorHandler.handle(error, 'ApiService.reportPunishment');
            throw error;
        }
    }

    /**
     * Get all graffiti entries
     * @returns {Promise<Array>} Array of graffiti objects
     */
    async getGraffiti() {
        try {
            const response = await fetch(`${this.baseUrl}/get-graffiti`);
            return await response.json();
        } catch (error) {
            ErrorHandler.handle(error, 'ApiService.getGraffiti');
            return [];
        }
    }

    /**
     * Submit graffiti for today
     * @param {Object} graffitiData - { text, x, y, fontSize, rotation }
     * @returns {Promise<Object>} Response with success status
     */
    async submitGraffiti(graffitiData) {
        try {
            const response = await fetch(`${this.baseUrl}/submit-graffiti`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graffitiData)
            });
            return await response.json();
        } catch (error) {
            ErrorHandler.handle(error, 'ApiService.submitGraffiti');
            throw error;
        }
    }

    /**
     * Update a graffiti entry by index
     * @param {number} index - Array index of the entry to update
     * @param {Object} data - The full updated entry object
     * @returns {Promise<Object>} Response with success status
     */
    async updateGraffiti(index, data) {
        try {
            const response = await this.adminFetch('/update-graffiti', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index, data })
            });
            return await response.json();
        } catch (error) {
            ErrorHandler.handle(error, 'ApiService.updateGraffiti');
            throw error;
        }
    }

    /**
     * Clear graffiti (admin/debug function)
     * @returns {Promise<Object>} Response with success status
     */
    async clearGraffiti() {
        try {
            const response = await this.adminFetch('/clear-graffiti', { method: 'POST' });
            return await response.json();
        } catch (error) {
            ErrorHandler.handle(error, 'ApiService.clearGraffiti');
            throw error;
        }
    }

    /**
     * Update the Chunkplayer logo background colour for the active movie.
     * @param {string} color - Six-digit hexadecimal colour
     * @returns {Promise<Object>} Response with success status and updated movie type
     */
    async setLogoBackgroundColor(color) {
        try {
            const response = await this.adminFetch('/set-logo-bg-color', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ color })
            });
            return await response.json();
        } catch (error) {
            ErrorHandler.handle(error, 'ApiService.setLogoBackgroundColor');
            throw error;
        }
    }

    /**
     * Upload poster image to B2 via Worker
     * @param {File} file - Image file (JPEG/PNG)
     * @param {string} movieName - Movie name for path construction
     * @returns {Promise<Object>} Response with success status and poster URL
     */
    async uploadPoster(file, movieName) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('movieName', movieName);

            const response = await this.adminFetch('/upload-poster', {
                method: 'POST',
                body: formData
            });

            return await response.json();
        } catch (error) {
            ErrorHandler.handle(error, 'ApiService.uploadPoster');
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService };
}
