import { Injectable } from '@angular/core';

// Elements that count as "a button" for click-sound purposes — the app mixes
// real <button>s with <a class="btn-primary"> links styled as buttons, plus
// a wide variety of btn-* utility classes (btn-sm, btn-action, qa-btn-reply,
// etc.), so a broad attribute-contains selector covers those without having
// to enumerate every one.
const BUTTON_SELECTOR = 'button, a.btn-primary, a.btn-secondary, [role="button"], [class*="btn-"]';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private _enabled = localStorage.getItem('sound-enabled') !== 'false';

  constructor() {
    // Capture phase so this fires even if a button's own handler calls
    // stopPropagation — it only ever plays a sound, never touches the event.
    document.addEventListener('click', (e) => this.handleClick(e), true);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  toggle() {
    this._enabled = !this._enabled;
    localStorage.setItem('sound-enabled', String(this._enabled));
  }

  private handleClick(e: MouseEvent) {
    if (!this._enabled) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest?.(BUTTON_SELECTOR)) this.playClick();
  }

  playClick() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.tone(ctx, now, 720, 360, 0.18, 0.09);
    } catch {
      // Web Audio unavailable/blocked — sound is a nicety, fail silently.
    }
  }

  // A soft two-note ascending chime — distinct from the button click so a
  // notification arriving in the background doesn't read as "you clicked
  // something." Callers (e.g. NotificationService) are expected to only
  // call this for a genuinely NEW notification (a realtime INSERT), not
  // when just loading existing history.
  playNotification() {
    if (!this._enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.tone(ctx, now, 880, 880, 0.13, 0.11);
      this.tone(ctx, now + 0.1, 1320, 1320, 0.13, 0.16);
    } catch {
      // Web Audio unavailable/blocked — sound is a nicety, fail silently.
    }
  }

  private tone(ctx: AudioContext, start: number, freqFrom: number, freqTo: number, peakGain: number, duration: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freqFrom, start);
    if (freqTo !== freqFrom) osc.frequency.exponentialRampToValueAtTime(freqTo, start + duration * 0.8);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakGain, start + Math.min(0.004, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private getContext(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }
}
