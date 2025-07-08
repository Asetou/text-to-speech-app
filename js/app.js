let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let voices = [];
let currentText = "";
let isPaused = false;
const recordBtn = document.getElementById("recordBtn");
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Elements
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const textInput = document.getElementById("textInput");
const loadTextBtn = document.getElementById("loadTextBtn");
const textPreview = document.getElementById("textPreview");
const voiceSelect = document.getElementById("voiceSelect");
const rateSlider = document.getElementById("rateSlider");
const rateValue = document.getElementById("rateValue");
const pitchSlider = document.getElementById("pitchSlider");
const pitchValue = document.getElementById("pitchValue");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const speakBtn = document.getElementById("speakBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const downloadBtn = document.getElementById("downloadBtn");
const status = document.getElementById("status");
const tabBtns = document.querySelectorAll(".tab-btn");
const pasteTab = document.getElementById("pasteTab");
const fileTab = document.getElementById("fileTab");
const emotionSelect = document.getElementById("emotionSelect");
const emphasisSlider = document.getElementById("emphasisSlider");
const emphasisValue = document.getElementById("emphasisValue");
const pausesCheck = document.getElementById("pausesCheck");

// Emotion presets
const emotionPresets = {
  neutral: { rate: 1, pitch: 1, emphasis: 1 },
  happy: { rate: 1.1, pitch: 1.2, emphasis: 1.3 },
  sad: { rate: 0.85, pitch: 0.9, emphasis: 0.8 },
  excited: { rate: 1.3, pitch: 1.3, emphasis: 1.4 },
  calm: { rate: 0.9, pitch: 0.95, emphasis: 0.9 },
  serious: { rate: 0.95, pitch: 0.85, emphasis: 1.1 },
  storytelling: { rate: 1, pitch: 1.05, emphasis: 1.2 },
};

// Update emphasis slider value display
emphasisSlider.addEventListener("input", (e) => {
  emphasisValue.textContent = e.target.value;
});

// Apply emotion preset
emotionSelect.addEventListener("change", (e) => {
  const emotion = e.target.value;
  const preset = emotionPresets[emotion];

  if (preset) {
    rateSlider.value = preset.rate;
    rateValue.textContent = preset.rate;
    pitchSlider.value = preset.pitch;
    pitchValue.textContent = preset.pitch;
    emphasisSlider.value = preset.emphasis;
    emphasisValue.textContent = preset.emphasis;
  }
});

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.getAttribute("data-tab");

    // Update active tab button
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Show/hide tab content
    if (tabName === "paste") {
      pasteTab.style.display = "block";
      fileTab.style.display = "none";
    } else {
      pasteTab.style.display = "none";
      fileTab.style.display = "block";
    }
  });
});

// Load text from textarea
loadTextBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (text) {
    currentText = text;
    textPreview.textContent = currentText;
    speakBtn.disabled = false;
    downloadBtn.disabled = false;
    recordBtn.disabled = false;
    showStatus("Text loaded successfully!", "success");
  } else {
    showStatus("Please enter some text first", "error");
  }
});

// Enable/disable load button based on textarea content
textInput.addEventListener("input", () => {
  loadTextBtn.disabled = textInput.value.trim() === "";
});

// Load available voices with filtering for natural voices
function loadVoices() {
  voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";

  // Sort voices to prioritize natural/enhanced ones
  const sortedVoices = voices.sort((a, b) => {
    const aIsNatural = /natural|enhanced|neural|premium/i.test(a.name);
    const bIsNatural = /natural|enhanced|neural|premium/i.test(b.name);

    if (aIsNatural && !bIsNatural) return -1;
    if (!aIsNatural && bIsNatural) return 1;
    return a.name.localeCompare(b.name);
  });

  sortedVoices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = voices.indexOf(voice);
    const isNatural = /natural|enhanced|neural|premium/i.test(voice.name);
    option.textContent = `${voice.name} (${voice.lang})${
      isNatural ? " ⭐" : ""
    }`;
    if (voice.default) {
      option.selected = true;
    }
    voiceSelect.appendChild(option);
  });
}

