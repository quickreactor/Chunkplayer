// ====================
// CLOUDFLARE WORKER CHANGES
// ====================
//
// Add this file's contents to your Cloudflare Worker at:
// chunkplayerneo.quickreactor.workers.dev
//
// These are the changes needed to support the self-report punishment feature.

// ========================================
// 1. ADD NEW ENDPOINT: /report-punishment
// ========================================

/**
 * POST /report-punishment
 * Increments punishment pointer atomically and invalidates cache
 *
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Response} JSON response with success status and new pointer
 */
async function handleReportPunishment(env) {
    try {
        // Get current state from KV storage
        const stateJson = await env.STATE.get("state");
        if (!stateJson) {
            return Response.json({
                success: false,
                error: "State not found"
            }, { status: 404 });
        }

        const state = JSON.parse(stateJson);

        // Increment punishment pointer
        state.punishmentMovie.pointer += 1;

        // Handle wrap-around if pointer exceeds array length
        const punishmentChunkCount = state.punishmentMovie.chunks.length;
        if (state.punishmentMovie.pointer > punishmentChunkCount) {
            state.punishmentMovie.pointer = 1; // Wrap to beginning
        }

        // Save updated state
        await env.STATE.put("state", JSON.stringify(state));

        // Invalidate dailyData cache (if using cache)
        if (env.CACHE) {
            await env.CACHE.delete("dailyData");
        }

        console.log(`Punishment reported. New pointer: ${state.punishmentMovie.pointer}`);

        return Response.json({
            success: true,
            punishmentPointer: state.punishmentMovie.pointer
        });

    } catch (error) {
        console.error("Error in handleReportPunishment:", error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// ========================================
// 2. REFACTOR /get-daily-data (if needed)
// ========================================

/**
 * GET /get-daily-data
 * Returns computed daily data from state
 *
 * If you currently store dailyData separately, refactor to compute from state.
 * This ensures single source of truth and eliminates dual-write complexity.
 *
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Response} JSON response with daily data
 */
async function handleGetDailyData(env) {
    try {
        // Try cache first (optional, for performance)
        if (env.CACHE) {
            const cached = await env.CACHE.get("dailyData");
            if (cached) {
                return Response.json(JSON.parse(cached));
            }
        }

        // Get state from KV storage
        const stateJson = await env.STATE.get("state");
        if (!stateJson) {
            return Response.json({
                success: false,
                error: "State not found"
            }, { status: 404 });
        }

        const state = JSON.parse(stateJson);

        // Get today's roll using your existing roll logic
        const todayRoll = getTodayRoll(state);

        // Compute dailyData from state
        const dailyData = {
            roll: todayRoll,
            morbed: state.morbed || false,
            normalMovie: {
                chunks: state.normalMovie.chunks,
                titles: state.normalMovie.titles,
                posterUrl: state.normalMovie.posterUrl,
                pointer: state.normalMovie.pointer,
                bgColor: state.normalMovie.bgColor,
                faviconUrl: state.normalMovie.faviconUrl,
                name: state.normalMovie.name
            },
            punishmentMovie: {
                chunks: state.punishmentMovie.chunks,
                titles: state.punishmentMovie.titles,
                posterUrl: state.punishmentMovie.posterUrl,
                pointer: state.punishmentMovie.pointer, // Always fresh!
                bgColor: state.punishmentMovie.bgColor,
                faviconUrl: state.punishmentMovie.faviconUrl,
                name: state.punishmentMovie.name
            },
            rewardMovie: {
                preRoll: state.rewardMovie.preRoll,
                postRoll: state.rewardMovie.postRoll
            }
        };

        // Cache for 60 seconds (optional, for performance)
        if (env.CACHE) {
            await env.CACHE.put("dailyData", JSON.stringify(dailyData), {
                expirationTtl: 60
            });
        }

        return Response.json(dailyData);

    } catch (error) {
        console.error("Error in handleGetDailyData:", error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// ========================================
// 3. UPDATE MAIN ROUTER
// ========================================

/**
 * In your main worker fetch handler, add the new route:
 */
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Route handling
        if (path === "/report-punishment" && request.method === "POST") {
            return handleReportPunishment(env);
        }

        if (path === "/get-daily-data") {
            return handleGetDailyData(env);
        }

        // ... existing routes ...

        return new Response("Not found", { status: 404 });
    }
};

// ========================================
// 4. INITIAL STATE STRUCTURE (for reference)
// ========================================

/**
 * Your state in KV should have this structure:
 *
 * {
 *   "morbed": false,
 *   "normalMovie": {
 *     "chunks": ["url1", "url2", ...],
 *     "titles": ["Chapter 1", "Chapter 2", ...],
 *     "posterUrl": "https://...",
 *     "bgColor": "#bc1a26",
 *     "faviconUrl": "https://...",
 *     "name": "Movie Name",
 *     "pointer": 1
 *   },
 *   "punishmentMovie": {
 *     "chunks": ["url1", "url2", ...],
 *     "titles": ["Chapter 1", "Chapter 2", ...],
 *     "posterUrl": "https://...",
 *     "bgColor": "#1a1a1a",
 *     "faviconUrl": "https://...",
 *     "name": "MORBIUS",
 *     "pointer": 1
 *   },
 *   "rewardMovie": {
 *     "preRoll": ["url1", "url2", ...],
 *     "postRoll": ["url1", "url2", ...],
 *     "pointer": 1
 *   }
 * }
 */

// ========================================
// 5. OPTIONAL BINDINGS CONFIGURATION
// ========================================

/**
 * In wrangler.toml, ensure you have these bindings:
 *
 * [[kv_namespaces]]
 * binding = "STATE"
 * id = "your_kv_namespace_id"
 *
 * [[kv_namespaces]]
 * binding = "CACHE"
 * id = "your_cache_kv_namespace_id"  # Optional, for performance
 */

// ========================================
// 6. TESTING THE ENDPOINT
// ========================================

/**
 * Test the /report-punishment endpoint:
 *
 * curl -X POST https://chunkplayerneo.quickreactor.workers.dev/report-punishment
 *
 * Expected response:
 * {
 *   "success": true,
 *   "punishmentPointer": 2
 * }
 *
 * Test the /get-daily-data endpoint:
 *
 * curl https://chunkplayerneo.quickreactor.workers.dev/get-daily-data
 *
 * Expected response:
 * {
 *   "roll": 15,
 *   "morbed": false,
 *   "normalMovie": { ... },
 *   "punishmentMovie": {
 *     "pointer": 2  // Should be incremented
 *   },
 *   "rewardMovie": { ... }
 * }
 */
