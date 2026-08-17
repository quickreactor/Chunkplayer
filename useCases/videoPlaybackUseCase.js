// ====================
// VIDEO PLAYBACK USE CASE
// ====================

/**
 * Handles video playback for all scenarios:
 * - Normal chunk playback
 * - Punishment (morb) chunk playback
 * - Critical success reward sequence
 */
class VideoPlaybackUseCase {
    /**
     * @param {DOMService} domService - DOM service instance
     * @param {VideoService} videoService - Video service instance
     * @param {AudioService} audioService - Audio service instance
     * @param {SoundBoardService} soundBoardService - Soundboard service instance
     * @param {PosterService} posterService - Poster preload and assignment service
     * @param {Function} onShowAdmin - Callback to show admin section
     */
    constructor(domService, videoService, audioService, soundBoardService, posterService, onShowAdmin = null) {
        this.dom = domService;
        this.video = videoService;
        this.audio = audioService;
        this.soundBoard = soundBoardService;
        this.posters = posterService;
        this.onShowAdmin = onShowAdmin;
    }

    /**
     * Play normal movie chunk
     * @param {Object} movie - Movie object with chunks, titles, poster, etc.
     * @param {Array} chunkArray - Array of chunk URLs
     * @param {Array} titleArray - Array of chunk titles
     * @param {boolean} isFirst - Is this the first video after roll
     */
    async playNormalChunk(movie, chunkArray, titleArray, isFirst = false) {
        console.log("Playing normal chunk");

        this.dom.show('videoContainer');
        this.dom.hide('timerContainer');
        this.dom.hide('sundayDiv');

        const calculatedChunkNumber = movie.pointer;
        const videoNumberIndex = calculatedChunkNumber - 1;

        this.dom.elements.videoPlayer.src = chunkArray[videoNumberIndex];
        this.dom.show('container');

        this.dom.setText('dayCountDisplay', `/ ${chunkArray.length}`);
        this.dom.setText('epTitle', titleArray[videoNumberIndex] || titleArray[0]);

        const posterSrc = calculatedChunkNumber == 1 ? "images/question.jpg" : movie.posterUrl;
        this.posters.setSource(this.dom.elements.todaysPoster, posterSrc, 'high');
        this.dom.changeFavicon(movie.faviconUrl);
        document.title = `${DateHelpers.toSentenceCase(movie.name)} Chunk Player`;

        this.video.setupChunkSelector(calculatedChunkNumber, chunkArray, titleArray);

        console.log(`Chunk number: ${calculatedChunkNumber}`);

        if (isFirst) {
            requestAnimationFrame(() => {
                void this.dom.elements.container.offsetWidth;
                this.dom.removeClass('container', 'hidden');
            });
        } else {
            this.dom.removeClass('container', 'hidden');
        }
        // Always show admin section when entering video playback
        if (this.onShowAdmin) this.onShowAdmin();

        this.soundBoard.init();
    }

    /**
     * Play punishment (morb) chunk
     * @param {Object} punishmentMovie - Punishment movie object
     * @param {boolean} isFirst - Is this the first video after roll
     */
    async playPunishmentChunk(punishmentMovie, isFirst = false) {
        document.title = `${punishmentMovie.name} Chunk Player`;
        this.dom.changeFavicon(punishmentMovie.faviconUrl);

        let currentMorbCount = punishmentMovie.pointer;
        this.dom.elements.videoPlayer.src = punishmentMovie.chunks[currentMorbCount - 1];
        this.dom.updateTheme(punishmentMovie.bgColor);
        this.dom.show('container');

        if (isFirst) {
            requestAnimationFrame(() => {
                this.dom.addClass('container', 'unhidden');
            });
        } else {
            this.dom.removeClass('container', 'hidden');
        }
        // Always show admin section when entering video playback
        if (this.onShowAdmin) this.onShowAdmin();

        this.dom.setText('dayCountDisplay', `/ ${punishmentMovie.chunks.length}`);
        this.dom.setText('epTitle', (punishmentMovie.titles[punishmentMovie.pointer - 1] || punishmentMovie.titles[0]));
        this.dom.setText('numberDisplay', currentMorbCount);
        this.posters.setSource(this.dom.elements.todaysPoster, punishmentMovie.posterUrl, 'high');
        this.dom.elements.chunkSelector.style.pointerEvents = "none";

        this.audio.playMorbiusSound();
    }

    /**
     * Play critical success reward sequence.
     * Reward chunks are stored in one array and consumed in consecutive pairs:
     * chunk 1 before the normal chunk, chunk 2 after it; then 3 and 4, etc.
     * The reward pointer is 1-based and always identifies the intro chunk.
     *
     * Sequence: Reward intro → Normal Chunk → Reward outro
     * @param {Object} rewardMovie - Reward movie with a chunks array
     * @param {Object} normalMovie - Normal movie for the middle chunk
     * @param {Array} chunkArray - Normal movie chunk URLs
     * @param {Array} titleArray - Normal movie chunk titles
     * @param {boolean} isFirst - Is this the first video after roll
     */
    async playCriticalSuccessSequence(rewardMovie, normalMovie, chunkArray, titleArray, isFirst = false) {
        console.log("CRITICAL SUCCESS! Playing reward sequence...");

        const playerElement = this.dom.elements.videoPlayer;
        const rewardMoviePointer = Number(rewardMovie.pointer) || 1;
        const rewardTitle = rewardMovie.title || 'Critical success reward';
        const introClip = rewardMovie.chunks?.[rewardMoviePointer - 1];
        const outroClip = rewardMovie.chunks?.[rewardMoviePointer];

        if (!introClip || !outroClip) {
            console.error("Reward collection does not contain a complete clip pair", {
                rewardMovie: rewardMovie.name,
                pointer: rewardMoviePointer
            });
            return;
        }

        // --- Phase 1: Play reward intro ---
        playerElement.src = introClip;

        this.dom.setText('epTitle', rewardTitle);
        this.dom.show('container');

        // Handle container visibility/fade-in
        if (isFirst) {
            requestAnimationFrame(() => {
                this.dom.addClass('container', 'unhidden');
            });
        } else {
            this.dom.removeClass('container', 'hidden');
        }
        // Always show admin section when entering video playback
        if (this.onShowAdmin) this.onShowAdmin();

        // Listener 1: When reward intro ends → Load normal chunk
        const handleIntroEnd = () => {
            console.log("Reward intro ended. Loading normal chunk...");

            // Load the standard daily video
            this.playNormalChunk(normalMovie, chunkArray, titleArray, false);

            // --- Phase 2: Play Normal Daily Chunk ---

            // Listener 2: When normal chunk ends → Load reward outro
            const handleNormalEnd = () => {
                console.log("Normal chunk ended. Loading reward outro...");

                // Load the matching reward outro chunk
                playerElement.src = outroClip;
                this.dom.setText('epTitle', `${rewardTitle} complete`);

                // Start Outro playback
                playerElement.play();
            };

            // Attach the Outro listener (runs only once)
            playerElement.addEventListener("ended", handleNormalEnd, { once: true });

            // Auto-play the normal video
            playerElement.play();
        };

        // Attach the Intro listener (runs only once)
        playerElement.addEventListener("ended", handleIntroEnd, { once: true });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VideoPlaybackUseCase };
}