// Load voices when they're ready
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

// File input handler
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file && file.type === "text/plain") {
    fileName.textContent = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
      currentText = e.target.result;
      textPreview.textContent = currentText;
      speakBtn.disabled = false;
      downloadBtn.disabled = false;
      recordBtn.disabled = false;
      showStatus("File loaded successfully!", "success");
    };

    reader.onerror = () => {
      showStatus("Error reading file!", "error");
    };

    reader.readAsText(file);
  } else {
    showStatus("Please select a valid text file (.txt)", "error");
  }
});

// Update slider values
rateSlider.addEventListener("input", (e) => {
  rateValue.textContent = e.target.value;
});

pitchSlider.addEventListener("input", (e) => {
  pitchValue.textContent = e.target.value;
});

volumeSlider.addEventListener("input", (e) => {
  volumeValue.textContent = e.target.value;
});

// Speak button handler
speakBtn.addEventListener("click", () => {
  if (currentText) {
    speak(currentText);
  }
});

// Pause/Resume button handler
pauseBtn.addEventListener("click", () => {
  if (speechSynthesis.speaking) {
    if (isPaused) {
      speechSynthesis.resume();
      isPaused = false;
      pauseBtn.textContent = "Pause";
    } else {
      speechSynthesis.pause();
      isPaused = true;
      pauseBtn.textContent = "Resume";
    }
  }
});

// Stop button handler
stopBtn.addEventListener("click", () => {
  if (window.stopSpeaking) {
    window.stopSpeaking();
  }
  speechSynthesis.cancel();
  resetControls();
});

// Record button handler
recordBtn.addEventListener("click", async () => {
  if (currentText) {
    if (!isRecording) {
      showRecordingOptions();
    } else {
      // If already recording, stop it
      stopRecording();
    }
  }
});

// Show recording options
function showRecordingOptions() {
  const modal = document.createElement("div");
  modal.id = "recordingModal";
  modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 1000;
                max-width: 600px;
            `;

  modal.innerHTML = `
                <h3 style="margin-top: 0; color: #dc3545;">Browser Recording Limitation</h3>
                <p><strong>Important:</strong> Web browsers cannot directly record system audio (the speech output) due to security restrictions. They can only access microphone input.</p>
                
                <div style="margin: 20px 0;">
                    <h4>Recommended Solutions:</h4>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <h5 style="margin-top: 0;">1. Screen Recording Software (Best Option)</h5>
                        <p>Use software that can capture system audio:</p>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li><strong>Windows:</strong> OBS Studio (free), Bandicam, or Windows Game Bar (Win+G)</li>
                            <li><strong>Mac:</strong> OBS Studio (free), QuickTime Player, or ScreenFlow</li>
                            <li><strong>Linux:</strong> OBS Studio (free) or SimpleScreenRecorder</li>
                        </ul>
                        <p style="margin-bottom: 0;"><small>Just record the audio while using the "Speak" button normally.</small></p>
                    </div>
                    
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <h5 style="margin-top: 0;">2. Browser Extensions</h5>
                        <p>Some extensions can capture tab audio:</p>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li><strong>Chrome:</strong> Chrome Audio Capture, AudioRecorder</li>
                            <li><strong>Firefox:</strong> AudioRecorder extensions</li>
                        </ul>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <h5 style="margin-top: 0;">3. Microphone Loopback (Advanced)</h5>
                        <p>Route system audio to virtual microphone:</p>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li><strong>Windows:</strong> VB-Audio Virtual Cable</li>
                            <li><strong>Mac:</strong> Soundflower or BlackHole</li>
                        </ul>
                        <p style="margin-bottom: 0;"><small>Then select the virtual mic in browser permissions.</small></p>
                    </div>
                    
                    <h4>Why Direct Recording Doesn't Work:</h4>
                    <p style="color: #666;">Browser security policies prevent web pages from accessing system audio to protect user privacy. This is why we can only record from microphones.</p>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="closeRecordModal" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Close</button>
                    <button id="tryMicRecording" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Try Mic Recording Anyway</button>
                </div>
            `;

  document.body.appendChild(modal);

  // Add backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "recordModalBackdrop";
  backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 999;
            `;
  document.body.appendChild(backdrop);

  // Close handlers
  document.getElementById("closeRecordModal").onclick = () => {
    modal.remove();
    backdrop.remove();
  };

  backdrop.onclick = () => {
    modal.remove();
    backdrop.remove();
  };

  // Try mic recording anyway
  document.getElementById("tryMicRecording").onclick = () => {
    modal.remove();
    backdrop.remove();
    startMicRecording();
  };
}

