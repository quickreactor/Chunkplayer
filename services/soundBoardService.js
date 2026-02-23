// ====================
// SOUND BOARD SERVICE
// ====================

/**
 * Manages the interactive soundboard with tabbed sound sets
 */
class SoundBoardService {
    /**
     * @param {Object} urls - URLs object containing sound collections
     */
    constructor(urls) {
        this.urls = urls;
    }

    /**
     * Initialize soundboard UI
     */
    init() {
        const soundSets = this.urls.randomSoundsCollection;
        const grid = document.querySelector('.grid');
        const tabsContainer = document.querySelector('.tabs');
        let currentTab = 0;

        const renderTabs = () => {
            tabsContainer.innerHTML = '';
            soundSets.forEach((_, index) => {
                const tab = document.createElement('div');
                tab.className = 'tab' + (index === 0 ? ' active' : '');
                tab.dataset.tab = index;
                tab.textContent = `Set ${index + 1}`;
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    currentTab = index;
                    renderGrid();
                });
                tabsContainer.appendChild(tab);
            });
        };

        const renderGrid = () => {
            grid.innerHTML = '';
            const set = soundSets[currentTab];
            set.forEach((sound, i) => {
                const btn = document.createElement('button');
                btn.innerHTML = `${i + 1}<br>${sound.split("/").pop().split(".")[0].replace(/^\d+\s*-\s*/, "")}`;
                btn.addEventListener('click', () => {
                    const audio = new Audio(sound);
                    audio.play();
                });
                grid.appendChild(btn);
            });
        };

        renderTabs();
        renderGrid();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoundBoardService };
}
