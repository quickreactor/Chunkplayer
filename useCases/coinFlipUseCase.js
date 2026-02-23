// ====================
// COIN FLIP USE CASE
// ====================

/**
 * Handles the coin flip interaction for choosing between two candidate movies
 */
class CoinFlipUseCase {
    /**
     * @param {DOMService} domService - DOM service instance
     * @param {VideoService} videoService - Video service instance
     * @param {AudioService} audioService - Audio service instance
     * @param {EffectService} effectService - Effect service instance
     * @param {Object} visitRepository - Visit repository
     */
    constructor(domService, videoService, audioService, effectService, visitRepository) {
        this.dom = domService;
        this.video = videoService;
        this.audio = audioService;
        this.effect = effectService;
        this.visitRepo = visitRepository;
    }

    /**
     * Execute the coin flip flow
     * @param {Object} coinFlipData - Coin flip data from API
     * @returns {Promise<Object>} Winner movie object
     */
    async execute(coinFlipData) {
        const winnerIndex = coinFlipData.candidateIndex;
        const winner = winnerIndex === 0 ? coinFlipData.movie1 : coinFlipData.movie2;
        const loser = winnerIndex === 0 ? coinFlipData.movie2 : coinFlipData.movie1;

        console.log(`Coin flip: Movie ${winnerIndex + 1} wins!`);

        // Play coin flip video
        await this.video.playCoinFlipVideo(winnerIndex);

        // Register visit (prevents re-flip on refresh)
        this.visitRepo.registerVisit();

        // Animate winner/loser posters (same as roll)
        const winnerPoster = winnerIndex === 0 ? this.dom.elements.poster1 : this.dom.elements.poster2;
        const loserPoster = winnerIndex === 0 ? this.dom.elements.poster2 : this.dom.elements.poster1;

        await this.effect.movieWinnerLoser(
            winnerPoster,
            loserPoster,
            this.dom.elements.flipButton
        );

        // Return winner movie for continuation
        return winner;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CoinFlipUseCase };
}
