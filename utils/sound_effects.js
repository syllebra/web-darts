// Sound Effects System
class SoundEffects {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.3;
    this.masterGain = null;
    this.audioContext = null;
    this.initAudio();
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
      console.log("Audio initialized successfully");
    } catch (error) {
      console.log("Audio not supported:", error);
    }
  }

  // Resume audio context (required for user interaction)
  resumeContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  // Create a simple tone
  createTone(frequency, duration, type = "sine", volume = null) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    const vol = volume !== null ? volume : this.volume;
    gainNode.gain.setValueAtTime(vol, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Dart hit sound
  playDartHit() {
    this.resumeContext();
    // Quick thud sound
    this.createTone(150, 0.1, "square", 0.2);
    setTimeout(() => this.createTone(100, 0.05, "square", 0.1), 50);
  }

  // Number closing sound
  playNumberClose() {
    this.resumeContext();
    // Ascending chime
    this.createTone(523, 0.2, "sine", 0.3); // C5
    setTimeout(() => this.createTone(659, 0.2, "sine", 0.3), 100); // E5
    setTimeout(() => this.createTone(784, 0.3, "sine", 0.3), 200); // G5
  }

  // Score sound
  playScore() {
    this.resumeContext();
    // Pleasant ding
    this.createTone(800, 0.3, "sine", 0.25);
    setTimeout(() => this.createTone(1000, 0.2, "sine", 0.2), 150);
  }

  // Turn change sound
  playTurnChange() {
    this.resumeContext();
    // Soft transition sound
    this.createTone(400, 0.15, "triangle", 0.2);
    setTimeout(() => this.createTone(500, 0.15, "triangle", 0.2), 100);
  }

  // Button click sound
  playButtonClick() {
    this.resumeContext();
    // Quick click
    this.createTone(600, 0.08, "square", 0.15);
  }

  // Game reset sound
  playGameReset() {
    this.resumeContext();
    // Descending scale
    const notes = [784, 659, 523, 440]; // G5, E5, C5, A4
    notes.forEach((note, index) => {
      setTimeout(() => this.createTone(note, 0.2, "sine", 0.2), index * 100);
    });
  }

  // Toggle sound on/off
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Set volume (0-1)
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().then(() => {
        console.log("Audio context resumed");
      });
    }
  }

  createReverb() {
    const convolver = this.audioContext.createConvolver();
    const length = this.audioContext.sampleRate * 4; // Longer reverb
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Create a sharp, metallic reverb impulse
        const decay = Math.pow(1 - i / length, 0.3); // Slower decay for longer reverb
        const noise = (Math.random() * 2 - 1) * decay;
        const early = Math.exp(-i / (this.audioContext.sampleRate * 0.1)) * Math.sin(i * 0.01);
        channelData[i] = (noise * 0.7 + early * 0.3) * decay;
      }
    }
    convolver.buffer = impulse;
    return convolver;
  }

  playModernSound(type, params = {}) {
    if (!this.audioContext) {
      console.log("Audio context not available");
      return;
    }

    // Resume audio context if suspended
    this.resumeAudioContext();

    const now = this.audioContext.currentTime;
    const mainGain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const reverb = this.createReverb();
    const reverbGain = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();

    // Set up audio routing
    mainGain.connect(filter);

    // Dry path (direct)
    filter.connect(dryGain);
    dryGain.connect(this.masterGain);
    dryGain.gain.setValueAtTime(0.4, now);

    // Wet path (reverb)
    filter.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(this.masterGain);
    reverbGain.gain.setValueAtTime(0.6, now);

    console.log("Playing sound:", type, params);

    switch (type) {
      case "score":
        this.playScoreSound(mainGain, filter, params.score || 50, now);
        break;
      case "bust":
        this.playBustSound(mainGain, filter, now);
        break;
      case "switch":
        this.playSwitchSound(mainGain, filter, now);
        break;
      case "countdown":
        this.playCountdownSound(mainGain, filter, params.count || 3, now);
        break;
      case "victory":
        this.playVictorySound(mainGain, filter, now);
        break;
      case "connect":
        this.playConnectSound(mainGain, filter, now);
        break;
      case "reset":
        this.playResetSound(mainGain, filter, now);
        break;
    }
  }

  playScoreSound(gainNode, filter, score, startTime) {
    // Sharp, bright arcade sound with immediate attack
    const duration = 0.25; // Slightly longer for audibility
    const baseFreq = 800 + score * 6; // High base frequency

    // Set up filter
    filter.type = "highpass";
    filter.frequency.setValueAtTime(600, startTime);
    filter.Q.setValueAtTime(2, startTime);

    console.log("Creating score sound with baseFreq:", baseFreq);

    // Sharp attack layer
    const attackOsc = this.audioContext.createOscillator();
    const attackGain = this.audioContext.createGain();
    attackOsc.type = "square";
    attackOsc.frequency.setValueAtTime(baseFreq, startTime);
    attackOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, startTime + 0.05);
    attackGain.gain.setValueAtTime(0.5, startTime);
    attackGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    attackOsc.connect(attackGain);
    attackGain.connect(gainNode);

    // Bright ping layer
    const pingOsc = this.audioContext.createOscillator();
    const pingGain = this.audioContext.createGain();
    pingOsc.type = "sine";
    pingOsc.frequency.setValueAtTime(baseFreq * 2, startTime);
    pingOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, startTime + duration);
    pingGain.gain.setValueAtTime(0.6, startTime);
    pingGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    pingOsc.connect(pingGain);
    pingGain.connect(gainNode);

    // Start oscillators
    attackOsc.start(startTime);
    attackOsc.stop(startTime + duration);
    pingOsc.start(startTime);
    pingOsc.stop(startTime + duration);

    console.log("Score sound oscillators started");
  }

  playBustSound(gainNode, filter, startTime) {
    // Sharp, aggressive bust sound
    const duration = 0.3;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000, startTime);
    filter.frequency.exponentialRampToValueAtTime(800, startTime + duration);
    filter.Q.setValueAtTime(15, startTime); // Sharp filter

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();

    osc1.type = "square";
    osc1.frequency.setValueAtTime(800, startTime);
    osc1.frequency.exponentialRampToValueAtTime(200, startTime + duration);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(803, startTime); // Slight detune for harshness
    osc2.frequency.exponentialRampToValueAtTime(203, startTime + duration);

    gain1.gain.setValueAtTime(0.7, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    gain2.gain.setValueAtTime(0.7, startTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(gainNode);
    gain2.connect(gainNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  playSwitchSound(gainNode, filter, startTime) {
    // Sharp UI click with metallic ring
    const duration = 0.12;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1200, startTime);
    filter.Q.setValueAtTime(8, startTime);

    const clickOsc = this.audioContext.createOscillator();
    const clickGain = this.audioContext.createGain();

    clickOsc.type = "square";
    clickOsc.frequency.setValueAtTime(2400, startTime);
    clickOsc.frequency.exponentialRampToValueAtTime(1800, startTime + duration);

    clickGain.gain.setValueAtTime(0.5, startTime);
    clickGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    clickOsc.connect(clickGain);
    clickGain.connect(gainNode);

    clickOsc.start(startTime);
    clickOsc.stop(startTime + duration);
  }

  playCountdownSound(gainNode, filter, count, startTime) {
    // Sharp, urgent countdown beep
    const duration = 0.08;
    const baseFreq = 1800 + count * 200;

    filter.type = "highpass";
    filter.frequency.setValueAtTime(1000, startTime);
    filter.Q.setValueAtTime(12, startTime);

    const beepOsc = this.audioContext.createOscillator();
    const beepGain = this.audioContext.createGain();

    beepOsc.type = "square";
    beepOsc.frequency.setValueAtTime(baseFreq, startTime);

    beepGain.gain.setValueAtTime(0.6, startTime);
    beepGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    beepOsc.connect(beepGain);
    beepGain.connect(gainNode);

    beepOsc.start(startTime);
    beepOsc.stop(startTime + duration);
  }

  playVictorySound(gainNode, filter, startTime) {
    // Epic victory fanfare with modern production
    filter.type = "highpass";
    filter.frequency.setValueAtTime(100, startTime);

    const chords = [
      [523.25, 659.25, 783.99], // C major
      [587.33, 739.99, 880.0], // D major
      [659.25, 830.61, 987.77], // E major
      [698.46, 880.0, 1046.5], // F major
    ];

    chords.forEach((chord, i) => {
      const delay = i * 0.3;
      chord.forEach((freq) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime + delay);

        gain.gain.setValueAtTime(0, startTime + delay);
        gain.gain.linearRampToValueAtTime(0.2, startTime + delay + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + delay + 0.8);

        osc.connect(gain);
        gain.connect(gainNode);

        osc.start(startTime + delay);
        osc.stop(startTime + delay + 0.8);
      });
    });
  }

  playConnectSound(gainNode, filter, startTime) {
    // Modern connection success sound
    const duration = 0.6;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, startTime);

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(440, startTime);
    osc1.frequency.exponentialRampToValueAtTime(880, startTime + duration);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(660, startTime + 0.2);

    gain1.gain.setValueAtTime(0.3, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    gain2.gain.setValueAtTime(0.2, startTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(gainNode);
    gain2.connect(gainNode);

    osc1.start(startTime);
    osc2.start(startTime + 0.2);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  playResetSound(gainNode, filter, startTime) {
    // Clean reset/refresh sound
    const duration = 0.4;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(300, startTime);

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, startTime);
    osc.frequency.exponentialRampToValueAtTime(400, startTime + duration);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(gainNode);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

// Initialize sound system
const soundEffects = new SoundEffects();
