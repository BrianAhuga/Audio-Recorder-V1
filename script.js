/*==================================================
    STUDIO AUDIO RECORDER
    Part 3A
    Application Setup & Initialization
==================================================*/

//===============================================
// Application State
//===============================================

const App = {
  recorder: null,

  stream: null,

  chunks: [],

  recording: false,

  paused: false,

  timer: null,

  seconds: 0,

  audioURL: null,

  audioContext: null,

  analyser: null,

  source: null,

  gainNode: null,

  animationFrame: null,

  waveformOffset: 0,
};

//===============================================
// DOM References
//===============================================

const studio = document.querySelector(".studio");

const recordBtn = document.getElementById("recordBtn");

const microphoneSelect = document.getElementById("microphoneSelect");

const previewSection = document.getElementById("previewSection");

const audioPlayer = document.getElementById("audio");

const timerText = document.getElementById("timer");

const statusText = document.getElementById("statusText");

const dot = document.getElementById("dot");

const levelBar = document.getElementById("levelBar");

const dbLevel = document.getElementById("dbLevel");

const downloadBtn = document.getElementById("download");

const retakeBtn = document.getElementById("retake");

const canvas = document.getElementById("waveform");

const ctx = canvas.getContext("2d");

//===============================================
// Canvas Configuration
//===============================================

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;

  const width = canvas.clientWidth;

  const height = canvas.clientHeight;

  canvas.width = width * ratio;

  canvas.height = height * ratio;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.scale(ratio, ratio);
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

//===============================================
// Utility Functions
//===============================================

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setStatus(text, color) {
  statusText.textContent = text;

  dot.style.background = color;
}

function resetTimer() {
  App.seconds = 0;

  timerText.textContent = "00:00";
}

function updateTimer() {
  App.seconds++;

  timerText.textContent = formatTime(App.seconds);
}

function revokeAudioURL() {
  if (App.audioURL) {
    URL.revokeObjectURL(App.audioURL);

    App.audioURL = null;
  }
}

//===============================================
// Button State Helpers
//===============================================

function enableRecordingUI() {
  studio.classList.add("recording");

  recordBtn.disabled = false;
}

function disableRecordingUI() {
  studio.classList.remove("recording");

  recordBtn.disabled = false;
}

function hidePreview() {
  previewSection.classList.add("hidden");
}

function showPreview() {
  previewSection.classList.remove("hidden");
}

//===============================================
// Load Microphones
//===============================================

async function loadMicrophones() {
  try {
    // Needed so browsers expose device names

    const tempStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    tempStream.getTracks().forEach((track) => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();

    const microphones = devices.filter(
      (device) => device.kind === "audioinput",
    );

    microphoneSelect.innerHTML = "";

    if (microphones.length === 0) {
      const option = document.createElement("option");

      option.textContent = "No microphones found";

      microphoneSelect.appendChild(option);

      return;
    }

    microphones.forEach((mic, index) => {
      const option = document.createElement("option");

      option.value = mic.deviceId;

      option.textContent = mic.label || `Microphone ${index + 1}`;

      microphoneSelect.appendChild(option);
    });
  } catch (error) {
    console.error(error);

    setStatus("Microphone Access Denied", "#ef4444");
  }
}

//===============================================
// Listen for Device Changes
//===============================================

if (navigator.mediaDevices) {
  navigator.mediaDevices.addEventListener(
    "devicechange",

    loadMicrophones,
  );
}

//===============================================
// Browser Support Check
//===============================================

function checkBrowserSupport() {
  if (!navigator.mediaDevices) {
    alert("Your browser does not support audio recording.");

    throw new Error("MediaDevices API unavailable.");
  }

  if (!window.MediaRecorder) {
    alert("MediaRecorder is not supported in this browser.");

    throw new Error("MediaRecorder unavailable.");
  }
}

//===============================================
// Initial UI State
//===============================================

function initializeUI() {
  resetTimer();

  hidePreview();

  setStatus("Ready", "#22c55e");

  levelBar.style.width = "0%";

  dbLevel.textContent = "0%";
}

//===============================================
// Initialize Application
//===============================================

async function initializeRecorder() {
  checkBrowserSupport();

  initializeUI();

  await loadMicrophones();
}

initializeRecorder();

/*==================================================
    PART 3B1
    Audio Engine Initialization
==================================================*/

//===============================================
// Audio Configuration
//===============================================

const AUDIO_CONFIG = {
  fftSize: 2048,

  smoothing: 0.85,

  minDecibels: -90,

  maxDecibels: -10,

  sampleRate: 48000,

  channelCount: 1,
};

//===============================================
// Audio Buffers
//===============================================

let waveformBuffer = null;

let frequencyBuffer = null;

let rmsHistory = [];

const MAX_HISTORY = 120;

//===============================================
// Build Audio Engine
//===============================================

async function createAudioEngine(stream) {
  // Create Audio Context

  App.audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: AUDIO_CONFIG.sampleRate,
  });

  // Create Source

  App.source = App.audioContext.createMediaStreamSource(stream);

  // Gain Node

  App.gainNode = App.audioContext.createGain();

  App.gainNode.gain.value = 1;

  // Analyzer

  App.analyser = App.audioContext.createAnalyser();

  App.analyser.fftSize = AUDIO_CONFIG.fftSize;

  App.analyser.smoothingTimeConstant = AUDIO_CONFIG.smoothing;

  App.analyser.minDecibels = AUDIO_CONFIG.minDecibels;

  App.analyser.maxDecibels = AUDIO_CONFIG.maxDecibels;

  waveformBuffer = new Uint8Array(App.analyser.fftSize);

  frequencyBuffer = new Uint8Array(App.analyser.frequencyBinCount);

  // Connect Graph

  App.source.connect(App.gainNode);

  App.gainNode.connect(App.analyser);
}

