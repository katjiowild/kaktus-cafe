/**
 * Sound for a focus session: a river that loops for the length of it, and a
 * ticking clock for the last few seconds.
 *
 * The river runs through Web Audio rather than `<audio loop>`. An HTML audio
 * element restarts playback to loop, which leaves an audible hole every time
 * round — measured here at roughly a tenth of a second, and the reason the
 * loop sounded broken. A decoded buffer with `loop = true` is sample-accurate,
 * so the seam is inaudible.
 *
 * The file also carries 12ms of digital silence at its tail, left by the mp3
 * encoder. `loopEnd` stops just short of it. That's a real but small part of
 * the gap — trimming the file itself would have cost half a second of river
 * and fixed neither half of the problem.
 */

const RIVER = `${import.meta.env.BASE_URL}focus/river.mp3`;
const TICK = `${import.meta.env.BASE_URL}focus/tick.mp3`;

/** Encoder padding at the end of the river file. Measured, not guessed. */
const TAIL_PADDING = 0.02;

export class FocusAudio {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private tick: HTMLAudioElement | null = null;
  /** Bumped on every stop, so a decode that resolves late can tell it's stale. */
  private generation = 0;

  /** Must be called from a user gesture — iOS won't start audio otherwise. */
  async startRiver(fadeOverSeconds?: number): Promise<void> {
    this.stopRiver();
    const generation = this.generation;

    this.ctx ??= new AudioContext();
    const ctx = this.ctx;
    if (ctx.state === 'suspended') await ctx.resume();

    if (!this.buffer) {
      const bytes = await (await fetch(RIVER)).arrayBuffer();
      this.buffer = await ctx.decodeAudioData(bytes);
    }
    // Paused while the file was still decoding — don't start after the fact.
    if (generation !== this.generation) return;

    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = Math.max(0.1, this.buffer.duration - TAIL_PADDING);

    const gain = ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain).connect(ctx.destination);
    source.start();

    this.source = source;
    this.gain = gain;
    if (fadeOverSeconds !== undefined) this.fadeOutRiver(fadeOverSeconds);
  }

  /** Ramp the river away over `seconds`, leaving the clock on its own. */
  fadeOutRiver(seconds: number): void {
    if (!this.ctx || !this.gain) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    // Ramps to a whisper rather than to zero: an exact zero can click, and
    // linear ramps to 0 are ill-defined on some implementations.
    this.gain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.05, seconds));
  }

  stopRiver(): void {
    this.generation += 1;
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // Already stopped — nothing to do.
      }
      this.source.disconnect();
      this.source = null;
    }
    this.gain?.disconnect();
    this.gain = null;
  }

  startTick(): void {
    // 5.04s long and only ever played for the final five seconds, so it never
    // reaches its own end — no looping, and no gap to worry about.
    this.tick ??= new Audio(TICK);
    void this.tick.play().catch(() => {});
  }

  get tickRunning(): boolean {
    return Boolean(this.tick && !this.tick.paused);
  }

  stopTick(): void {
    if (!this.tick) return;
    this.tick.pause();
    this.tick.currentTime = 0;
  }

  stopAll(): void {
    this.stopRiver();
    this.stopTick();
  }
}
