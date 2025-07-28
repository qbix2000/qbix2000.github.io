
const menuToggle = document.getElementById('menu-toggle');

let finish = "finish";
let timeIncrement = 10;
let timer = document.getElementById("timer-container");
let intervalTimeDisplay = document.getElementById("intervalTime");
let totalTimeDisplay = document.getElementById("totalTime");

let routine = {}

let setNumber = 0;

function deleteSet(setNumber) {
    const setToDelete = document.getElementById("set" + setNumber);

    const parent = setToDelete.parentNode;

    parent.removeChild(setToDelete);

}

function saveRoutine() {

    let newRoutineForm = document.getElementById("newRoutineForm");

    let formIsValid = newRoutineForm.checkValidity();

    if(!formIsValid) {
        newRoutineForm.reportValidity();
        return;
    }

    routine = {};
    let routineId = document.getElementById("routineId").value
    routine.id = routineId ? routineId : crypto.randomUUID();
    routine.title = document.getElementById("newRoutineName").value;
    routine.rounds = document.getElementById("numberOfRounds").value;
    routine.sets = buildSets();

    const existingRoutineIndex = routines.findIndex(routine => routineId === routine.id);

    if (existingRoutineIndex !== -1) {
        routines[existingRoutineIndex] = routine;
    } else {
        routines.push(routine);
    }

    saveRoutines();
}

function saveRoutines() {
    const jsonString = JSON.stringify(routines);

    localStorage.setItem('routines', jsonString);

    showRoutines();
}

function cancelRoutine() {
    showRoutines();
}

function showRoutines() {
    showContainer("routines-container");
    loadRoutines();
}

function createRoutine() {
    showContainer("routine-container");
    setNumber = 0;
    document.getElementById("routineId").value = "";
    document.getElementById("newRoutineName").value = "";
    document.getElementById("numberOfRounds").value = "1";
    document.getElementById("sets").innerHTML = "";
}

function loadSelectedRoutine(routineNumber) {
    routine = routines[routineNumber];
    showContainer("timer-container", "flex");
    document.getElementById("setName").textContent = routine.sets[0].setName;
    document.getElementById("roundNumber").textContent = "1 / " + routine.rounds;
    totalNumberOfRounds = routine.rounds;
    intervalTimeDisplay.textContent = "00:00";
    totalTimeDisplay.textContent = "00:00";
    timer.style.backgroundImage = "";
}

function showSettings() {
    showContainer("settings-container");
}

const containerIds = ["routine-container", "routines-container", "timer-container", "settings-container"];

function showContainer(containerId, displayStyle = 'block') {
    containerIds.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.style.display = "none";
        }
    });

    document.getElementById(containerId).style.display = displayStyle;

    menuToggle.checked = false;
}

function buildSets() {
    let sets = Array();

    for (let i = 0; i < setNumber; i++) {

        if(document.getElementById(`setName${i}`) == null) {
            continue;
        }

        let set = {
            "setName": document.getElementById(`setName${i}`).value,
            "intervals": [
                {
                    "duration": parseInt(document.getElementById(`activeTime${i}`).value, 0),
                    "type": "active"
                },
                {
                    "duration": parseInt(document.getElementById(`restTime${i}`).value, 0),
                    "type": "rest"
                }
            ]
        };

        sets.push(set);
    }
    return sets;
}

function startTimer() {
    currentRoundNumber = 0;
    currentSetNumber = 0;
    totalTime = 0;
    timePassed = 0;

    incrementRound();
}

function incrementRound() {
    currentRoundNumber += 1;

    if(currentRoundNumber > totalNumberOfRounds) {
        announce(finish);
        return;
    }

    document.getElementById("roundNumber").textContent = currentRoundNumber + " / " + totalNumberOfRounds;

    currentSetNumber = 0;

    runSet();
}

function runSet() {
    if(currentSetNumber >= routine.sets.length) {
        incrementRound();
        return;
    }

    currentIntervalNumber = 0;

    runIntervals();
}