//===============================================
// Destroy Audio Engine
//===============================================

async function destroyAudioEngine() {
  if (App.animationFrame) {
    cancelAnimationFrame(App.animationFrame);
  }

  if (App.source) {
    App.source.disconnect();
  }

  if (App.gainNode) {
    App.gainNode.disconnect();
  }

  if (App.analyser) {
    App.analyser.disconnect();
  }

  if (App.audioContext) {
    await App.audioContext.close();
  }

  App.audioContext = null;

  App.source = null;

  App.gainNode = null;

  App.analyser = null;
}

//===============================================
// Clear Waveform Canvas
//===============================================

function clearWaveform() {
  ctx.clearRect(
    0,

    0,

    canvas.clientWidth,

    canvas.clientHeight,
  );
}

//===============================================
// Draw Background Grid
//===============================================

function drawGrid() {
  const width = canvas.clientWidth;

  const height = canvas.clientHeight;

  ctx.fillStyle = "#08111d";

  ctx.fillRect(
    0,

    0,

    width,

    height,
  );

  ctx.strokeStyle = "rgba(255,255,255,.04)";

  ctx.lineWidth = 1;

  const grid = 30;

  for (let x = 0; x <= width; x += grid) {
    ctx.beginPath();

    ctx.moveTo(x, 0);

    ctx.lineTo(x, height);

    ctx.stroke();
  }

  for (let y = 0; y <= height; y += grid) {
    ctx.beginPath();

    ctx.moveTo(0, y);

    ctx.lineTo(width, y);

    ctx.stroke();
  }
}

//===============================================
// Draw Center Line
//===============================================

function drawCenterLine() {
  const width = canvas.clientWidth;

  const height = canvas.clientHeight;

  ctx.beginPath();

  ctx.moveTo(
    0,

    height / 2,
  );

  ctx.lineTo(
    width,

    height / 2,
  );

  ctx.strokeStyle = "rgba(59,130,246,.18)";

  ctx.lineWidth = 2;

  ctx.stroke();
}

//===============================================
// Calculate RMS
//===============================================

function calculateRMS(samples) {
  let sum = 0;

  for (let i = 0; i < samples.length; i++) {
    const sample = (samples[i] - 128) / 128;

    sum += sample * sample;
  }

  return Math.sqrt(sum / samples.length);
}

//===============================================
// Normalize RMS
//===============================================

function normalizeLevel(rms) {
  return Math.min(
    100,

    Math.max(
      0,

      rms * 220,
    ),
  );
}

//===============================================
// Reset Audio Meter
//===============================================

function resetMeter() {
  levelBar.style.width = "0%";

  dbLevel.textContent = "0%";
}

//===============================================
// Voice Activity Detection
//===============================================

function isSpeaking(rms) {
  return rms > 0.02;
}

//===============================================
// Keep RMS History
//===============================================

function pushHistory(value) {
  rmsHistory.push(value);

  if (rmsHistory.length > MAX_HISTORY) {
    rmsHistory.shift();
  }
}

//===============================================
// Average RMS
//===============================================

