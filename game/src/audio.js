// Every sound the game makes, synthesized live with WebAudio oscillators: no
// audio files, no network, nothing to load. The context is created on the
// first player gesture, so browsers never block it, and M mutes it.
export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, duration, type, volume, when = 0, slideTo = 0) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo > 0) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    collect(combo) {
      if (!ensure()) return;
      const step = Math.min(combo, 16);
      const base = 420 * Math.pow(1.059, step);
      tone(base, 0.12, 'sine', 0.5);
      tone(base * 1.5, 0.16, 'sine', 0.3, 0.03);
    },
    wrong() {
      if (!ensure()) return;
      tone(180, 0.28, 'sawtooth', 0.4, 0, 70);
      tone(90, 0.32, 'square', 0.25, 0.02, 45);
    },
    hit() {
      if (!ensure()) return;
      tone(140, 0.3, 'sawtooth', 0.5, 0, 50);
      tone(60, 0.4, 'triangle', 0.5, 0, 35);
    },
    powerup() {
      if (!ensure()) return;
      [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.14, 'triangle', 0.35, index * 0.06));
    },
    wave() {
      if (!ensure()) return;
      tone(392, 0.18, 'triangle', 0.35);
      tone(587, 0.24, 'triangle', 0.35, 0.12);
    },
    start() {
      if (!ensure()) return;
      [262, 392, 523, 784].forEach((frequency, index) => tone(frequency, 0.16, 'triangle', 0.35, index * 0.07));
    },
    gameOver() {
      if (!ensure()) return;
      [392, 330, 262, 196].forEach((frequency, index) => tone(frequency, 0.3, 'triangle', 0.35, index * 0.16));
    },
  };
}
