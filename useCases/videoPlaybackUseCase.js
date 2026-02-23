// ====================
// VIDEO PLAYBACK USE CASE
// ====================

/**
 * Handles video playback for all scenarios:
 * - Normal chunk playback
 * - Punishment (morb) chunk playback
 * - Critical success (Dark Realm) sequence
 */
class VideoPlaybackUseCase {
    /**
     * @param {DOMService} domService - DOM service instance
     * @param {VideoService} videoService - Video service instance
     * @param {AudioService} audioService - Audio service instance
     * @param {SoundBoardService} soundBoardService - Soundboard service instance
     * @param {Function} onShowAdmin - Callback to show admin section
     */
    constructor(domService, videoService, audioService, soundBoardService, onShowAdmin = null) {
        this.dom = domService;
        this.video = videoService;
        this.audio = audioService;
        this.soundBoard = soundBoardService;
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
        this.dom.elements.todaysPoster.src = posterSrc;
        this.dom.changeFavicon(movie.faviconUrl);
        document.title = `${DateHelpers.toSentenceCase(movie.name)} Chunk Player`;

        this.video.setupChunkSelector(calculatedChunkNumber, chunkArray, titleArray);

        console.log(`Chunk number: ${calculatedChunkNumber}`);

        if (isFirst) {
            requestAnimationFrame(() => {
                void this.dom.elements.container.offsetWidth;
                this.dom.removeClass('container', 'hidden');
                // Show admin section after roll
                if (this.onShowAdmin) this.onShowAdmin();
            });
        } else {
            this.dom.removeClass('container', 'hidden');
        }

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
                // Show admin section after roll
                if (this.onShowAdmin) this.onShowAdmin();
            });
        } else {
            this.dom.removeClass('container', 'hidden');
        }

        this.dom.setText('dayCountDisplay', `/ ${punishmentMovie.chunks.length}`);
        this.dom.setText('epTitle', (punishmentMovie.titles[punishmentMovie.pointer - 1] || punishmentMovie.titles[0]));
        this.dom.setText('numberDisplay', currentMorbCount);
        this.dom.elements.todaysPoster.src = `images/${punishmentMovie.name}.jpg`;
        this.dom.elements.chunkSelector.style.pointerEvents = "none";

        this.audio.playMorbiusSound();
    }

    /**
     * Play critical success (Dark Realm) sequence
     * Sequence: Dark Realm Intro → Normal Chunk → Dark Realm Outro
     * @param {Object} rewardMovie - Reward movie with preRoll and postRoll
     * @param {Object} normalMovie - Normal movie for the middle chunk
     * @param {Array} chunkArray - Normal movie chunk URLs
     * @param {Array} titleArray - Normal movie chunk titles
     * @param {boolean} isFirst - Is this the first video after roll
     */
    async playCriticalSuccessSequence(rewardMovie, normalMovie, chunkArray, titleArray, isFirst = false) {
        console.log("CRITICAL SUCCESS! Entering the Dark Realm...");

        const playerElement = this.dom.elements.videoPlayer;
        let rewardMoviePointer = rewardMovie.pointer;

        // --- Phase 1: Play Dark Realm Intro ---
        playerElement.src = rewardMovie.preRoll[rewardMoviePointer];

        this.dom.setText('epTitle', "You are now entering... the Dark Realm");
        this.dom.show('container');

        // Handle container visibility/fade-in
        if (isFirst) {
            requestAnimationFrame(() => {
                this.dom.addClass('container', 'unhidden');
                // Show admin section after roll
                if (this.onShowAdmin) this.onShowAdmin();
            });
        } else {
            this.dom.removeClass('container', 'hidden');
        }

        // Listener 1: When Dark Realm Intro ends → Load Normal Chunk
        const handleIntroEnd = () => {
            console.log("Dark Realm Intro ended. Loading normal chunk...");

            // Load the standard daily video
            this.playNormalChunk(normalMovie, chunkArray, titleArray, false);

            // --- Phase 2: Play Normal Daily Chunk ---

            // Listener 2: When Normal Chunk ends → Load Dark Realm Outro
            const handleNormalEnd = () => {
                console.log("Normal chunk ended. Loading Dark Realm Outro...");

                // Load the Dark Realm Outro chunk
                playerElement.src = rewardMovie.postRoll[rewardMoviePointer];
                this.dom.setText('epTitle', "Escaping the Dark Realm");

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