function averageLevel() {
  if (rmsHistory.length === 0) return 0;

  let total = 0;

  for (const value of rmsHistory) {
    total += value;
  }

  return total / rmsHistory.length;
}

/*==================================================
    PART 3B2A
    Waveform Rendering & VU Meter
==================================================*/

//===============================================
// Waveform History
//===============================================

const waveformHistory = [];

const MAX_POINTS = 260;

//===============================================
// Peak Meter
//===============================================

let peakLevel = 0;

let peakDecay = 0.98;

//===============================================
// Theme
//===============================================

const WaveTheme = {
  background: "#08111d",

  center: "rgba(59,130,246,.15)",

  waveform: "#3b82f6",

  glow: "rgba(59,130,246,.35)",

  peak: "#ef4444",
};

//===============================================
// Clear Canvas
//===============================================

function clearCanvas() {
  const w = canvas.clientWidth;

  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);
}

//===============================================
// Draw Background
//===============================================

function drawBackground() {
  const w = canvas.clientWidth;

  const h = canvas.clientHeight;

  ctx.fillStyle = WaveTheme.background;

  ctx.fillRect(0, 0, w, h);
}

//===============================================
// Draw Grid
//===============================================

function drawGridLines() {
  const w = canvas.clientWidth;

  const h = canvas.clientHeight;

  const spacing = 30;

  ctx.strokeStyle = "rgba(255,255,255,.04)";

  ctx.lineWidth = 1;

  for (let x = 0; x <= w; x += spacing) {
    ctx.beginPath();

    ctx.moveTo(x, 0);

    ctx.lineTo(x, h);

    ctx.stroke();
  }

  for (let y = 0; y <= h; y += spacing) {
    ctx.beginPath();

    ctx.moveTo(0, y);

    ctx.lineTo(w, y);

    ctx.stroke();
  }
}

//===============================================
// Center Line
//===============================================

function drawCenterLine() {
  const w = canvas.clientWidth;

  const h = canvas.clientHeight;

  ctx.beginPath();

  ctx.moveTo(0, h / 2);

  ctx.lineTo(w, h / 2);

  ctx.lineWidth = 2;

  ctx.strokeStyle = WaveTheme.center;

  ctx.stroke();
}

//===============================================
// Push Waveform Sample
//===============================================

function pushWaveSample(level) {
  waveformHistory.push(level);

  if (waveformHistory.length > MAX_POINTS) {
    waveformHistory.shift();
  }
}

//===============================================
// Draw Waveform
//===============================================

