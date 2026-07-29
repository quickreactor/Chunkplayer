// ====================
// VIDEO SERVICE
// ====================

/**
 * Handles video playback and chunk selection
 */
class VideoService {
    /**
     * @param {DOMService} domService - DOM service instance
     * @param {AudioService} audioService - Audio service instance
     */
    constructor(domService, audioService) {
        this.dom = domService;
        this.audio = audioService;
        this.urls = {};
    }

    /**
     * Set URLs configuration
     * @param {Object} urls - URLs object
     */
    setUrls(urls) {
        this.urls = urls;
        this.coinFlipVideoHEVC = urls.coinFlipHEVC || null;
        this.coinFlipVideoWebM = urls.coinFlipWebM || null;
    }

    /**
     * Populate only the source formats supported by the current browser.
     * Unsupported and placeholder sources are left unset to avoid media errors.
     */
    setCompatibleVideoSources(hevcUrl, webmUrl) {
        const video = this.dom.elements.d20RollerVideo;
        video.querySelectorAll("source").forEach(source => source.remove());

        const addSource = (id, url, type) => {
            if (!url) return;
            const source = document.createElement("source");
            source.id = id;
            source.src = url;
            source.type = type;
            video.appendChild(source);
        };

        const supportsHevc = hevcUrl && video.canPlayType('video/mp4; codecs="hvc1"');
        if (supportsHevc) {
            addSource("diceSource1", hevcUrl, 'video/mp4; codecs="hvc1"');
        }
        addSource("diceSource2", webmUrl, "video/webm");
    }

    /**
     * Play dice roll video
     * @param {number} number - Dice roll result (1-20)
     * @returns {Promise} Resolves when video ends
     */
    async playDiceVideo(number) {
        return new Promise((resolve) => {
            const video = this.dom.elements.d20RollerVideo;
            this.setCompatibleVideoSources(
                this.urls.d20HEVCArray[number - 1],
                this.urls.d20webmArray[number - 1]
            );
            video.style.display = "block";
            video.load();

            const handleEnd = () => {
                this.audio.playRandomSound(number);

                setTimeout(() => video.classList.add("hidden"), 2000);
                setTimeout(() => {
                    video.style.display = "none";
                    video.classList.remove("hidden");
                }, 4000);

                video.removeEventListener("ended", handleEnd);
                resolve();
            };

            video.addEventListener("ended", handleEnd);
        });
    }

    /**
     * Play coin flip video
     * @param {number} winnerIndex - Winning movie index (0 or 1)
     * @returns {Promise} Resolves when video ends
     */
    async playCoinFlipVideo(winnerIndex) {
        return new Promise((resolve) => {
            const video = this.dom.elements.d20RollerVideo;

            // Set video sources (coin flip video)
            this.setCompatibleVideoSources(this.coinFlipVideoHEVC, this.coinFlipVideoWebM);

            video.style.display = "block";
            video.load();

            const handleEnd = () => {
                setTimeout(() => video.classList.add("hidden"), 2000);
                setTimeout(() => {
                    video.style.display = "none";
                    video.classList.remove("hidden");
                }, 4000);

                video.removeEventListener("ended", handleEnd);
                resolve();
            };

            video.addEventListener("ended", handleEnd);
            video.play();
        });
    }

    /**
     * Setup chunk selector dropdown
     * @param {number} calculatedChunkNumber - Current chunk number
     * @param {Array} chunkArray - Array of chunk URLs
     * @param {Array} titleArray - Array of chunk titles
     */
    setupChunkSelector(calculatedChunkNumber, chunkArray, titleArray) {
        const selector = this.dom.elements.chunkSelector;
        const maxChunk = calculatedChunkNumber;

        selector.innerHTML = '';

        for (let i = 0; i < maxChunk; i++) {
            const option = document.createElement("option");
            option.value = i + 1;
            option.dataset.display = i + 1;
            option.dataset.descr = titleArray[i];
            option.textContent = `${i + 1}: ${titleArray[i]}`;
            selector.prepend(option);
        }

        selector.value = maxChunk;
        this.dom.setText('numberDisplay', maxChunk);

        this.setupSelectorEvents(selector, chunkArray, titleArray);
    }

    /**
     * Setup chunk selector event listeners
     * @param {HTMLElement} selector - Select element
     * @param {Array} chunkArray - Array of chunk URLs
     * @param {Array} titleArray - Array of chunk titles
     */
    setupSelectorEvents(selector, chunkArray, titleArray) {
        selector.addEventListener("change", (e) => {
            const selectedValue = parseInt(e.target.value);
            const selectedIndex = selectedValue - 1;

            this.dom.elements.videoPlayer.src = chunkArray[selectedIndex];
            this.dom.setText('epTitle', (titleArray[selectedIndex] || titleArray[0]));
            this.dom.setText('numberDisplay', selectedValue);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VideoService };
}
