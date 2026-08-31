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
  trackPeakWeight(parseFloat(slider.value).toFixed(1));
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

function trackPeakWeight(liveWeight) {
  // Only update if the current live pull exceeds our recorded peak
  liveWeight = parseFloat(liveWeight);
  if (liveWeight > currentPeakWeight) {
    currentPeakWeight = liveWeight;
    
    const setPeakDisplay = document.getElementById("set-peak-display");
    if (setPeakDisplay) {
      setPeakDisplay.textContent = currentPeakWeight.toFixed(1);
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

function attachStepperEvents() {
  const buttons = document.querySelectorAll('.nav-btn');

  buttons.forEach(btn => {
    // Determine step amount (+1 or -1) based on button content or data attribute
    const isIncrement = btn.textContent.includes('+');
    const inputId = btn.getAttribute('data-input-id') || (btn.closest('.input')?.querySelector('input')?.id);
    const amount = isIncrement ? 1 : -1;

    // Remove old inline handlers if present and use unified Pointer Events
    btn.onmousedown = null;
    btn.ontouchstart = null;

    btn.addEventListener('pointerdown', (e) => {
      // Prevent double triggers and default scrolling gestures while holding buttons
      e.preventDefault();
      
      // Execute first tap increment immediately
      adjustAmount(amount, inputId);

      // Clear any leftover timers
      stopHolding();

      // Start hold-to-repeat delay (400ms delay, then repeat every 100ms)
      holdTimer = setTimeout(() => {
        holdInterval = setInterval(() => {
          adjustAmount(amount, inputId);
        }, 100);
      }, 400);
    });

    // Stop incrementing on pointer release, cancel, or when finger leaves button bounds
    btn.addEventListener('pointerup', stopHolding);
    btn.addEventListener('pointercancel', stopHolding);
    btn.addEventListener('pointerleave', stopHolding);
  });
}

function stopHolding() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  if (holdInterval) {
    clearInterval(holdInterval);
    holdInterval = null;
  }
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

  // Mobile Haptic Feedback (Vibrates mobile devices on tap)
  if ("vibrate" in navigator) {
    navigator.vibrate(12);
  }
}

// Call event binding once DOM is ready
document.addEventListener('DOMContentLoaded', attachStepperEvents);

// Web Bluetooth Handler
// State & Timeout references
let device = null;
let advertisementTimeout = null;
const ADVERTISEMENT_TIMEOUT_MS = 300000;

async function connectBluetooth() {
  const headerBtIcon = document.getElementById("header-bt");
  const actionBtIcon = document.getElementById("bt-action");

  try {
    const companyIds = Array.from({ length: 0x0300 }, (_, i) => i);

    // 1. Request device filtering by prefix
    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'IF_B7' }],
      optionalManufacturerData: companyIds
    });

    // 2. Attach single advertisement listener
    device.addEventListener('advertisementreceived', handleAdvertisement);

    // 3. Start watching advertisement packets
    await device.watchAdvertisements();

    // 4. Update UI & request screen lock
    setBluetoothUIState(true);
    await requestWakeLock();

    // 5. Start timeout countdown waiting for first packet
    resetAdvertisementTimeout();

  } catch (error) {
    console.error("Bluetooth connection error:", error);
    setBluetoothUIState(false);
  }
}

// Separate packet processing handler
function handleAdvertisement(event) {
  // Packet received — push back disconnection timer
  resetAdvertisementTimeout();

  if (!event.manufacturerData || event.manufacturerData.size === 0) return;

  const weightDisplay = document.getElementById("weight-display");

  event.manufacturerData.forEach((dataView) => {
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);

    if (bytes.length >= 12) {
      const rawWeight = (bytes[10] << 8) | bytes[11];
      const weightKg = (rawWeight / 105.3).toFixed(1);

      if (!isNaN(weightKg) && weightDisplay) {
        weightDisplay.textContent = weightKg;
        checkWeightThreshold(parseFloat(weightKg));
        trackPeakWeight(weightKg);
      }
    }
  });
}

// Resets watchdog timer on every packet
function resetAdvertisementTimeout() {
  if (advertisementTimeout) clearTimeout(advertisementTimeout);

  advertisementTimeout = setTimeout(() => {
    onBluetoothDisconnected();
  }, ADVERTISEMENT_TIMEOUT_MS);
}

// Fires when advertisement stream drops out
function onBluetoothDisconnected() {
  console.log("Bluetooth signal lost — no advertisement packets received.");
  
  if (advertisementTimeout) clearTimeout(advertisementTimeout);
  
  // Clean up device listener if device reference exists
  if (device) {
    device.removeEventListener('advertisementreceived', handleAdvertisement);
  }

  releaseWakeLock();
  setBluetoothUIState(false);
}

// Centralized UI toggle
function setBluetoothUIState(isConnected) {
  const headerBtIcon = document.getElementById("header-bt");
  const actionBtIcon = document.getElementById("bt-action");

  [headerBtIcon, actionBtIcon].forEach((icon) => {
    if (icon) {
      icon.classList.toggle("connected", isConnected);
    }
  });
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

let wakeLock = null;

// Call this inside your Bluetooth Connect button handler
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock active');

      // Re-apply if the user switches tabs and comes back
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  } catch (err) {
    console.error(`Wake Lock error: ${err.name}, ${err.message}`);
  }
}

// Call this when Bluetooth disconnects
function releaseWakeLock() {
    console.log("requesting wakelock");
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log('Screen Wake Lock released');
    });
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
}

// Re-aquire wake lock if app regains focus while Bluetooth is still connected
async function handleVisibilityChange() {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
}