function drawWaveformHistory() {
  const w = canvas.clientWidth;

  const h = canvas.clientHeight;

  const center = h / 2;

  const spacing = w / MAX_POINTS;

  ctx.beginPath();

  ctx.lineWidth = 2.5;

  ctx.strokeStyle = WaveTheme.waveform;

  ctx.shadowBlur = 18;

  ctx.shadowColor = WaveTheme.glow;

  waveformHistory.forEach((value, index) => {
    const x = index * spacing;

    const padding = 20;

    const maxWaveHeight = h / 2 - padding;

    const scaledValue = Math.min(value, maxWaveHeight);

    const y = center - scaledValue;

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.shadowBlur = 0;
}

//===============================================
// Peak Hold
//===============================================

function updatePeak(level) {
  if (level > peakLevel) {
    peakLevel = level;
  } else {
    peakLevel *= peakDecay;
  }
}

//===============================================
// Draw Peak Marker
//===============================================

function drawPeakMarker() {
  const h = canvas.clientHeight;

  const center = h / 2;

  ctx.beginPath();

  ctx.moveTo(0, center - peakLevel);

  ctx.lineTo(canvas.clientWidth, center - peakLevel);

  ctx.lineWidth = 1;

  ctx.strokeStyle = WaveTheme.peak;

  ctx.stroke();
}

//===============================================
// Draw VU Meter
//===============================================

function drawMeter(level) {
  const percent = Math.min(
    100,

    Math.max(
      0,

      level,
    ),
  );

  levelBar.style.width = percent + "%";

  dbLevel.textContent = Math.round(percent) + "%";
}

//===============================================
// Smooth Level
//===============================================

let smoothLevel = 0;

function smoothMeter(level) {
  smoothLevel += (level - smoothLevel) * 0.18;

  drawMeter(smoothLevel);
}

/*==================================================
    PART 3B2B
    Live Visualizer Engine
==================================================*/

//===============================================
// Render Frame
//===============================================

function renderVisualizer() {
  if (!App.analyser) return;

  App.animationFrame = requestAnimationFrame(renderVisualizer);

  // Get live waveform data

  App.analyser.getByteTimeDomainData(waveformBuffer);

  //===========================================
  // Calculate RMS
  //===========================================

  const rms = calculateRMS(waveformBuffer);

  pushHistory(rms);

  const level = normalizeLevel(rms);

  smoothMeter(level);

  updatePeak(level);

  //===========================================
  // Calculate waveform amplitude
  //===========================================

  let amplitude = 0;

  for (let i = 0; i < waveformBuffer.length; i++) {
    const sample = Math.abs(waveformBuffer[i] - 128);

    if (sample > amplitude) amplitude = sample;
  }

  const canvasHeight = canvas.clientHeight;

  // Leave 20px padding at the top and bottom
  const maxAmplitude = canvasHeight / 2 - 20;

  // Scale the analyser output
  amplitude *= 1.35;

  // Prevent clipping
  amplitude = Math.min(amplitude, maxAmplitude);

  pushWaveSample(amplitude);

  //===========================================
  // Draw Scene
  //===========================================

  clearCanvas();

  drawBackground();

  drawGridLines();

  drawCenterLine();

  drawWaveformHistory();

  drawPeakMarker();

  drawVoiceGlow(level);
}

//===============================================
// Voice Glow
//===============================================

function drawVoiceGlow(level) {
  const w = canvas.clientWidth;

  const h = canvas.clientHeight;

  const radius = 120 + level * 1.8;

  const gradient = ctx.createRadialGradient(
    w / 2,

    h / 2,

    0,

    w / 2,

    h / 2,

    radius,
  );

  gradient.addColorStop(
    0,

    `rgba(59,130,246,${level / 900})`,
  );

  gradient.addColorStop(
    1,

    "rgba(59,130,246,0)",
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    0,

    0,

    w,

    h,
  );
}

//===============================================
// Reset Visualizer
//===============================================

function resetVisualizer() {
  waveformHistory.length = 0;

  rmsHistory.length = 0;

  peakLevel = 0;

  smoothLevel = 0;

  resetMeter();

  clearCanvas();

  drawBackground();

  drawGridLines();

  drawCenterLine();
}

//===============================================
// Start Visualizer
//===============================================

function startVisualizer() {
  resetVisualizer();

  renderVisualizer();
}

//===============================================
// Stop Visualizer
//===============================================

function stopVisualizer() {
  if (App.animationFrame) {
    cancelAnimationFrame(App.animationFrame);

    App.animationFrame = null;
  }

  resetVisualizer();
}

//===============================================
// Animation Visibility
//===============================================

document.addEventListener(
  "visibilitychange",

  () => {
    if (document.hidden && App.animationFrame) {
      cancelAnimationFrame(App.animationFrame);
    } else if (!document.hidden && App.recording && App.analyser) {
      renderVisualizer();
    }
  },
);

//===============================================
// Idle Screen
//===============================================

resetVisualizer();

/*==================================================
    PART 3C1
    Recording Engine
==================================================*/

//===============================================
// Recording Configuration
//===============================================

const RECORDING_OPTIONS = {
  mimeTypes: ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""],
};

//===============================================
// Get Best Supported Mime Type
//===============================================

function getSupportedMimeType() {
  for (const type of RECORDING_OPTIONS.mimeTypes) {
    if (type === "") return "";

    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

//===============================================
// Build Audio Constraints
//===============================================

function buildAudioConstraints() {
  const constraints = {
    noiseSuppression: true,

    echoCancellation: true,

    autoGainControl: true,

    channelCount: 1,

    sampleRate: AUDIO_CONFIG.sampleRate,
  };

  if (microphoneSelect.value) {
    constraints.deviceId = {
      exact: microphoneSelect.value,
    };
  }

  return {
    audio: constraints,
  };
}

//===============================================
// Create Recorder
//===============================================

function createRecorder(stream) {
  const mimeType = getSupportedMimeType();

  if (mimeType) {
    App.recorder = new MediaRecorder(
      stream,

      {
        mimeType,
      },
    );
  } else {
    App.recorder = new MediaRecorder(stream);
  }
}

//===============================================
// Start Recording Timer
//===============================================

function startRecordingTimer() {
  clearInterval(App.timer);

  App.seconds = 0;

  timerText.textContent = "00:00";

  App.timer = setInterval(() => {
    updateTimer();
  }, 1000);
}

//===============================================
// Stop Recording Timer
//===============================================

function stopRecordingTimer() {
  clearInterval(App.timer);

  App.timer = null;
}

//===============================================
// Start Recording
//===============================================

async function startRecording() {
  if (App.recording) return;

  try {
    recordBtn.disabled = true;

    hidePreview();

    revokeAudioURL();

    App.chunks = [];

    App.stream = await navigator.mediaDevices.getUserMedia(
      buildAudioConstraints(),
    );

    await createAudioEngine(App.stream);

    if (App.audioContext.state === "suspended") {
      await App.audioContext.resume();
    }

    createRecorder(App.stream);
    attachRecorderEvents();

    //=======================================
    // MediaRecorder Events
    //=======================================

    App.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        App.chunks.push(event.data);
      }
    };

    App.recorder.onerror = (event) => {
      console.error(
        "Recorder Error:",

        event.error,
      );

      setStatus(
        "Recording Error",

        "#ef4444",
      );
    };

    //=======================================
    // Begin Recording
    //=======================================

    App.recorder.start(100);

    App.recording = true;

    enableRecordingUI();

    startVisualizer();

    startRecordingTimer();

    setStatus(
      "Recording",

      "#ef4444",
    );

    recordBtn.innerHTML = `

            <i class="bi bi-stop-circle-fill"></i>

            <span>

                Stop Recording

            </span>

        `;
  } catch (error) {
    console.error(error);

    recordBtn.disabled = false;

    let message = "Unable to start recording";

    if (error.name === "NotAllowedError") {
      message = "Microphone permission denied";
    } else if (error.name === "NotFoundError") {
      message = "No microphone detected";
    } else if (error.name === "NotReadableError") {
      message = "Microphone already in use";
    }

    setStatus(
      message,

      "#ef4444",
    );
  } finally {
    recordBtn.disabled = false;
  }
}

/*==================================================
    PART 3C2
    Stop Recording, Preview & Cleanup
==================================================*/

//===============================================
// Stop Recording
//===============================================

async function stopRecording() {
  if (!App.recording) return;

  recordBtn.disabled = true;

  try {
    App.recording = false;

    stopRecordingTimer();

    stopVisualizer();

    setStatus(
      "Processing...",

      "#f59e0b",
    );

    if (App.recorder && App.recorder.state !== "inactive") {
      App.recorder.stop();
    }
  } catch (error) {
    console.error(error);

    cleanupRecording();
  }
}

//===============================================
// Recorder Finished
//===============================================

AppFinishRecording = async () => {
  try {
    // Stop Microphone

    if (App.stream) {
      App.stream

        .getTracks()

        .forEach((track) => track.stop());
    }

    // Destroy Audio Engine

    await destroyAudioEngine();

    // Create Blob

    const mimeType = App.recorder.mimeType || "audio/webm";

    const blob = new Blob(
      App.chunks,

      {
        type: mimeType,
      },
    );

    revokeAudioURL();

    App.audioURL = URL.createObjectURL(blob);

    audioPlayer.src = App.audioURL;

    audioPlayer.load();

    showPreview();

    setStatus(
      "Recording Complete",

      "#22c55e",
    );

    recordBtn.innerHTML = `

            <i class="bi bi-record-circle-fill"></i>

            <span>

                Record Again

            </span>

        `;

    disableRecordingUI();
  } catch (error) {
    console.error(error);

    setStatus(
      "Preview Failed",

      "#ef4444",
    );
  } finally {
    recordBtn.disabled = false;
  }
};

//===============================================
// Cleanup
//===============================================

function cleanupRecording() {
  stopRecordingTimer();

  stopVisualizer();

  if (App.stream) {
    App.stream

      .getTracks()

      .forEach((track) => track.stop());
  }

  destroyAudioEngine();

  App.stream = null;

  App.recorder = null;

  App.chunks = [];

  disableRecordingUI();
}

//===============================================
// Download Recording
//===============================================

function downloadRecording() {
  if (!App.audioURL) return;

  const now = new Date();

  const filename = `Recording_${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(
    now.getHours(),
  ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(
    now.getSeconds(),
  ).padStart(2, "0")}.webm`;

  const link = document.createElement("a");

  link.href = App.audioURL;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
}

//===============================================
// Retake Recording
//===============================================

function retakeRecording() {
  revokeAudioURL();

  audioPlayer.removeAttribute("src");

  audioPlayer.load();

  App.chunks = [];

  hidePreview();

  resetTimer();

  resetVisualizer();

  setStatus(
    "Ready",

    "#22c55e",
  );

  recordBtn.innerHTML = `

        <i class="bi bi-record-circle-fill"></i>

        <span>

            Start Recording

        </span>

    `;
}

//===============================================
// Button Events
//===============================================

recordBtn.addEventListener(
  "click",

  () => {
    if (App.recording) stopRecording();
    else startRecording();
  },
);

downloadBtn.addEventListener(
  "click",

  downloadRecording,
);

retakeBtn.addEventListener(
  "click",

  retakeRecording,
);

//===============================================
// Recorder Events
//===============================================

function attachRecorderEvents() {
  App.recorder.onstop = AppFinishRecording;
}

//===============================================
// Update startRecording()
//===============================================
//
// Inside startRecording(),
// immediately after:
//
// createRecorder(App.stream);
//
// ADD THIS:
//
// attachRecorderEvents();
//
//===============================================

//===============================================
// Cleanup On Exit
//===============================================

window.addEventListener(
  "beforeunload",

  () => {
    cleanupRecording();

    revokeAudioURL();
  },
);

/*==================================================
    PART 3D
    Professional Enhancements
==================================================*/

//===============================================
// Recording Statistics
//===============================================

const RecordingStats = {
  startedAt: null,

  finishedAt: null,

  duration: 0,

  fileSize: 0,

  mimeType: "",
};

//===============================================
// Toast Notification
//===============================================

function toast(message, icon = "info-circle") {
  const toast = document.createElement("div");

  toast.className =
    "fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-white px-5 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-toast";

  toast.innerHTML = `
        <i class="bi bi-${icon} text-blue-400"></i>
        <span>${message}</span>
    `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";

    toast.style.transform = "translateY(20px)";

    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 3000);
}