function runIntervals() {
    if(currentIntervalNumber >= routine.sets[currentSetNumber].intervals.length ||
       routine.sets[currentSetNumber].intervals[currentIntervalNumber].duration == 0) {
        currentSetNumber += 1;
        runSet();
        return;
    }

    currentInterval = routine.sets[currentSetNumber].intervals[currentIntervalNumber];

    runTimeInMilliSeconds = currentInterval.duration * 1000;

    if(currentInterval.type == "active") {
        colour = "red";
        announce(routine.sets[currentSetNumber].setName);
        document.getElementById("setName").textContent = routine.sets[currentSetNumber].setName;
    } else {
        colour = "blue";
        announce(currentInterval.type);
    }

    timePassed = 0;
    runTimer();
}

function announce(announcement) {
    if (!('speechSynthesis' in window)) {
        console.error("Error: Web Speech API (SpeechSynthesis) is not supported in this browser.");
        return;
    }

    const synth = window.speechSynthesis;
    if (synth.speaking) {
        synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(announcement);

    utterance.onend = function(event) {
        console.log(`Announcement finished: "${announcement}"`);
    };

    utterance.onerror = function(event) {
        console.error(`Error during announcement for "${announcement}":`, event.error);
    };

    try {
        synth.speak(utterance);
    } catch (e) {
        console.error("Failed to start speech synthesis:", e);
    }
}

function runTimer() {
    let percentage = (timePassed / runTimeInMilliSeconds) * 100;

    const bodyStyles = getComputedStyle(document.body);
    const pageBackgroundColor = bodyStyles.getPropertyValue('--background-color');

    timer.style.backgroundImage = "linear-gradient(to top, " + colour + " " + percentage + "%, " + pageBackgroundColor + " " + percentage + "%)";
    intervalTimeDisplay.textContent = toMinutesAndSeconds(timePassed);
    totalTimeDisplay.textContent = toMinutesAndSeconds(totalTime);

    if (percentage >= 100) {    
        currentIntervalNumber += 1;
        runIntervals();
        return;
    }

    timePassed += timeIncrement;
    totalTime += timeIncrement;

    timerId = setTimeout(runTimer, timeIncrement);
}

function toMinutesAndSeconds(milliSeconds) {
    let minutes = Math.trunc(milliSeconds / 60000);
    let seconds = Math.trunc(milliSeconds / 1000) % 60;

    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function stopTimer() {
    clearTimeout(timerId);
}

let defaultRoutines = [
    {
        "id": "cc315d92-3cd6-46e1-9862-15bc61df8cc0",
        "title": "Hypotrophy isometrics",
        "rounds": 3,
        "sets": [
            {"setName": "Build tension",
             "intervals": [
                 {"duration": 4,
                  "type": "active"},
                 {"duration": 0,
                  "type": "rest"}
             ]
            },
            {"setName": "Hold tension",
             "intervals": [
                 {"duration": 30,
                  "type": "active"},
                 {"duration": 26,
                  "type": "rest"}
             ]
            }
        ]
    },
    {
        "id": "8fc58d4c-c6eb-4159-982c-c4d30cb952a0",
        "title": "Strength isometrics",
        "rounds": 6,
        "sets": [
            {"setName": "Build tension",
             "intervals": [
                 {"duration": 4,
                  "type": "active"},
                 {"duration": 0,
                  "type": "rest"}
             ]
            },
            {"setName": "Hold tension",
             "intervals": [
                 {"duration": 6,
                  "type": "active"},
                 {"duration": 20,
                  "type": "rest"}
             ]
            }
        ]
    },
    {
        "id": "91edee8c-6f17-411c-8c43-40680556405e",
        "title": "Beginners skipping",
        "rounds": 3,
        "sets": [
            {"setName": "Bounce step",
             "intervals": [
                 {"duration": 40,
                  "type": "active"},
                 {"duration": 20,
                  "type": "rest"}
             ]
            },
            {"setName": "Heel jump",
             "intervals": [
                 {"duration": 40,
                  "type": "active"},
                 {"duration": 20,
                  "type": "rest"}
             ]
            },
            {"setName": "straddle jump",
             "intervals": [
                 {"duration": 40,
                  "type": "active"},
                 {"duration": 20,
                  "type": "rest"}
             ]
            },
            {"setName": "Bell jump",
             "intervals": [
                 {"duration": 40,
                  "type": "active"},
                 {"duration": 20,
                  "type": "rest"}
             ]
            },
            {"setName": "Boxers skip",
             "intervals": [
                 {"duration": 40,
                  "type": "active"},
                 {"duration": 20,
                  "type": "rest"}
             ]
            }
        ]
    }
];

let routines = [];

loadRoutines();

function loadRoutines() {
    const retrievedRoutines = localStorage.getItem('routines');

    if (retrievedRoutines) {
        routines = JSON.parse(retrievedRoutines);
    } else {
        routines = defaultRoutines;
    }

    let routinesContainer = document.getElementById("routines-container");
    routinesContainer.innerHTML = "";

    for(let i = 0; i < routines.length; i++) {
        let routine = routines[i];

        routinesContainer.insertAdjacentHTML('beforeend', `
                    <div style="display:flex; align-text:center; align-items:center;">
                        <div class="nav-link" onclick="editRoutine(${i});">✏</div>
                        <div class="nav-link" onclick="loadSelectedRoutine(${i});">
                            <h2>${routine.title}</h2>
                            <p>Total time: ${calculateRoutineLength(routine)}</p>
                        </div>
                         <div class="nav-link" onclick="deleteRoutine(${i});">🗑</div>
                    </div>
                    `);
    }
}

function calculateRoutineLength(routine) {
    let totalTime = 0;
    let sets = routine.sets;

    for(let i = 0; i < sets.length; i++) {
        let set = sets[i];

        for(let j = 0; j < set.intervals.length; j ++) {
            totalTime += set.intervals[j].duration;   
        }
    }

    return toMinutesAndSeconds(totalTime * routine.rounds * 1000);
}

function editRoutine(routineNumber) {
    createRoutine();

    routine = routines[routineNumber];

    document.getElementById("routineId").value = routine.id;
    document.getElementById("newRoutineName").value = routine.title;
    document.getElementById("numberOfRounds").value = routine.rounds;

    for(let i = 0; i < routine.sets.length; i++) {
        let set = routine.sets[i];

        addSet(set.setName, set.intervals[0].duration, set.intervals[1].duration);
    }
}

function addSet(setName = "", activeTime = 1, restTime = 0 ) {
    let currentSets = document.getElementById("sets");

    currentSets.insertAdjacentHTML('beforeend', `
                <div class="input-group" id="set${setNumber}">
                    <label for="setName${setNumber}">Set name: </label>
                    <input type="text" id="setName${setNumber}" class="setNameInput" value="${setName}" required oninvalid="this.setCustomValidity('Please enter a name for your set.')"
                       oninput="this.setCustomValidity('')"/><br/>
         
                    <label for="activeTime${setNumber}">Active time: </label>
                    <input type="number" min="1" max="60" value="${activeTime}" id="activeTime${setNumber}" class="activeTimeInput" required oninvalid="this.setCustomValidity('You must have a value for the active time.')"
                       oninput="this.setCustomValidity('')"/><br/>
         
                    <label for="restTime${setNumber}">Rest time: </label>
                    <input type="number" min="0" value="${restTime}" id="restTime${setNumber}" class="restTimeInput" required oninvalid="this.setCustomValidity('Please enter a valid rest time.')"
                       oninput="this.setCustomValidity('')"/><br/>
                    <button class="button" onclick="deleteSet(${setNumber});">Delete</button>
                </div>
            `);

    setNumber += 1;
}

function deleteRoutine(routineNumber) {
    routines.splice(routineNumber, 1);

    saveRoutines();
}

async function pickSingleFile() {
    const [fileHandle] = await window.showOpenFilePicker({
        types: [{
            description: 'JSON Files',
            accept: {
                'application/json': ['.json'],
            },
        }],
        multiple: false
    });
    return await fileHandle.getFile();
}

async function importRoutines() {
    try {
        const file = await pickSingleFile();
        let fileContent = await file.text();

        const parsedJsonObject = JSON.parse(fileContent);

        routines = routines.concat(parsedJsonObject);

        saveRoutines();

    } catch (error) {
        if(error.name != "AbortError") {
            alert("unable to read file: " + error);
        }
    }
}

function exportRoutines() {

    const blob = new Blob([JSON.stringify(routines, null, 2)], {
        type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'routines.json';
    a.click();
    URL.revokeObjectURL(url);
}

function clearLocalStorage() {

    if (confirm("Are you sure you want to delete all your routines?")) {
        localStorage.clear();

        location.reload();
    }
}
