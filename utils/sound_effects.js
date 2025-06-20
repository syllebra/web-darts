// Sound Effects System
class SoundEffects {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.3;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Resume audio context (required for user interaction)
    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Create a simple tone
    createTone(frequency, duration, type = 'sine', volume = null) {
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
        this.createTone(150, 0.1, 'square', 0.2);
        setTimeout(() => this.createTone(100, 0.05, 'square', 0.1), 50);
    }

    // Number closing sound
    playNumberClose() {
        this.resumeContext();
        // Ascending chime
        this.createTone(523, 0.2, 'sine', 0.3); // C5
        setTimeout(() => this.createTone(659, 0.2, 'sine', 0.3), 100); // E5
        setTimeout(() => this.createTone(784, 0.3, 'sine', 0.3), 200); // G5
    }

    // Score sound
    playScore() {
        this.resumeContext();
        // Pleasant ding
        this.createTone(800, 0.3, 'sine', 0.25);
        setTimeout(() => this.createTone(1000, 0.2, 'sine', 0.2), 150);
    }

    // Turn change sound
    playTurnChange() {
        this.resumeContext();
        // Soft transition sound
        this.createTone(400, 0.15, 'triangle', 0.2);
        setTimeout(() => this.createTone(500, 0.15, 'triangle', 0.2), 100);
    }

    // Button click sound
    playButtonClick() {
        this.resumeContext();
        // Quick click
        this.createTone(600, 0.08, 'square', 0.15);
    }

    // Game reset sound
    playGameReset() {
        this.resumeContext();
        // Descending scale
        const notes = [784, 659, 523, 440]; // G5, E5, C5, A4
        notes.forEach((note, index) => {
            setTimeout(() => this.createTone(note, 0.2, 'sine', 0.2), index * 100);
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
}

// Initialize sound system
const soundEffects = new SoundEffects();
