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
            winner.classList.add("winner");
            const posterComputed = getComputedStyle(winner);
            const posterMargin = parseFloat(posterComputed.marginLeft);
            const posterWidth = winner.getBoundingClientRect().width;
            const rollButtonWidth = rollButton.getBoundingClientRect().width;
            const movementDistance = posterWidth / 2 + posterMargin + rollButtonWidth / 2;

            if (winner.id === "poster-image-1") {
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EffectService };
}
