// TODO make the call to CF workers just one per day that will return the movieCode, roll and morbcount

// redo a bunch of stuff with eventlisteners
// sync playdiceaudio to when video plays with event
// use metadata eventlistener to set size of vidoe player
// use canplay event to show the video player (fade in) when it's ready
// 1 - 20 all do different sounds

const movieCode = 'pineapple';
const startDate = new Date('2024-08-20T00:00:00+12:00');
const dateInput = document.getElementById('dateInput');
const videoPlayer = document.getElementById('videoPlayer');
const d20RollerVideo = document.getElementById('d20RollerVideo')
const dayCountDisplay = document.getElementById('dayCount');
const rollButton = document.getElementById('roll-button');
rollButton.addEventListener('click', rollForMovieChoice);
const poster1 = document.getElementById('poster-image-1');
const poster2 = document.getElementById('poster-image-2');
const posterContainer2 = document.getElementById('poster-container-2');
const posterContainer1 = document.getElementById('poster-container-1');
const posterSection = document.querySelector('.poster-section');
let container = document.querySelector(".container");
let videoContainer = document.querySelector(".videoContainer");
let timerContainer = document.querySelector(".timer-container");
let todaysPoster = document.querySelector("#todays-poster");
let topBar = document.querySelector('#top-bar');

let sonic = document.querySelector('#sonic');

let chunkArray = [];
let titleArray = [];

let epTitle = document.querySelector(".ep-title");
epTitle.addEventListener('click', function () {
    diceVideo(Math.floor(Math.random() * 20 + 1));
});
let diceVideoEndListenerSet = false;

const selector = document.getElementById('chunkSelector');
const numberDisplay = document.querySelector(".numberDisplay");
let morbCount = 0;
let robMorbCount = 3;
let randomNumber = 0;
let today = new Date();
// uncomment to get around sunday detection
// today = new Date('2024-08-24');
let now = new Date();
// uncomment to geta round midnight detection
// now = new Date('2024-08-24T11:24:00')
// Uncomment below to test rolling
clearLastVisit();


// Define a global variable to store the JSON data
let urls = {};

(async () => {
    // Fetch the JSON data
    await fetch('urls.json')
        .then(response => response.json())
        .then(data => {
            // Store the data in the global variable
            urls = data;
            chunkArray = urls[movieCode].chunks;
            titleArray = urls[movieCode].titles;
        })
        .catch(error => console.error('Error loading JSON:', error));

// DO THE THING
if (isTodaySunday()) {
    sundayTest();
} else if (isPastMidnight() === true || startDate > new Date()) {
    lockdown();
} else {

    (async () => {


        // Generate a random number between 1 and 20
        if (firstVisitToday() === true) {
            posterSection.style.display = 'flex';
            poster1.src = urls[movieCode].poster;
            poster2.src = urls.morb.poster;
            // localStorage.setItem('dailyMorbCount', await fetchMorbCountToLocalStorage());
            // localStorage.setItem('randomNumber', await fetchRollToLocalStorage());
            // randomNumber = parseInt(localStorage.getItem('randomNumber'));
            // console.log(`Daily roll is: ${randomNumber}`);
            // morbCount = parseInt(localStorage.getItem('dailyMorbCount'));
            // diceVideo(parseInt(randomNumber));
            // if (randomNumber === 1) {
            //     localStorage.setItem('dailyMorbCount', await incrementMorbCount());
            //     morb();
            // }
        } else {
            // 2nd visit onwards
            randomNumber = parseInt(localStorage.getItem('randomNumber'));
            morbCount = parseInt(localStorage.getItem('dailyMorbCount'));

            // Uncomment to force non-morb
            // randomNumber = 20;
            // Uncomment to force morb
            // randomNumber = 1;
            if (randomNumber === 1) {
                morb();
            } else {
                updateVideo();
            }
        }
    })();
}
})();


function hideElement(el) {
    el.style.display = 'none';
}

function isTodaySunday() {
    return today.getDay() === 0;
}

function isPastMidnight() {
    const currentHour = now.getHours();

    // Check if the current hour is between 0 (midnight) and 8 (8 AM)
    return currentHour >= 0 && currentHour < 8;
}

