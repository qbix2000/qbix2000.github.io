let isSetRunning = false;
let isSetComplete = false;
let audioCtx = null;
let targetDuration = 6;
let currentPeakWeight = 0;

function updateWeight() {
  let slider = document.getElementById("weight-range");
  let weightDisplay = document.getElementById("weight-display");
    
  weightDisplay.innerHTML = slider.value;

  checkWeightThreshold(slider.value);
  trackPeakWeight(parseFloat(slider.value));
}


function playBeep(frequency = 880, duration = 0.5) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = "sine"; 
  oscillator.frequency.value = frequency;

  const startTime = audioCtx.currentTime;

  gainNode.gain.setValueAtTime(0.5, startTime);
  gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

let timerInterval = null;
let timerSeconds = 0;

function startTimer() {
  if (timerInterval) return;

  const timeInput = document.getElementById("time-input");
  if (!timeInput) {
    isSetRunning = false;
    return;
  }

  targetDuration = parseInt(timeInput.value || timeInput.textContent || "10", 10);
  if (isNaN(targetDuration) || targetDuration <= 0) {
    isSetRunning = false;
    return;
  }

  timerSeconds = targetDuration;

  playBeep(880, 0.4); // Start beep (High tone)

  timerInterval = setInterval(() => {
    timerSeconds--;
    
    updateTimerDisplay(timerSeconds);

    if (timerSeconds <= 0) {
      stopTimer();
      playBeep(1200, 0.6); // Completion beep (Highest tone)

      isSetRunning = false;
      isSetComplete = true; // Lock set until tension released

      updateTimerDisplay(targetDuration);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function abortTimer() {
  stopTimer();
  playBeep(440, 0.3); // Drop/Abort beep (Low tone)
  
  isSetRunning = false;
  isSetComplete = false;

  // Reset display back to user's preset time
  const timeInput = document.getElementById("time-input");
  updateTimerDisplay(targetDuration);
}

function updateTimerDisplay(seconds) {
  const countdownDisplay = document.getElementById("time-input");
  if (countdownDisplay) {
    countdownDisplay.value = seconds;
  }
}

// Weight Threshold Evaluator
function checkWeightThreshold(currentWeightKg) {
  const targetInput = document.getElementById("target-weight") || document.getElementById("weight-target");
  const targetWeight = parseFloat(targetInput?.value || targetInput?.textContent || 0);

  if (targetWeight <= 0) return;

  // 1. Tension Release (post-completion)
  if (currentWeightKg < Math.max(targetWeight * 0.2, 2.0)) {
    if (isSetComplete) {
      console.log("Tension fully released. Ready for next set!");
      isSetComplete = false; 
    }
  }

  // 2. Mid-Set Drop Check: Cancel set if weight drops below threshold during a run
  if (isSetRunning && currentWeightKg < targetWeight) {
    console.log("Weight dropped below threshold! Aborting set...");
    abortTimer();
    return;
  }

  // 3. Start Set: Pull meets or exceeds target weight
  if (currentWeightKg >= targetWeight && !isSetRunning && !isSetComplete) {
    console.log(`Target weight ${targetWeight} kg reached! Starting timer...`);
    isSetRunning = true;
    startTimer();
  }
}

// Stepper controls
let holdTimer = null;
let holdInterval = null;

function startHolding(amount, inputId) {
  adjustAmount(amount, inputId);
  stopHolding();
  holdTimer = setTimeout(() => {
    holdInterval = setInterval(() => {
      adjustAmount(amount, inputId);
    }, 100);
  }, 400);
}

function stopHolding() {
  clearTimeout(holdTimer);
  clearInterval(holdInterval);
}

function adjustAmount(amount, inputId) {
  const display = document.getElementById(inputId);
  if (!display) return;

  const max = parseFloat(display.max) || 999;
  const min = parseFloat(display.min) || 0;

  let currentVal = parseFloat(display.value || display.textContent) || min;
  let newVal = Math.min(Math.max(currentVal + amount, min), max);

  if (display.tagName === "INPUT") {
    display.value = newVal.toFixed(0);
  } else {
    display.textContent = newVal.toFixed(0);
  }
}

function trackPeakWeight(liveWeight) {
  // Only update if the current live pull exceeds our recorded peak
  liveWeight = parseFloat(liveWeight);
  if (liveWeight > currentPeakWeight) {
    currentPeakWeight = liveWeight;
    
    const setPeakDisplay = document.getElementById("set-peak-display");
    if (setPeakDisplay) {
      setPeakDisplay.textContent = currentPeakWeight.toFixed(2);
    }
  }
}

function resetPeakWeight() {
  currentPeakWeight = 0;
  const setPeakDisplay = document.getElementById("set-peak-display");
  if (setPeakDisplay) {
    setPeakDisplay.textContent = "0.00";
  }
  console.log("Peak weight manually reset.");
}

// Web Bluetooth Handler
async function connectBluetooth() {
  const headerBtIcon = document.getElementById("header-bt");
  const actionBtIcon = document.getElementById("bt-action");
  const weightDisplay = document.getElementById("weight-display");

  try {
    const companyIds = Array.from({ length: 0x0300 }, (_, i) => i);

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'IF_B7' }],
      optionalManufacturerData: companyIds
    });

    await device.watchAdvertisements();

    if (headerBtIcon) headerBtIcon.classList.add("connected");
    if (actionBtIcon) actionBtIcon.classList.add("connected");

    const handleAdv = (event) => {
      if (event.manufacturerData && event.manufacturerData.size > 0) {
        event.manufacturerData.forEach((dataView) => {
          const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);

          if (bytes.length >= 12) {
            const rawWeight = (bytes[10] << 8) | bytes[11];
            const weightKg = (rawWeight / 105.3).toFixed(2);

            if (!isNaN(weightKg) && weightDisplay) {
              weightDisplay.textContent = weightKg;
              checkWeightThreshold(parseFloat(weightKg));
              trackPeakWeight(weightKg);
            }
          }
        });
      }
    };

    device.addEventListener('advertisementreceived', handleAdv);
    navigator.bluetooth.addEventListener('advertisementreceived', handleAdv);

  } catch (error) {
    console.error("Bluetooth connection error:", error);
    if (headerBtIcon) headerBtIcon.classList.remove("connected");
    if (actionBtIcon) actionBtIcon.classList.remove("connected");
  }
}

class BluetoothIcon extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <svg class="bt-svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline>
      </svg>
    `;
  }
}

customElements.define("bluetooth-icon", BluetoothIcon);
