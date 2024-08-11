const dateInput = document.getElementById('dateInput');
const videoPlayer = document.getElementById('videoPlayer');
const d20RollerVideo = document.getElementById('d20RollerVideo')
const dayCountDisplay = document.getElementById('dayCount');
let container = document.querySelector(".container");
let videoContainer = document.querySelector(".videoContainer");
let timerContainer = document.querySelector(".timer-container");
let epTitle = document.querySelector(".ep-title");
epTitle.addEventListener('click', function () {
    diceVideo(Math.floor(Math.random() * 20 + 1));
});
const selector = document.getElementById('chunkSelector');
const numberDisplay = document.querySelector(".numberDisplay");
let morbCount = 0;
let robMorbCount = 2;

// Define a global variable to store the JSON data
let urls = {};

// Fetch the JSON data
fetch('urls.json')
    .then(response => response.json())
    .then(data => {
        // Store the data in the global variable
        urls = data;
    })
    .catch(error => console.error('Error loading JSON:', error));


function hideElement(el) {
    el.style.display = 'none';
}

function isTodaySunday() {
    const today = new Date();
    return today.getDay() === 0;
}

function isPastMidnight() {
    const now = new Date();
    const currentHour = now.getHours();

    // Check if the current hour is between 0 (midnight) and 8 (8 AM)
    return currentHour >= 0 && currentHour < 8;
}

async function updateVideo() {

    videoContainer.style.display = "flex";
    timerContainer.style.display = "none";
    epTitle.innerText = ``;
    // Set the default date to July 22, 2024 in NZ timezone
    const defaultDate = new Date('2024-07-22T00:00:00+12:00');
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));

    let daysPassed = 0;
    for (let d = new Date(defaultDate); d <= now; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) { // Skip Sundays (0 is Sunday in JavaScript)
            daysPassed++;
        }
    }

    const videoNumber = daysPassed.toString().padStart(2, '0');
    morbCount = await getMorbCount();
    videoPlayer.src = urls.chunkArray[videoNumber - 1 - morbCount];
    dayCountDisplay.textContent = `/ ${urls.chunkArray.length}`;
    epTitle.innerText = `${urls.titleArray[daysPassed - 1]}`;
    // dayCountDisplay.textContent = `${daysPassed}/${chunkArray.length}`;

    // SELECTOR STUFF -----------------------
    // Populate the dropdown

    for (let i = 0; i < daysPassed; i++) {
        const option = document.createElement('option');
        option.value = i + 1;
        option.dataset.display = i + 1;
        option.dataset.descr = urls.titleArray[i];
        option.textContent = i + 1;
        selector.prepend(option);
    }

    // Event listener for dropdown changes
    selector.addEventListener('change', function () {
        const selectedValue = this.value;
        console.log(selectedValue);
        const videoNumber = selectedValue.toString().padStart(2, '0');
        videoPlayer.src = urls.chunkArray[videoNumber - 1];
        epTitle.innerText = `${urls.titleArray[parseInt(selectedValue) - 1]}`;
        numberDisplay.textContent = selectedValue;
        this.blur();
    });

    function focus() {
        [].forEach.call(this.options, function (o) {
            o.textContent = `${o.getAttribute('value')}: ${o.getAttribute('data-descr')}`;
        });
    }
    function blur() {
        [].forEach.call(this.options, function (o) {
            console.log(o);
            o.textContent = o.getAttribute('value');
        });
    }
    [].forEach.call(document.querySelectorAll('#chunkSelector'), function (s) {
        s.addEventListener('focus', focus);
        s.addEventListener('blur', blur);
        blur.call(s);
    });

    // set starting value to 
    selector.value = daysPassed;
    numberDisplay.textContent = daysPassed;
    console.log(daysPassed);

    // END SELECTOR STUFF -------------------
}

function sundayTest() {
    hideElement(videoContainer); //flex
    hideElement(timerContainer);
    epTitle.innerText = `
            Today is Sunday, the day of rest, no chunk today!
            `;
}


function lockdown() {
    hideElement(videoContainer); //flex
    timerContainer.style.display = "block";
    epTitle.innerText = `
            Today's chunk is currently locked, it will unlock in
            `;
    updateCountdown();
}


// DO THE THING
if (isTodaySunday()) {
    sundayTest();
} else if (isPastMidnight() === true) {
    lockdown();
} else {
    (async () => {
        // Generate a random number between 1 and 20
        const randomNumber = await roll();
        const randomNumberInt = parseInt(randomNumber);
        console.log(`Daily roll is: ${randomNumber}`);
        if (firstVisitToday() === true) {
            diceVideo(randomNumberInt);
        }
        if (randomNumber === 1) {
            morbCount = incrementMorbCount();
            morb();
        } else {
            updateVideo();
        }
    })();
}

// TIMER STUFF

function updateCountdown() {
    const now = new Date();
    const nextEightAM = new Date(now);
    nextEightAM.setHours(8, 0, 0, 0);

    if (now.getHours() >= 8) {
        nextEightAM.setDate(now.getDate() + 1);
    }

    const timeDifference = nextEightAM - now;
    // Unlock if it's 8AM or later
    if (isPastMidnight() === false) {
        updateVideo()
    } else {
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        document.getElementById('countdown-timer').textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        setTimeout(updateCountdown, 1000);
    }
}

