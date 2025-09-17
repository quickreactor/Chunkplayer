function morbSpoiler(string) {
    const word = 'morbius';
    const targetLetters = word.split('');
    const targetLettersOG = word.split('');
    const charArray = string.split("");
    let result = "";

    // if first letter is not a chosen, add spoiler to start whole thing
    if (charArray[0].toLowerCase() !== targetLettersOG[0]) {
        result += "||";
    }

    for (let i = 0; i < charArray.length; i++) {
        console.log(charArray[i]);
        if (charArray[i].toLowerCase() == targetLetters[0]) {         // MATCH
            i !== 0 ? (result += "||") : ""; // if not first char, add closing spoiler before it
            while (charArray[i].toLowerCase() == targetLetters[0]) {
                result += charArray[i];
                targetLetters.shift();
                i++;
            }
            if (i !== charArray.length - 1) { // if not last char
                (result += "||");
                result += charArray[i];
            }
        } else { // NO MATCH
            result += charArray[i];
            // if last letter is not a chosen, add spoiler
            if (i === charArray.length - 1) {
                result += "||";
            }
        }
    }

    console.log(result);
}

// morbSpoiler(
//     "mayb"
// );
// morbSpoiler(
//     "More I muttered oh my god at the end of this one for real. he;s back. o no."
// );
// morbSpoiler(
//     "he simply cannot take the precious goggles off b."
// );
morbSpoiler(
    "I must say there is something pretty hilarious about seeing geeko get bullied by a full grown man at Unitech High School"
);

//base case is, it's just one letter in a row
//we add || on the end

// function processLetter
// if the letter is the chosen letter
// shift off first letter of target array
// run the function again on the next letter
// add || on the end
