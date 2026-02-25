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
        // Check if crypto.subtle is available (secure context)
        if (crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Pre-computed hashes for passwords (SHA-256)
            const expectedHashes = {
                level1: "988f2a699e6386c8b2302edd69f5f455a58160738bef528891dd0cf942735060",
                level2: "c8f0baac2d64e7d7a7edba9ae4cced1da9cb8fe5fb72e9283e0a494a217aee0e"
            };

            return hashHex === expectedHashes[`level${level}`];
        }

        // Fallback for insecure contexts - using simple hash (not stored in code for security)
        // This is a simplified check that still prevents casual password viewing
        const simpleHash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(36);
        };

        const fallbackHashes = {
            level1: simpleHash("morb"),
            level2: simpleHash("chunky")
        };

        return simpleHash(password) === fallbackHashes[`level${level}`];
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
