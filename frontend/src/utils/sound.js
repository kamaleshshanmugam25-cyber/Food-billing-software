// Web Audio API synthesized restaurant service bell chime
// Works instantly in all browsers without external mp3 downloads
export const playOrderChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Bell chime harmonic
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Pleasant dual chime: G5 (784Hz) -> C6 (1046Hz) -> E6 (1318Hz)
    playTone(784, now, 0.4);
    playTone(1046, now + 0.15, 0.6);
    playTone(1318, now + 0.3, 0.9);
  } catch (err) {
    console.warn('Audio chime playback error:', err);
  }
};
