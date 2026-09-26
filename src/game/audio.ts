let context: AudioContext | null = null;
let enabled = true;
export function setSoundEnabled(value: boolean) { enabled = value; if (!value) window.speechSynthesis?.cancel(); }
function getContext() { context ??= new AudioContext(); if (context.state === 'suspended') void context.resume(); return context; }
export function unlockAudio() { if (enabled) { try { getContext(); } catch { /* Sound is optional. */ } } }
export function sound(type: 'move' | 'boost' | 'drain' | 'correct' | 'win' | 'lose' | 'click') {
  if (!enabled) return;
  try {
    const ctx = getContext(); const t = ctx.currentTime;
    const notes = type === 'win' ? [523, 659, 784, 1047, 784, 1047] : type === 'lose' ? [160, 100, 55] : type === 'correct' ? [660, 880, 1047] : type === 'boost' ? [440, 660] : type === 'drain' ? [220, 150] : [type === 'click' ? 520 : 360];
    notes.forEach((frequency, i) => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = type === 'lose' ? 'sawtooth' : 'sine'; osc.frequency.setValueAtTime(frequency, t + i * .12); gain.gain.setValueAtTime(0, t + i * .12); gain.gain.linearRampToValueAtTime(.22, t + i * .12 + .02); gain.gain.exponentialRampToValueAtTime(.001, t + i * .12 + .24); osc.connect(gain).connect(ctx.destination); osc.start(t + i * .12); osc.stop(t + i * .12 + .25); });
    if (type === 'lose' || type === 'win') {
      const length = type === 'win' ? 2 : .6;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate); const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) { const time = i / ctx.sampleRate; data[i] = (Math.random() * 2 - 1) * (type === 'win' ? Math.pow(Math.max(0, Math.sin(time * 47)), 12) * .48 * (1 - time / length) : Math.exp(-time * 9) * .8); }
      const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(ctx.destination); source.start(t + (type === 'win' ? .2 : 0));
      if (type === 'win' && 'speechSynthesis' in window) { const voice = new SpeechSynthesisUtterance('耶！太棒啦！你成功了！'); voice.lang = 'zh-CN'; voice.rate = 1.15; voice.pitch = 1.45; voice.volume = 1; window.speechSynthesis.speak(voice); }
    }
  } catch { /* Gameplay still works when browser audio is unavailable. */ }
}

/** Optional English pronunciation; never blocks answering or ignores mute. */
export function speakWord(word: string): boolean {
  if (!enabled || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US'; utterance.rate = .8; utterance.pitch = 1.1;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch { return false; }
}