// MORB UNLOCK ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', (event) => {
    let buffer = '';

    document.addEventListener('keydown', (event) => {
        buffer += event.key;

        // Maintain the buffer length to match the length of "morbius"
        if (buffer.length > 7) {
            buffer = buffer.slice(-7);
        }

        // Check if the buffer matches "morbius"
        if (buffer.toLowerCase() === 'morbius') {
            morb();
        }
    });
});

function changeFavicon(src) {
    const link = document.getElementById('dynamic-favicon');
    link.href = src;
}

let tapCount = 0;
let firstTapTime = 0;
document.body.addEventListener('click', () => {
    const currentTime = new Date().getTime();

    if (tapCount === 0) {
        firstTapTime = currentTime;
    }

    tapCount++;

    if (tapCount === 5 && currentTime - firstTapTime <= 3000) {
        morb();
        tapCount = 0; // Reset the tap count
    } else if (currentTime - firstTapTime > 3000) {
        tapCount = 1; // Reset the tap count and start over
        firstTapTime = currentTime;
    }
});

async function morb() {
    document.title = "Morbius Chunk Player";
    let link = document.querySelector("link[rel~='icon']");
    link.href = "morbicon.png";
    // alert('You typed "morbius"!');
    // changeFavicon('favicon2.png');
    // Additional actions can be added here
    let currentMorbCount = await getMorbCount();
    currentMorbCount += robMorbCount;
    videoPlayer.src = urls.morbChunkArray[currentMorbCount - 1];
    // videoPlayer.src = "https://www.dropbox.com/scl/fo/33lhzjjw8bqgklfbjoryl/ANqLB1QxH8stiTQQFo7wIlU/morb04.mp4?rlkey=rsz99lc4trjj2esu1hv93t2xp&raw=1";
    dayCountDisplay.textContent = `/ ${urls.morbChunkArray.length}`;
    epTitle.innerText = `It's Morbin' Time`
    numberDisplay.textContent = currentMorbCount;
    selector.style.display = 'hidden'
    dayCountDisplay.textContent = `${urls.morbChunkArray.length}`;
    const audio = document.getElementById('morbius-sound');
    audio.play();
}

async function incrementMorbCount() {
    const url = "https://morbcount-worker.quickreactor.workers.dev/increment";
    try {
        const response = await fetch(url);
        const data = await response.text(); // Handling plain text response
        console.log(`Morb Count incremented to ${data}`);
        return parseInt(data, 10);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function setMorbCount(value) {
    const url = `https://morbcount-worker.quickreactor.workers.dev/set?newValue=${value}`;
    try {
        const response = await fetch(url);
        const data = await response.text(); // Handling plain text response
        console.log(`Morb Count set to ${data}`);
        return parseInt(data, 10);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function getMorbCount() {
    const url = "https://morbcount-worker.quickreactor.workers.dev/check";
    try {
        const response = await fetch(url);
        const data = await response.text(); // Handling plain text response
        console.log(`Morb Count is currently: ${data}`);
        return parseInt(data, 10);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function roll() {
    const url = "https://morbcount-worker.quickreactor.workers.dev/roll";
    try {
        const response = await fetch(url);
        const data = await response.text(); // Handling plain text response
        console.log(`You rolled a: ${data}`);
        return parseInt(data, 10);
    } catch (error) {
        console.error('Error:', error);
    }
}


// MORB ----------------------------------------------------------------------

function diceVideo(number) {
    // Update sources by ID
    document.getElementById('diceSource1').src = `${urls.d20HEVCArray[number - 1]}`;
    document.getElementById('diceSource2').src = `${urls.d20webmArray[number - 1]}`;

    // Reload the video
    d20RollerVideo.load();
    playRandomSound();
    d20RollerVideo.addEventListener('ended', function () {
        // Hide the video element
        setTimeout(() => {
            d20RollerVideo.classList.add('hidden');
        }, 2000);
        setTimeout(() => {
            d20RollerVideo.style.display = 'none';
            d20RollerVideo.classList.remove('hidden');
        }, 4000);
    });

    d20RollerVideo.style.display = 'block';
}

function firstVisitToday() {
    let currentDate = getNZFormattedDate();
    let lastVisit = localStorage.getItem('lastVisit');

    if (lastVisit) {
        if (lastVisit === currentDate) {
            return false
        } else {
            localStorage.setItem('lastVisit', currentDate);
            return true
        }
    } else {
        localStorage.setItem('lastVisit', currentDate);
        return true;
    }
}

function getNZFormattedDate() {
    // Create a new Date object and set the time zone to New Zealand
    const date = new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" });
    const nzDate = new Date(date);

    // Extract year, month, and day
    const year = nzDate.getFullYear();
    const month = String(nzDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(nzDate.getDate()).padStart(2, '0');

    // Return formatted date
    return `${year}${month}${day}`;
}

function playRandomSound() {
    // Array of the audio file names
    const sounds = ['audio/dice-roll01.mp3', 'audio/dice-roll02.mp3', 'audio/dice-roll03.mp3'];

    // Get a random index between 0 and 2
    const randomIndex = Math.floor(Math.random() * sounds.length);

    // Get the selected audio file
    const selectedSound = sounds[randomIndex];

    // Get the audio element
    const audioElement = document.getElementById('diceAudio');

    // Set the source of the audio element to the selected sound
    audioElement.src = selectedSound;

    // Play the audio
    setTimeout(() => {
        audioElement.play();
    }, 1000);
}

