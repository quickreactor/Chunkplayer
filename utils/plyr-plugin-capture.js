(function init(document) {
  function downloadScreenshot(blob, filename) {
    const blobUrl = URL.createObjectURL(blob);
    const saveLink = document.createElement('a');
    saveLink.href = blobUrl;
    saveLink.download = filename;
    document.body.appendChild(saveLink);
    saveLink.click();
    document.body.removeChild(saveLink);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/png' });
  }

  function getFilename() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const movieName = (CONFIG.movieData &&
      (CONFIG.movieData.morbed
        ? CONFIG.movieData.punishmentMovie
        : CONFIG.movieData.normalMovie
      ).name) || 'capture';
    return `${movieName} ${timestamp}.png`;
  }

  function isCanvasBlack(ctx, width, height) {
    const sampleX = Math.floor(width * 0.25);
    const sampleY = Math.floor(height * 0.25);
    const sampleW = Math.floor(width * 0.5);
    const sampleH = Math.floor(height * 0.5);
    const data = ctx.getImageData(sampleX, sampleY, sampleW, sampleH).data;
    let blackPixels = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
        blackPixels++;
      }
    }
    return blackPixels / (data.length / 16) > 0.99;
  }

  function capturePosterFallback(video, canvas, ctx, width, height) {
    const posterUrl = video.poster || video.getAttribute('poster') || video.getAttribute('data-poster');
    if (posterUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = posterUrl;
      });
    }
    return null;
  }

  // Async fallback for Firefox mobile hardware-decoded black frames
  async function captureBlackFrameFix(video) {
    const width = video.videoWidth;
    const height = video.videoHeight;
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    const wasPlaying = !video.paused;

    // Attempt 1: captureStream + ImageCapture — best Firefox support for HW frames
    try {
      const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
      const track = stream.getVideoTracks()[0];
      if (track && typeof ImageCapture !== 'undefined') {
        const imageCapture = new ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        track.stop();
        if (!isCanvasBlack(ctx, width, height)) {
          if (wasPlaying) video.play().catch(() => {});
          return canvas.toDataURL('image/png');
        }
      }
    } catch (e) { /* ImageCapture not available */ }

    // Attempt 2: Pause + willReadFrequently + delay (recommended for Firefox Android)
    video.pause();
    await new Promise(r => setTimeout(r, 150));
    const ctx2 = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
    ctx2.drawImage(video, 0, 0, width, height);
    if (!isCanvasBlack(ctx2, width, height)) {
      if (wasPlaying) video.play().catch(() => {});
      return canvas.toDataURL('image/png');
    }

    // Attempt 3: Seek away then back to force re-decode
    const originalTime = video.currentTime;
    const seekAway = Math.max(0, originalTime - 1);
    await new Promise(r => {
      const t = setTimeout(r, 2000);
      video.addEventListener('seeked', () => { clearTimeout(t); r(); }, { once: true });
      video.currentTime = seekAway;
    });
    await new Promise(r => requestAnimationFrame(r));

    await new Promise(r => {
      const t = setTimeout(r, 2000);
      video.addEventListener('seeked', () => { clearTimeout(t); r(); }, { once: true });
      video.currentTime = originalTime;
    });
    await new Promise(r => requestAnimationFrame(r));

    ctx2.clearRect(0, 0, width, height);
    ctx2.drawImage(video, 0, 0, width, height);

    if (wasPlaying) video.play().catch(() => {});

    if (!isCanvasBlack(ctx2, width, height)) {
      return canvas.toDataURL('image/png');
    }

    // Poster fallback
    const posterResult = await capturePosterFallback(video, canvas, ctx2, width, height);
    return posterResult || canvas.toDataURL('image/png');
  }

  function showCopiedToast() {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    toastMessage.textContent = 'Screenshot copied to clipboard';
    toast.className = 'toast success';
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 2000);
  }

  document.addEventListener('ready', (event) => {
    const curPlayer = event.detail.plyr;
    const { config } = curPlayer;
    if (Array.isArray(config.controls) && config.controls.includes('capture')) {
      const captureLabel = config.i18n.capture || 'Capture';

      const menu = document.querySelector('.plyr__control[data-plyr="fullscreen"]');
      const btn = `
            <button class="plyr__controls__item plyr__control" type="button" data-plyr="capture">
                <svg role="presentation" focusable="false">
                    <path d="M9.098,7.566c0.758,0,1.408,0.27,1.946,0.809c0.539,0.538,0.809,1.188,0.809,1.946c0,0.758-0.27,1.406-0.809,1.946
                    c-0.538,0.539-1.188,0.81-1.946,0.81c-0.759,0-1.408-0.271-1.947-0.81c-0.539-0.54-0.808-1.188-0.808-1.946
                    c0-0.759,0.27-1.408,0.808-1.946C7.689,7.835,8.339,7.566,9.098,7.566z M14.862,3.471c0.59,0,1.093,0.241,1.511,0.723
                    C16.79,4.676,17,5.258,17,5.939v8.646c0,0.682-0.21,1.264-0.627,1.747c-0.418,0.481-0.921,0.724-1.511,0.724H3.107
                    c-0.59,0-1.095-0.242-1.511-0.724c-0.417-0.483-0.627-1.065-0.627-1.747V5.939c0-0.682,0.21-1.264,0.627-1.746
                    c0.417-0.482,0.921-0.723,1.511-0.723h1.87l0.426-1.313c0.105-0.315,0.299-0.587,0.58-0.815C6.264,1.114,6.552,1,6.846,1h4.274
                    c0.297,0,0.584,0.114,0.866,0.342c0.28,0.228,0.475,0.5,0.58,0.815l0.424,1.313H14.862L14.862,3.471z M9.098,14.606
                    c1.179,0,2.188-0.419,3.026-1.258c0.84-0.839,1.258-1.847,1.258-3.027c0-1.18-0.418-2.188-1.258-3.027
                    c-0.839-0.839-1.848-1.259-3.026-1.259c-1.18,0-2.189,0.42-3.028,1.259c-0.838,0.839-1.258,1.847-1.258,3.027
                    c0,1.181,0.42,2.188,1.258,3.027C6.909,14.188,7.917,14.606,9.098,14.606z"/>
                </svg>
                <span class="plyr__sr-only">${captureLabel}</span>
            </button>
            `;
      menu.insertAdjacentHTML('beforebegin', btn);
      const btnElement = document.querySelector('button[data-plyr="capture"]');
      btnElement.addEventListener('click', () => {
        // Synchronous capture
        const video = curPlayer.media;
        const width = video.videoWidth;
        const height = video.videoHeight;
        const canvas = Object.assign(document.createElement('canvas'), { width, height });
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');

        // If black frame (Firefox mobile HW decode), fix asynchronously then download
        if (width && height && isCanvasBlack(ctx, width, height)) {
          captureBlackFrameFix(video).then(fixedDataUrl => {
            downloadScreenshot(dataURLtoBlob(fixedDataUrl), getFilename());
          });
          return;
        }

        // Normal path — clipboard/share logic, fully synchronous
        const filename = getFilename();
        const blob = dataURLtoBlob(dataUrl);
        const file = new File([blob], filename, { type: 'image/png' });

        function tryDownload() {
          console.log('[Capture] Using file download');
          downloadScreenshot(blob, filename);
        }

        function tryClipboard() {
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            console.log('[Capture] Using Clipboard API');
            navigator.clipboard.write([item]).then(() => {
              showCopiedToast();
            }).catch((err) => {
              console.log('[Capture] Clipboard write failed:', err.message);
              tryDownload();
            });
          } catch (err) {
            console.log('[Capture] ClipboardItem not available:', err.message);
            tryDownload();
          }
        }

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          console.log('[Capture] Using Web Share API');
          navigator.share({ files: [file] }).catch(() => {
            console.log('[Capture] Share cancelled, trying clipboard');
            tryClipboard();
          });
        } else {
          tryClipboard();
        }
      });
    }
  });
}(document));
