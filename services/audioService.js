// ====================
// AUDIO SERVICE
// ====================

/**
 * Handles audio playback and sound effects
 */
class AudioService {
    constructor() {
        this.urls = {};
        this.sounds = [];
        this.jokerImpactAudio = typeof Audio !== 'undefined'
            ? new Audio('audio/pah2.wav')
            : null;
        this.activeJokerImpactAudio = new Set();

        if (this.jokerImpactAudio) {
            this.jokerImpactAudio.preload = 'auto';
        }
    }

    /**
     * Set URLs configuration
     * @param {Object} urls - URLs object containing sound collections
     */
    setUrls(urls) {
        this.urls = urls;
    }

    /**
     * Set sounds collection
     * @param {Array} sounds - Array of sound URLs
     */
    setSounds(sounds) {
        this.sounds = sounds;
    }

    /**
     * Play dice roll sound
     */
    playDiceSound() {
        const diceSounds = [
            "audio/dice-roll01.mp3",
            "audio/dice-roll02.mp3",
            "audio/dice-roll03.mp3"
        ];
        const randomIndex = Math.floor(Math.random() * diceSounds.length);
        const audio = document.getElementById("diceAudio");
        audio.src = diceSounds[randomIndex];
        audio.play();
        console.log(`Playing dice roll sound ${randomIndex + 1}`);
    }

    /**
     * Play random sound based on dice roll number
     * @param {number} num - Dice roll number (1-20)
     */
    playRandomSound(num) {
        const audioElement = document.getElementById("randomAudio");
        const randomArrNumber = DateHelpers.getDateBasedRandomIndex(this.urls.randomSoundsCollection.length);
        const sounds = this.urls.randomSoundsCollection[randomArrNumber];

        console.log(`Random sound - Group ${randomArrNumber}, Sound ${num}, File - ${sounds[num - 1]}`);

        // Reward collections can optionally provide their own critical-success sound.
        if (num === 20 && CONFIG.movieData?.rewardMovie?.sound) {
            audioElement.src = CONFIG.movieData.rewardMovie.sound;
        } else {
            audioElement.src = sounds[num - 1];
        }
        audioElement.play();

        if (num === 20) {
            this.showSonic();
        }
    }

    /**
     * Show sonic animation
     */
    showSonic() {
        const sonic = document.querySelector("#sonic");
        if (!sonic) return;

        // Restart cleanly when the effect is triggered repeatedly from Debug.
        sonic.classList.remove("animate");
        void sonic.offsetWidth;
        sonic.style.display = "block";
        sonic.classList.add("animate");

        sonic.addEventListener("animationend", () => {
            sonic.style.display = "none";
            sonic.classList.remove("animate");
        }, { once: true });
    }

    /**
     * Play morbius punishment sound
     */
    playMorbiusSound() {
        const audio = document.getElementById("morbius-sound");
        if (CONFIG.movieData && CONFIG.movieData.punishmentMovie) {
            const configuredSound = CONFIG.movieData.punishmentMovie.sound;
            audio.src = configuredSound === 'audio/joker.mp3' ? 'audio/kevin.mp3' : configuredSound;
            audio.play();
        }
    }

    /**
     * Play the Joker landing sound. Each impact gets its own audio element so
     * closely spaced landings can overlap without restarting an earlier sound.
     */
    playJokerImpactSound() {
        if (!this.jokerImpactAudio) return;

        const audio = this.jokerImpactAudio.cloneNode(true);
        audio.volume = 0.3;
        const cleanup = () => this.activeJokerImpactAudio.delete(audio);
        this.activeJokerImpactAudio.add(audio);
        audio.addEventListener('ended', cleanup, { once: true });
        audio.addEventListener('error', cleanup, { once: true });

        const playback = audio.play();
        if (playback && typeof playback.catch === 'function') {
            playback.catch(cleanup);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioService };
}