// Start microphone recording (renamed from startRecording)
async function startMicRecording() {
  if (isRecording) {
    // If already recording, stop it
    stopRecording();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    showStatus(
      "Recording from microphone. Note: This will NOT capture the speech output!",
      "warning"
    );

    // Try to use MP3 if supported, otherwise fall back to webm
    const mimeTypes = ["audio/mp3", "audio/mpeg", "audio/webm", "audio/ogg"];

    let selectedMimeType = "audio/webm"; // default
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
    });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: selectedMimeType });

      // Determine file extension based on mime type
      let extension = "webm";
      if (
        selectedMimeType.includes("mp3") ||
        selectedMimeType.includes("mpeg")
      ) {
        extension = "mp3";
      } else if (selectedMimeType.includes("ogg")) {
        extension = "ogg";
      }

      // Show conversion options if not MP3
      if (extension !== "mp3") {
        showConversionOptions(audioBlob, extension);
      } else {
        // Direct download if already MP3
        downloadAudio(audioBlob, extension);
      }

      // Stop all tracks
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    recordBtn.textContent = "⏹️ Stop Recording";
    recordBtn.classList.add("recording");

    // Start speaking
    speak(currentText);
  } catch (error) {
    showStatus("Error accessing microphone: " + error.message, "error");
  }
}

// Stop recording function
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.textContent = "Record & Speak";
    recordBtn.classList.remove("recording");
    speechSynthesis.cancel();
    resetControls();
  }
}

// Download audio function
function downloadAudio(blob, extension) {
  const audioUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = audioUrl;
  a.download = `speech_recording_${Date.now()}.${extension}`;
  a.click();
  URL.revokeObjectURL(audioUrl);
  showStatus("Audio file downloaded!", "success");
}

