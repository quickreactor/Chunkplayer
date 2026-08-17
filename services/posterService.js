// ====================
// POSTER SERVICE
// ====================

/**
 * Starts poster downloads as soon as daily data is available and keeps decoded
 * image objects alive for the lifetime of the page.
 */
class PosterService {
    constructor() {
        this.preloadedPosters = new Map();
    }

    /**
     * Fetch and decode a poster without blocking the rest of the application.
     * Repeated calls for the same URL share the existing work.
     */
    preload(url, priority = 'auto') {
        if (!url) return Promise.resolve(false);

        const existing = this.preloadedPosters.get(url);
        if (existing) return existing.ready;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.decoding = 'async';
        image.fetchPriority = priority;

        const ready = new Promise(resolve => {
            image.addEventListener('load', async () => {
                try {
                    if (typeof image.decode === 'function') await image.decode();
                } catch {
                    // A successful load is still usable if explicit decoding fails.
                }
                resolve(true);
            }, { once: true });

            image.addEventListener('error', () => {
                console.warn(`Poster failed to preload: ${url}`);
                resolve(false);
            }, { once: true });

            image.src = url;
        });

        this.preloadedPosters.set(url, { image, ready });
        return ready;
    }

    /**
     * Assign a poster while ensuring the same URL is also retained and decoded.
     */
    setSource(element, url, priority = 'auto') {
        if (!element || !url) return;

        this.preload(url, priority);
        element.crossOrigin = 'anonymous';
        element.decoding = 'async';
        element.fetchPriority = priority;

        const absoluteUrl = new URL(url, document.baseURI).href;
        if (element.src !== absoluteUrl) element.src = url;
    }

    /**
     * Populate both current and future poster elements immediately after the
     * daily-data response, before either screen becomes visible.
     */
    prepareDailyPosters(movieData, elements) {
        if (!movieData || !elements) return;

        const normalMovie = movieData.normalMovie;
        const punishmentMovie = movieData.punishmentMovie;
        const targetMovie = movieData.morbed ? punishmentMovie : normalMovie;
        const questionPoster = 'images/question.jpg';
        const targetPoster = Number(targetMovie?.pointer) === 1
            ? questionPoster
            : targetMovie?.posterUrl;

        if (movieData.isCoinFlip && movieData.coinFlip) {
            this.setSource(elements.poster1, movieData.coinFlip.movie1?.posterUrl, 'high');
            this.setSource(elements.poster2, movieData.coinFlip.movie2?.posterUrl, 'high');
        } else {
            this.setSource(elements.poster1, targetPoster, 'high');
            this.setSource(elements.poster2, punishmentMovie?.posterUrl, 'high');
        }

        this.setSource(elements.todaysPoster, targetPoster, 'high');

        // Warm alternate outcomes too; the roll animation gives these time to decode.
        [
            questionPoster,
            normalMovie?.posterUrl,
            punishmentMovie?.posterUrl,
            movieData.coinFlip?.movie1?.posterUrl,
            movieData.coinFlip?.movie2?.posterUrl
        ].filter(Boolean).forEach(url => this.preload(url));
    }
}
