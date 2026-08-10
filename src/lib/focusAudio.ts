/**
 * Sound for a focus session: an ambient loop for the length of it, and a
 * ticking clock for the last few seconds.
 *
 * The loop runs through Web Audio rather than `<audio loop>`. An HTML audio
 * element restarts playback to loop, which leaves an audible hole every time
 * round — the reason the river sounded broken. A decoded buffer with
 * `loop = true` is sample-accurate, so the seam is inaudible.
 */

/** Ambience options offered on the Focus page, in order. */
export const TRACKS = [
  { id: 'stream', label: 'Stream', file: 'river.mp3' },
  { id: 'rain', label: 'Rain & birds', file: 'rain.m4a' },
  { id: 'none', label: 'No sound', file: null },
] as const;

export type TrackId = (typeof TRACKS)[number]['id'];

export const DEFAULT_TRACK: TrackId = 'stream';

export function trackUrl(id: TrackId): string | null {
  const track = TRACKS.find((t) => t.id === id) ?? TRACKS[0];
  return track.file ? `${import.meta.env.BASE_URL}focus/${track.file}` : null;
}

const TICK = `${import.meta.env.BASE_URL}focus/tick.mp3`;

interface Loop {
  buffer: AudioBuffer;
  start: number;
  end: number;
}

/**
 * Encoders leave digital silence at one or both ends — 12ms on the river's
 * mp3, none on the rain's aac. Rather than carry a constant per file, the
 * silence is measured off the decoded buffer, which is correct for whatever
 * gets added next.
 */
function findLoopPoints(buffer: AudioBuffer): { start: number; end: number } {
  const data = buffer.getChannelData(0);
  const edge = Math.min(data.length, Math.floor(buffer.sampleRate * 0.5));
  let head = 0;
  while (head < edge && data[head] === 0) head += 1;
  let tail = data.length - 1;
  while (tail > data.length - 1 - edge && data[tail] === 0) tail -= 1;
  return {
    start: head / buffer.sampleRate,
    end: Math.max(0.1, (tail + 1) / buffer.sampleRate),
  };
}

export class FocusAudio {
  private ctx: AudioContext | null = null;
  private loops = new Map<string, Loop>();
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private tick: HTMLAudioElement | null = null;
  /** Bumped on every stop, so a decode that resolves late can tell it's stale. */
  private generation = 0;

  /**
   * Start the ambience. A null url is "No sound" — the clock at the end still
   * plays, it just has nothing to come out of.
   *
   * Must be called from a user gesture: iOS won't start audio otherwise.
   */
  async startLoop(url: string | null, fadeOverSeconds?: number): Promise<void> {
    this.stopLoop();
    if (!url) return;
    const generation = this.generation;

    this.ctx ??= new AudioContext();
    const ctx = this.ctx;
    if (ctx.state === 'suspended') await ctx.resume();

    let loop = this.loops.get(url);
    if (!loop) {
      const bytes = await (await fetch(url)).arrayBuffer();
      const buffer = await ctx.decodeAudioData(bytes);
      loop = { buffer, ...findLoopPoints(buffer) };
      this.loops.set(url, loop);
    }
    // Stopped while the file was still decoding — don't start after the fact.
    if (generation !== this.generation) return;

    const source = ctx.createBufferSource();
    source.buffer = loop.buffer;
    source.loop = true;
    source.loopStart = loop.start;
    source.loopEnd = loop.end;

    const gain = ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain).connect(ctx.destination);
    source.start(0, loop.start);

    this.source = source;
    this.gain = gain;
    if (fadeOverSeconds !== undefined) this.fadeOutLoop(fadeOverSeconds);
  }

  /** Ramp the ambience away over `seconds`, leaving the clock on its own. */
  fadeOutLoop(seconds: number): void {
    if (!this.ctx || !this.gain) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    // Ramps to a whisper rather than to zero: an exact zero can click, and
    // linear ramps to 0 are ill-defined on some implementations.
    this.gain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.05, seconds));
  }

  stopLoop(): void {
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
    this.stopLoop();
    this.stopTick();
  }
}