// Show conversion options
function showConversionOptions(audioBlob, currentFormat) {
  const modal = document.createElement("div");
  modal.id = "conversionModal";
  modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 1000;
                max-width: 500px;
            `;

  modal.innerHTML = `
                <h3 style="margin-top: 0;">Audio Format Options</h3>
                <p>Your recording was saved in ${currentFormat.toUpperCase()} format. Most browsers don't support direct MP3 recording.</p>
                
                <div style="margin: 20px 0;">
                    <h4>Option 1: Download as ${currentFormat.toUpperCase()}</h4>
                    <p>Use the recording as-is. Most media players support this format.</p>
                    <button id="downloadAsIs" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px 0;">Download ${currentFormat.toUpperCase()}</button>
                    
                    <h4>Option 2: Convert to MP3 (Client-side)</h4>
                    <p>Convert to MP3 directly in your browser (experimental).</p>
                    <button id="convertToMp3" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px 0;">Convert to MP3</button>
                    <div id="conversionStatus" style="margin-top: 10px; color: #666;"></div>
                    
                    <h4>Option 3: Online Converters</h4>
                    <p>Use these free online converters:</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li><a href="https://cloudconvert.com/webm-to-mp3" target="_blank">CloudConvert</a></li>
                        <li><a href="https://convertio.co/webm-mp3/" target="_blank">Convertio</a></li>
                        <li><a href="https://www.zamzar.com/convert/webm-to-mp3/" target="_blank">Zamzar</a></li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="closeModal" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
            `;

  document.body.appendChild(modal);

  // Add backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "modalBackdrop";
  backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 999;
            `;
  document.body.appendChild(backdrop);

  // Close button handler
  document.getElementById("closeModal").onclick = () => {
    modal.remove();
    backdrop.remove();
  };

  // Backdrop click handler
  backdrop.onclick = () => {
    modal.remove();
    backdrop.remove();
  };

  // Download button handler
  document.getElementById("downloadAsIs").onclick = () => {
    downloadAudio(audioBlob, currentFormat);
    modal.remove();
    backdrop.remove();
  };

  // Convert to MP3 button handler
  document.getElementById("convertToMp3").onclick = async () => {
    const statusDiv = document.getElementById("conversionStatus");
    statusDiv.textContent = "Converting to MP3... This may take a moment.";

    try {
      // Convert WebM/OGG to WAV first (as intermediate format)
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create WAV from audio buffer
      const wavBlob = await audioBufferToWav(audioBuffer);

      // For true MP3, we'd need a library like lamejs
      // Since we can't import external libraries, we'll save as WAV
      // WAV is universally supported and can be easily converted to MP3

      statusDiv.innerHTML =
        "Conversion complete! Downloading as WAV format.<br><small>For true MP3, use an audio editor or online converter.</small>";

      const audioUrl = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = `speech_recording_${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(audioUrl);

      setTimeout(() => {
        modal.remove();
        backdrop.remove();
      }, 2000);
    } catch (error) {
      statusDiv.textContent = "Error converting audio: " + error.message;
      statusDiv.style.color = "#dc3545";
    }
  };
}

// Convert AudioBuffer to WAV format
function audioBufferToWav(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const data = [];
  for (let channel = 0; channel < numberOfChannels; channel++) {
    data.push(audioBuffer.getChannelData(channel));
  }

  const length = data[0].length;
  const arrayBuffer = new ArrayBuffer(44 + length * blockAlign);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * blockAlign, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, length * blockAlign, true);

  // Convert float samples to PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      let sample = data[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

// Process text for more natural speech by splitting at punctuation
function splitTextForNaturalSpeech(text) {
  if (!pausesCheck.checked) {
    // If natural pauses are disabled, return as single chunk
    return [text];
  }

  // Split text at punctuation marks while keeping the punctuation
  const chunks = text.match(/[^.!?;:,\n]+[.!?;:,\n]*/g) || [text];

  // Clean up chunks and determine pause duration
  return chunks
    .map((chunk) => {
      const trimmed = chunk.trim();
      let pauseAfter = 0;

      if (
        trimmed.endsWith(".") ||
        trimmed.endsWith("!") ||
        trimmed.endsWith("?")
      ) {
        pauseAfter = 400; // Longer pause after sentences
      } else if (
        trimmed.endsWith(",") ||
        trimmed.endsWith(";") ||
        trimmed.endsWith(":")
      ) {
        pauseAfter = 200; // Shorter pause after clauses
      } else if (trimmed === "") {
        pauseAfter = 600; // Paragraph break
      }

      return { text: trimmed, pauseAfter };
    })
    .filter((chunk) => chunk.text.length > 0);
}

// Text-to-speech function with emotion and natural speech
function speak(text) {
  speechSynthesis.cancel();

  // Split text into chunks with pause information
  const chunks = splitTextForNaturalSpeech(text);
  const emphasis = parseFloat(emphasisSlider.value);

  let currentIndex = 0;
  let isStopped = false;

  function speakNextChunk() {
    if (isStopped || currentIndex >= chunks.length) {
      if (!isStopped) {
        resetControls();
        showStatus("Finished speaking!", "success");
      }
      return;
    }

    const { text: chunkText, pauseAfter } = chunks[currentIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    utterance.voice = voices[voiceSelect.value];

    // Apply base settings with emphasis variation
    const baseRate = parseFloat(rateSlider.value);
    const basePitch = parseFloat(pitchSlider.value);

    // Add slight variation for more natural speech
    const variation = (Math.random() - 0.5) * 0.1 * emphasis;
    utterance.rate = baseRate + baseRate * variation;
    utterance.pitch = basePitch + basePitch * variation;
    utterance.volume = parseFloat(volumeSlider.value);

    // Special handling for questions (higher pitch at end)
    if (chunkText.trim().endsWith("?")) {
      utterance.pitch = basePitch * 1.1;
    }

    // Special handling for exclamations (more emphasis)
    if (chunkText.trim().endsWith("!")) {
      utterance.volume = Math.min(1, utterance.volume * 1.2);
      utterance.rate = baseRate * 0.95;
    }

    utterance.onend = () => {
      currentIndex++;
      // Add natural pause if specified
      if (pauseAfter > 0 && !isStopped) {
        setTimeout(speakNextChunk, pauseAfter);
      } else {
        speakNextChunk();
      }
    };

    utterance.onerror = (e) => {
      isStopped = true;
      resetControls();
      showStatus("Error: " + e.error, "error");
    };

    if (currentIndex === 0) {
      utterance.onstart = () => {
        speakBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        showStatus(
          "Speaking with " + emotionSelect.value + " emotion...",
          "info"
        );
      };
    }

    // Store reference to stop function
    window.stopSpeaking = () => {
      isStopped = true;
      speechSynthesis.cancel();
    };

    speechSynthesis.speak(utterance);
  }

  speakNextChunk();
}

// Download button handler - now provides better options
downloadBtn.addEventListener("click", () => {
  if (currentText) {
    const modal = document.createElement("div");
    modal.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    z-index: 1000;
                    max-width: 500px;
                `;

    modal.innerHTML = `
                    <h3 style="margin-top: 0;">Audio Download Options</h3>
                    <p>The Web Speech API doesn't directly provide audio files. Here are your options:</p>
                    
                    <div style="margin: 20px 0;">
                        <h4>Option 1: Use the Record Button</h4>
                        <p>Click the "Record & Speak" button to record while the text is being spoken.</p>
                        
                        <h4>Option 2: Use Screen Recording</h4>
                        <p>Use screen recording software (like OBS Studio) to capture system audio.</p>
                        
                        <h4>Option 3: Use a TTS API Service</h4>
                        <p>For professional use, integrate with services like:</p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>ElevenLabs - Most realistic voices</li>
                            <li>Google Cloud Text-to-Speech</li>
                            <li>Amazon Polly</li>
                            <li>Microsoft Azure Speech</li>
                        </ul>
                        
                        <h4>Option 4: Export Settings</h4>
                        <p>Export your text and settings to use with external tools.</p>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Close</button>
                        <button onclick="exportTTSSettings()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Export Settings</button>
                    </div>
                `;

    document.body.appendChild(modal);

    // Add backdrop
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                `;
    backdrop.onclick = () => {
      modal.remove();
      backdrop.remove();
    };
    document.body.appendChild(backdrop);
  }
});

// Export TTS settings function
window.exportTTSSettings = function () {
  const ttsData = {
    text: currentText,
    settings: {
      voice: voices[voiceSelect.value]?.name || "default",
      language: voices[voiceSelect.value]?.lang || "en-US",
      rate: parseFloat(rateSlider.value),
      pitch: parseFloat(pitchSlider.value),
      volume: parseFloat(volumeSlider.value),
      emotion: emotionSelect.value,
      emphasis: parseFloat(emphasisSlider.value),
      naturalPauses: pausesCheck.checked,
    },
    timestamp: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(ttsData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tts_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Close modal
  document.querySelectorAll("div").forEach((div) => {
    if (div.style.position === "fixed" && div.style.zIndex >= 999) {
      div.remove();
    }
  });

  showStatus("Settings exported successfully!", "success");
};

// Reset controls
function resetControls() {
  speakBtn.disabled = !currentText;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;
  recordBtn.disabled = !currentText;
  pauseBtn.textContent = "Pause";
  isPaused = false;
}

// Show status message
function showStatus(message, type) {
  status.textContent = message;
  status.className = "status " + type;
  status.style.display = "block";

  setTimeout(() => {
    status.style.display = "none";
  }, 3000);
}
