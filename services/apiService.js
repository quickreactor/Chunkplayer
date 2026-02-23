// ====================
// API SERVICE
// ====================

/**
 * Handles all API communication with Cloudflare Workers
 */
class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Fetch text response from API endpoint
     * @param {string} endpoint - API endpoint path
     * @returns {Promise<string>} Response text
     */
    async fetchText(endpoint) {
        try {
            console.log(`📡 Fetching from ${this.baseUrl}/${endpoint}`);
            const response = await fetch(`${this.baseUrl}/${endpoint}`);
            const result = await response.text();
            console.log(`✅ Result from ${endpoint}:`, result);
            return result;
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            ErrorHandler.handle(error, 'ApiService.fetchText', { throw: true });
        }
    }

    /**
     * Trigger self-morb (admin function)
     * @returns {Promise<Object>} JSON response
     */
    async selfMorb() {
        const response = await fetch(`${this.baseUrl}/self-morb`);
        return await response.json();
    }

    /**
     * Set normal movie pointer
     * @param {number} value - New pointer value
     * @returns {Promise<Object>} JSON response
     */
    async setNormalPointer(value) {
        const response = await fetch(`${this.baseUrl}/set-normal-pointer?value=${value}`);
        return await response.json();
    }

    /**
     * Set punishment movie pointer
     * @param {number} value - New pointer value
     * @returns {Promise<Object>} JSON response
     */
    async setPunishmentPointer(value) {
        const response = await fetch(`${this.baseUrl}/set-punishment-pointer?value=${value}`);
        return await response.json();
    }

    /**
     * Set reward movie pointer
     * @param {number} value - New pointer value
     * @returns {Promise<Object>} JSON response
     */
    async setRewardPointer(value) {
        const response = await fetch(`${this.baseUrl}/set-reward-pointer?value=${value}`);
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

    /**
     * Verify admin password (client-side hash check)
     * @param {string} password - Password to verify
     * @param {number} level - Clearance level (1 or 2)
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(password, level) {
        // Fallback to simple string comparison for insecure contexts (no crypto.subtle)
        const passwords = {
            level1: "grab",
            level2: "grief"
        };

        // Check if crypto.subtle is available (secure context)
        if (crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Pre-computed hashes for passwords
            const expectedHashes = {
                level1: "8959e3a7e6eef74b63caef1f8a79a8b425813134f01663bc88102e44694dacb9", // "grab"
                level2: "a73a2ae5fa0bd1c6f5da9d13c625f1ca696f8b47f46b38bc189e22d1c8e63d2e"  // "grief"
            };

            return hashHex === expectedHashes[`level${level}`];
        }

        // Insecure context fallback: direct string comparison
        return password === passwords[`level${level}`];
    }

    /**
     * Report that punishment chunk was watched
     * Increments global punishment pointer
     * @returns {Promise<Object>} Updated state
     */
    async reportPunishment() {
        try {
            console.log('📡 Reporting punishment watch...');
            const response = await fetch(`${this.baseUrl}/report-punishment`, {
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService };
}