//===============================================
// Update Statistics
//===============================================

function updateRecordingStats(blob) {
  RecordingStats.finishedAt = new Date();

  RecordingStats.duration = App.seconds;

  RecordingStats.fileSize = blob.size;

  RecordingStats.mimeType = blob.type;

  console.table({
    Duration: RecordingStats.duration + " sec",

    Size: (blob.size / 1024).toFixed(2) + " KB",

    Type: blob.type,
  });
}

//===============================================
// Keyboard Shortcuts
//===============================================

document.addEventListener("keydown", (e) => {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.tagName === "SELECT"
  )
    return;

  switch (e.code) {
    case "Space":
      e.preventDefault();

      if (App.recording) stopRecording();
      else startRecording();

      break;

    case "KeyR":
      retakeRecording();

      break;

    case "KeyD":
      downloadRecording();

      break;
  }
});

//===============================================
// Drag & Drop Import
//===============================================

document.addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();

  const file = e.dataTransfer.files[0];

  if (!file) return;

  if (!file.type.startsWith("audio/")) {
    toast(
      "Only audio files are supported",

      "x-circle",
    );

    return;
  }

  revokeAudioURL();

  App.audioURL = URL.createObjectURL(file);

  audioPlayer.src = App.audioURL;

  showPreview();

  toast(
    "Audio loaded successfully",

    "music-note",
  );
});

