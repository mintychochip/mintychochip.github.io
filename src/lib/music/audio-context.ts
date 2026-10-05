/**
 * The single Web Audio context for the whole site.
 *
 * Wordle sound effects and the vault chiptune player both route through here so
 * a page never accumulates more than one AudioContext (browsers cap them) and a
 * user gesture that unlocks audio unlocks everything at once.
 */
let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // `webkitAudioContext` is real on older Safari but absent from the DOM lib types.
    const legacyWindow: Window & { webkitAudioContext?: typeof AudioContext } = window;
    const AudioContextClass = window.AudioContext ?? legacyWindow.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}