async function updateVideo(first) {
    timerContainer.style.display = "none";
    epTitle.innerText = ``;
    // Set the default date to July 22, 2024 in NZ timezone
    const defaultDate = startDate;
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));

    let daysPassed = 0;
    for (let d = new Date(defaultDate); d <= now; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) { // Skip Sundays (0 is Sunday in JavaScript)
            daysPassed++;
        }
    }

    const videoNumberText = daysPassed - morbCount;
    const videoNumberIndex = videoNumberText - 1;
    morbCount = await fetchMorbCountToLocalStorage();
    videoPlayer.src = chunkArray[videoNumberIndex];
    // Trigger the transition after ensuring the container is in the DOM
    container.style.display = 'flex';
    // videoContainer.style.display = "flex";
    dayCountDisplay.textContent = `/ ${chunkArray.length}`;
    epTitle.innerText = `${titleArray[videoNumberIndex]}`;
    // dayCountDisplay.textContent = `${daysPassed}/${chunkArray.length}`;

    todaysPoster.src = urls[movieCode].poster;
    changeFavicon(urls[movieCode].favicon);
    document.title = `${toSentenceCase(movieCode)} Chunk Player`

    // SELECTOR STUFF -----------------------
    // Populate the dropdown

    for (let i = 0; i < daysPassed - morbCount; i++) {
        const option = document.createElement('option');
        option.value = i + 1;
        option.dataset.display = i + 1;
        option.dataset.descr = titleArray[i];
        option.textContent = i + 1;
        selector.prepend(option);
    }

    // Event listener for dropdown changes
    selector.addEventListener('change', function () {
        const selectedValue = parseInt(this.value);
        const selectedIndex = selectedValue - 1;
        console.log(selectedValue);
        videoPlayer.src = chunkArray[selectedIndex];
        epTitle.innerText = `${titleArray[selectedIndex]}`;
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
    selector.value = daysPassed - morbCount;
    numberDisplay.textContent = daysPassed - morbCount;
    console.log(`Days passed: ${daysPassed} - Morb count ${morbCount} = ${daysPassed - morbCount}`);

    // END SELECTOR STUFF -------------------

    if (first) {
        requestAnimationFrame(() => {
            // Force a reflow before changing opacity
            void container.offsetWidth;
            // container.style.opacity = 1;
            container.classList.remove('hidden');
        });
    } else {
        container.classList.remove('hidden');
    }

}

function sundayTest() {
    container.classList.remove('hidden');
    container.style.display = 'flex';
    topBar.style.justifyContent = 'center';
    epTitle.style.fontSize = '40px';
    hideElement(videoContainer); //flex
    hideElement(timerContainer);
    epTitle.innerText = `
            Today is Sunday, the day of rest, no chunk today!
            `;
}


function lockdown() {
    container.classList.remove('hidden');
    container.style.display = 'flex';

    hideElement(videoContainer); //flex
    timerContainer.style.display = "block";
    epTitle.innerText = `
            Today's ${movieCode}chunk is currently locked, it will unlock in
            `;
    updateCountdown();
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
    if (isPastMidnight() === false && startDate < new Date()) {
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

async function morb(first) {
    document.title = "Morbius Chunk Player";
    changeFavicon(urls.morb.favicon);
    // alert('You typed "morbius"!');
    // changeFavicon('favicon2.png');
    // Additional actions can be added here
    let currentMorbCount = parseInt(localStorage.getItem('dailyMorbCount'));

    currentMorbCount += robMorbCount;
    videoPlayer.src = urls.morb.chunks[currentMorbCount - 1];
    // videoPlayer.src = "https://www.dropbox.com/scl/fo/33lhzjjw8bqgklfbjoryl/ANqLB1QxH8stiTQQFo7wIlU/morb04.mp4?rlkey=rsz99lc4trjj2esu1hv93t2xp&raw=1";
    container.style.display = 'flex';
    // Trigger the transition after ensuring the container is in the DOM
    if (first) {
        requestAnimationFrame(() => {
            container.classList.add('unhidden');
        });
    } else {
        container.classList.remove('hidden');
    }
    dayCountDisplay.textContent = `/ ${urls.morb.chunks.length}`;
    epTitle.innerText = `It's Morbin' Time`
    numberDisplay.textContent = currentMorbCount;
    todaysPoster.src = urls.morb.poster;
    selector.style.pointerEvents = 'none';
    dayCountDisplay.textContent = `${urls.morb.chunks.length}`;
    const audio = document.getElementById('morbius-sound');
    audio.play();
}

async function incrementMorbCount() {
    const url = "https://morbcount-worker.quickreactor.workers.dev/increment";
    try {
        const response = await fetch(url);
        const data = await response.text(); // Handling plain text response
        localStorage.setItem('dailyMorbCount', parseInt(data));
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
        localStorage.setItem('dailyMorbCount', parseInt(data));
        console.log(`Morb Count set to ${data}`);
        return parseInt(data, 10);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchMorbCountToLocalStorage() {
    const url = "https://morbcount-worker.quickreactor.workers.dev/check";
    try {
        const response = await fetch(url);
        const data = await response.text(); // Handling plain text response
        localStorage.setItem('dailyMorbCount', parseInt(data));
        console.log(`Morb Count is currently: ${data}, and is in localStorage`);
        console.log(data);
        return parseInt(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchRollToLocalStorage() {
    const url = "https://morbcount-worker.quickreactor.workers.dev/roll";
    try {
        const response = await fetch(url);
        const data = await response.text(); // Handling plain text response
        localStorage.setItem('dailyRoll', parseInt(data));
        console.log(`You rolled a: ${data}`);
        return parseInt(data, 10);
    } catch (error) {
        console.error('Error:', error);
    }
}


// MORB ----------------------------------------------------------------------

async function diceVideo(number) {
    // Update sources by ID
    document.getElementById('diceSource1').src = `${urls.d20HEVCArray[number - 1]}`;
    document.getElementById('diceSource2').src = `${urls.d20webmArray[number - 1]}`;

    return new Promise((resolve) => {
        // Reload the video
        d20RollerVideo.style.display = 'block';
        d20RollerVideo.load();
        setTimeout(() => {
            playDiceSound();
        }, 1500);

        d20RollerVideo.addEventListener('ended', afterDiceFunction);


        function afterDiceFunction() {
            // play the specific audio clip
            playRandomSound(number);

            // Hide the video element
            setTimeout(() => {
                d20RollerVideo.classList.add('hidden');
            }, 2000);
            setTimeout(() => {
                d20RollerVideo.style.display = 'none';
                d20RollerVideo.classList.remove('hidden');
            }, 4000);
            d20RollerVideo.removeEventListener('ended', afterDiceFunction);

            resolve();

        };
    });
}

function firstVisitToday() {
    let currentDate = getNZFormattedDate();
    let lastVisit = localStorage.getItem('lastVisit');

    if (lastVisit) {
        if (lastVisit === currentDate) {
            return false
        } else {
            return true
        }
    } else {
        return true;
    }
}

function getNZFormattedDate() {
    // Create a new Date object and set the time zone to New Zealand
    const date = new Date;

    // Extract year, month, and day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');

    // Return formatted date
    return `${year}${month}${day}`;
}

function playDiceSound() {
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

    audioElement.play();

}

function playRandomSound(num) {
    // Array of the audio file names
    const sounds = urls.randomSounds;
    // Get the audio element
    const audioElement = document.getElementById('randomAudio');

    console.log(sounds[num-1]);
    // Set the source of the audio element to the selected sound
    audioElement.src = sounds[num-1];

    // Play the audio

    audioElement.play();
    if (num === 20) {
        sonic.style.display = "block";
        sonic.classList.add('animate');
    }

}

async function rollForMovieChoice() {
    rollButton.classList.add('rolled');
    localStorage.setItem('randomNumber', await fetchRollToLocalStorage());
    localStorage.setItem('dailyMorbCount', await fetchMorbCountToLocalStorage());
    randomNumber = parseInt(localStorage.getItem('randomNumber'));
    console.log(`Daily roll is: ${randomNumber}`);
    morbCount = parseInt(localStorage.getItem('dailyMorbCount'));
    await diceVideo(parseInt(randomNumber));
    // register visit
    let currentDate = getNZFormattedDate();
    localStorage.setItem('lastVisit', currentDate);
    if (randomNumber === 1) {
        movieWinnerLoser(poster2, poster1);
        const audio = document.getElementById('morbius-sound');
        audio.play();
        // localStorage.setItem('dailyMorbCount', await incrementMorbCount());
        setTimeout(() => {
            morb(true);
        }, 4000);
    } else {
        await movieWinnerLoser(poster1, poster2);
        updateVideo(true);
    }
}


function movieWinnerLoser(winner, loser) {
    return new Promise(resolve => {
        winner.classList.add('winner');
        let posterComputed = getComputedStyle(winner);
        let posterMargin = parseFloat(posterComputed.marginLeft);
        const posterWidth = winner.getBoundingClientRect().width;
        let rollButtonWidth = rollButton.getBoundingClientRect().width
        let movementDistance = posterWidth / 2 + posterMargin + rollButtonWidth / 2;
        console.log(winner === poster1);
        if (winner === poster1) {
            poster1.style.transform = `translate(${movementDistance}px, 0)`;
            console.log('in');
        } else {
            
        }
        loser.classList.add('hidden', 'fade-out-fast');
        setTimeout(() => {
            posterSection.classList.add('hidden', 'fade-out-slow');
        }, 2000);
        setTimeout(() => {
            posterSection.style.display = 'none';
            requestAnimationFrame(() => {

                resolve(); // Resolve the promise after visual updates are done
            });
        }, 4000);
    });
}

function clearLastVisit() {
    localStorage.setItem('lastVisit', '');
    return "Last visit cleared, roll on!"
}

function toSentenceCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}