//===============================================
// Audio Metadata
//===============================================

audioPlayer.addEventListener(
  "loadedmetadata",

  () => {
    console.log(
      "Duration:",

      audioPlayer.duration,
    );
  },
);

//===============================================
// Recording Completed
//===============================================

const originalFinish = AppFinishRecording;

AppFinishRecording = async () => {
  await originalFinish();

  const response = await fetch(App.audioURL);

  const blob = await response.blob();

  updateRecordingStats(blob);

  toast(
    "Recording completed successfully",

    "check-circle-fill",
  );
};

//===============================================
// Monitor Microphone Changes
//===============================================

microphoneSelect.addEventListener(
  "change",

  () => {
    if (!App.recording) {
      toast(
        "Microphone changed",

        "mic-fill",
      );

      return;
    }

    toast(
      "Microphone will change after recording ends",

      "exclamation-circle",
    );
  },
);

//===============================================
// Pause When Hidden
//===============================================

document.addEventListener(
  "visibilitychange",

  () => {
    if (document.hidden && App.recording) {
      console.log("Tab hidden");
    }
  },
);

//===============================================
// Auto Cleanup
//===============================================

window.addEventListener(
  "pagehide",

  () => {
    cleanupRecording();

    revokeAudioURL();
  },
);

//===============================================
// Welcome
//===============================================

window.addEventListener(
  "load",

  () => {
    toast(
      "Studio Recorder Ready",

      "mic-fill",
    );
  },
);
