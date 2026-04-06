// ====================
// EFFECT SERVICE
// ====================

/**
 * Handles visual effects and animations
 */
class EffectService {
    /**
     * Animate movie winner/loser poster selection
     * @param {HTMLElement} winner - Winning poster element
     * @param {HTMLElement} loser - Losing poster element
     * @param {HTMLElement} rollButton - Roll button element
     * @returns {Promise} Resolves when animation completes
     */
    async movieWinnerLoser(winner, loser, rollButton) {
        return new Promise((resolve) => {
            const posterComputed = getComputedStyle(winner);
            const posterMargin = parseFloat(posterComputed.marginLeft);
            const posterWidth = winner.getBoundingClientRect().width;
            const rollButtonWidth = rollButton.getBoundingClientRect().width;
            const movementDistance = posterWidth / 2 + posterMargin + rollButtonWidth / 2;

            // Move the parent container so graffiti overlay moves with the poster
            const container = winner.parentElement;
            if (winner.id === "poster-image-1" && container) {
                container.classList.add("winner");
                container.style.transform = `translate(${movementDistance}px, 0)`;
            } else {
                winner.classList.add("winner");
                winner.style.transform = `translate(${movementDistance}px, 0)`;
            }

            loser.classList.add("hidden", "fade-out-fast");

            setTimeout(() => {
                document.querySelector(".poster-section").classList.add("hidden", "fade-out-slow");
            }, 2000);

            setTimeout(() => {
                document.querySelector(".poster-section").style.display = "none";
                requestAnimationFrame(() => resolve());
            }, 4000);
        });
    }

    /**
     * Initialize snow effect (particles.js)
     * @param {string} imageUrl - Image URL for particles (default: sonic-snow.gif)
     */
    letItSnowSonic(imageUrl = "./images/sonic-snow.gif") {
        // Check if already loaded
        if (document.getElementById('particles-js-script')) {
            return;
        }

        const script = document.createElement("script");
        script.id = 'particles-js-script';
        script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
        script.onload = () => {
            particlesJS("snow", {
                particles: {
                    number: { value: 100, density: { enable: true, value_area: 800 } },
                    shape: { type: "image", image: { src: imageUrl, width: 100, height: 100 } },
                    opacity: { value: 0.7, random: false, anim: { enable: false } },
                    size: { value: 20, random: true, anim: { enable: false } },
                    line_linked: { enable: false },
                    move: {
                        enable: true, speed: 5, direction: "bottom", random: true,
                        straight: false, out_mode: "out", bounce: false,
                        attract: { enable: true, rotateX: 300, rotateY: 1200 }
                    }
                },
                interactivity: {
                    events: { onhover: { enable: false }, onclick: { enable: false }, resize: false }
                },
                retina_detect: true
            });
        };
        document.head.append(script);
    }

    /**
     * Trigger Happy Rensday effect (Jeremy Renner walking + confetti + text)
     * @param {number} duration - Duration in milliseconds (default: 8000ms to match GIF animation)
     */
    triggerRensday(duration = 8000) {
        console.log('🎉 Triggering Rensday effect!');

        // Play sound after 1 second delay
        setTimeout(() => {
            const audio = document.getElementById('renner-audio');
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(e => console.warn('Could not play Renner audio:', e));
            }
        }, 1000);

        // Show Renner GIF
        const renner = document.getElementById('renner');
        if (renner) {
            renner.style.display = 'block';
            renner.classList.add('animate');
        }

        // Show "HAPPY RENSDAY" text
        const rensdayText = document.getElementById('rensday-text');
        if (rensdayText) {
            rensdayText.style.display = 'block';
        }

        // Start confetti
        this.startConfetti(duration);

        // Clean up after duration
        setTimeout(() => {
            if (renner) {
                renner.style.display = 'none';
                renner.classList.remove('animate');
            }
            if (rensdayText) {
                rensdayText.style.display = 'none';
            }
            this.stopConfetti();
            console.log('🎉 Rensday effect ended');
        }, duration);
    }

    /**
     * Start confetti animation
     * @param {number} duration - How long to spawn confetti
     */
    startConfetti(duration) {
        const container = document.getElementById('confetti-container');
        if (!container) return;

        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1'];
        const confettiInterval = 50; // Spawn rate in ms

        this._confettiIntervalId = setInterval(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's'; // 2-4 seconds
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

            // Random shapes
            if (Math.random() > 0.5) {
                confetti.style.borderRadius = '50%';
            }

            container.appendChild(confetti);

            // Remove confetti after it falls
            setTimeout(() => {
                confetti.remove();
            }, 4000);
        }, confettiInterval);

        // Stop spawning after duration
        setTimeout(() => {
            this.stopConfetti();
        }, duration);
    }

    /**
     * Stop confetti animation
     */
    stopConfetti() {
        if (this._confettiIntervalId) {
            clearInterval(this._confettiIntervalId);
            this._confettiIntervalId = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EffectService };
}
