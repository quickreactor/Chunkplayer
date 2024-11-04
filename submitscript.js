if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    const recordBtn = document.getElementById('recordBtn');
    const playbackBtn = document.getElementById('playbackBtn');
    const waveformCanvas = document.getElementById('waveform');
    const canvasCtx = waveformCanvas.getContext('2d');
    let audioContext, analyser, sourceNode, animationFrameId;
  
    // Function to draw waveform
    function drawWaveform() {
      if (!analyser) return; // Ensure analyser exists
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);
  
      // Clear the canvas
      canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  
      // Set up drawing styles
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#4F46E5';
      canvasCtx.beginPath();
  
      const sliceWidth = waveformCanvas.width / bufferLength;
      let x = 0;
  
      dataArray.forEach((value, i) => {
        const v = value / 128.0;
        const y = (v * waveformCanvas.height) / 2;
  
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
  
        x += sliceWidth;
      });
  
      canvasCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
      canvasCtx.stroke();
  
      // Call drawWaveform repeatedly
      animationFrameId = requestAnimationFrame(drawWaveform);
    }
  
    // Start recording audio
    recordBtn.addEventListener('click', () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          audioContext = new AudioContext();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 2048;
  
          sourceNode = audioContext.createMediaStreamSource(stream);
          sourceNode.connect(analyser);
  
          // Start drawing the waveform
          drawWaveform();
  
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.start();
          audioChunks = [];
  
          mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
          mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            playbackBtn.disabled = false;
  
            // Stop and disconnect the audio context
            cancelAnimationFrame(animationFrameId);
            sourceNode.disconnect();
            audioContext.close();
          };
        }).catch(error => {
          console.error('Error accessing the microphone:', error);
          alert('Microphone access is required to record audio.');
        });
      } else {
        mediaRecorder.stop();
      }
    });
  
    // Playback the recorded audio
    playbackBtn.addEventListener('click', () => {
      const audioURL = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioURL);
  
      // Create a new audio context and analyser for playback
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
  
      const audioSource = audioContext.createMediaElementSource(audio);
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);
  
      // Draw waveform during playback
      drawWaveform();
  
      audio.play();
      audio.onended = () => {
        cancelAnimationFrame(animationFrameId);
        audioSource.disconnect();
        analyser.disconnect();
        audioContext.close();
      };
    });
  }
  