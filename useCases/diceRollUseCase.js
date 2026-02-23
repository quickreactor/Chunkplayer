// ====================
// DICE ROLL USE CASE
// ====================

/**
 * Handles the dice roll interaction and outcome routing
 */
class DiceRollUseCase {
    /**
     * @param {DOMService} domService - DOM service instance
     * @param {VideoService} videoService - Video service instance
     * @param {AudioService} audioService - Audio service instance
     * @param {EffectService} effectService - Effect service instance
     * @param {VideoPlaybackUseCase} videoPlaybackUseCase - Video playback use case
     * @param {VisitRepository} visitRepository - Visit repository
     */
    constructor(domService, videoService, audioService, effectService, videoPlaybackUseCase, visitRepository) {
        this.dom = domService;
        this.video = videoService;
        this.audio = audioService;
        this.effect = effectService;
        this.videoPlayback = videoPlaybackUseCase;
        this.visitRepo = visitRepository;
    }

    /**
     * Execute the dice roll flow
     * @param {Object} movieData - Movie data from API
     * @param {Date} currentDate - Current date for special day checks
     * @param {number|null} debugForceRoll - Optional debug roll override
     * @returns {Promise<void>}
     */
    async execute(movieData, currentDate, debugForceRoll = null) {
        // Setup dice video playing event
        this.dom.elements.d20RollerVideo.addEventListener("playing", () => {
            this.audio.playDiceSound();
        });

        this.dom.addClass('rollButton', 'rolled');

        // Get effective roll (accounting for debug and special days)
        const roll = DiceRollLogic.getEffectiveRoll(
            movieData.roll,
            currentDate,
            debugForceRoll
        );

        console.log(`Daily roll is: ${roll}`);

        // Play dice video
        await this.video.playDiceVideo(roll);

        // Register visit
        this.visitRepo.registerVisit();

        // Route based on outcome
        const outcome = DiceRollLogic.determineOutcome(roll);

        switch (outcome) {
            case RollOutcome.CRITICAL_FAIL:
                await this.handleCriticalFail(movieData);
                break;

            case RollOutcome.CRITICAL_SUCCESS:
                await this.handleCriticalSuccess(movieData);
                break;

            case RollOutcome.NORMAL:
                await this.handleNormalRoll(movieData);
                break;
        }
    }

    /**
     * Handle critical failure (roll of 1) - morb
     * @param {Object} movieData - Movie data
     * @returns {Promise<void>}
     */
    async handleCriticalFail(movieData) {
        await this.effect.movieWinnerLoser(
            this.dom.elements.poster2,
            this.dom.elements.poster1,
            this.dom.elements.rollButton
        );
        setTimeout(() => {
            this.videoPlayback.playPunishmentChunk(movieData.punishmentMovie, true);
        }, 4000);
    }

    /**
     * Handle critical success (roll of 20) - Dark Realm
     * @param {Object} movieData - Movie data
     * @returns {Promise<void>}
     */
    async handleCriticalSuccess(movieData) {
        await this.effect.movieWinnerLoser(
            this.dom.elements.poster1,
            this.dom.elements.poster2,
            this.dom.elements.rollButton
        );

        // Trigger the special sequence
        const normalMovie = movieData.morbed ? movieData.punishmentMovie : movieData.normalMovie;
        this.videoPlayback.playCriticalSuccessSequence(
            movieData.rewardMovie,
            normalMovie,
            normalMovie.chunks,
            normalMovie.titles,
            true
        );
    }

    /**
     * Handle normal roll (2-19)
     * @param {Object} movieData - Movie data
     * @returns {Promise<void>}
     */
    async handleNormalRoll(movieData) {
        const targetMovie = movieData.morbed ? movieData.punishmentMovie : movieData.normalMovie;

        await this.effect.movieWinnerLoser(
            this.dom.elements.poster1,
            this.dom.elements.poster2,
            this.dom.elements.rollButton
        );

        this.videoPlayback.playNormalChunk(
            targetMovie,
            targetMovie.chunks,
            targetMovie.titles,
            true
        );
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DiceRollUseCase };
}
