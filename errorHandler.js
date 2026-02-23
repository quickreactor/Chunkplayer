// ====================
// ERROR HANDLER
// ====================

/**
 * Centralized error handling for the application
 * Provides consistent error logging and user feedback
 */
class ErrorHandler {
    /**
     * Handle an error with context and optional recovery
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred (e.g., "API", "VideoPlayback")
     * @param {Object} options - Optional handling parameters
     * @param {boolean} options.showToUser - Whether to show error to user (default: true)
     * @param {boolean} options.throw - Whether to re-throw after handling (default: false)
     */
    static handle(error, context, options = {}) {
        const { showToUser = true, throw: shouldThrow = false } = options;

        // Log to console with context
        console.error(`[${context}]`, error);

        // Show user-friendly message if requested
        if (showToUser && typeof document !== 'undefined') {
            this.showUserError(error, context);
        }

        // Re-throw if requested
        if (shouldThrow) {
            throw error;
        }
    }

    /**
     * Display error message to user via DOM
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     */
    static showUserError(error, context) {
        const errorMessage = this.formatErrorMessage(error, context);

        // Remove existing error if present
        const existingError = document.getElementById('app-error-display');
        if (existingError) {
            existingError.remove();
        }

        // Create error display element
        const errorDiv = document.createElement('div');
        errorDiv.id = 'app-error-display';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #dc3545;
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            z-index: 9999;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
        `;
        errorDiv.innerHTML = `
            <strong style="font-size: 16px;">❌ Error</strong><br>
            ${errorMessage}
        `;
        document.body.appendChild(errorDiv);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }

    /**
     * Format error message for user display
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     * @returns {string} Formatted error message
     */
    static formatErrorMessage(error, context) {
        const errorType = error.name || 'Error';
        const errorMsg = error.message || 'An unknown error occurred';

        return `<strong>${context}</strong><br>${errorMsg}`;
    }

    /**
     * Wrap an async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {string} context - Context for error handling
     * @returns {Function} Wrapped function with error handling
     */
    static async wrap(fn, context) {
        try {
            return await fn();
        } catch (error) {
            this.handle(error, context);
            return null;
        }
    }

    /**
     * Create a safe version of a function that catches errors
     * @param {Function} fn - Function to make safe
     * @param {string} context - Context for error handling
     * @returns {Function} Safe function that never throws
     */
    static safe(fn, context) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handle(error, context, { throw: false });
                return null;
            }
        };
    }
}
