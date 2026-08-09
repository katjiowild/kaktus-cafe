import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, setSetting } from '../db';
import { isoDate } from './dates';

/** The three session lengths the design offers, in minutes. */
export const DURATIONS = [15, 25, 50] as const;

const DEFAULT_DURATION = 25;

/** Ambient loop, plus the ticking clock that joins for the last few seconds. */
const RIVER = `${import.meta.env.BASE_URL}focus/river.mp3`;
const TICK = `${import.meta.env.BASE_URL}focus/tick.mp3`;
const TICK_FROM = 5;

interface SessionCount {
  date: string;
  count: number;
}

export interface FocusTimer {
  /** Chosen session length, in minutes. */
  duration: number;
  /** Seconds left in the current session, for the digits. */
  remaining: number;
  /**
   * Continuous 1→0 progress, read live off the deadline. The ring animates
   * from this rather than from `remaining`: a whole second is under half a
   * pixel of the circumference on a long session, so a per-second ring looks
   * frozen for the first minute and then lags a step behind for the rest.
   */
  fraction: () => number;
  running: boolean;
  /** Sessions finished today — resets itself when the date rolls over. */
  sessionsToday: number;
  setDuration: (minutes: number) => void;
  /** Start, or pause if already running. */
  toggle: () => void;
  /** Stop and put the full session back on the clock. */
  reset: () => void;
}

/**
 * The timer lives above the view tree, so wandering off to Today mid-session
 * doesn't silently kill it — only the Focus page's own close button does.
 *
 * Time is read from a wall-clock deadline rather than counted down tick by
 * tick: browsers throttle timers in a backgrounded tab, and a phone that
 * locks for ten minutes would otherwise come back ten minutes behind.
 */
export function useFocusTimer(onComplete: (sessions: number) => void): FocusTimer {
  const [duration, setDurationState] = useState(DEFAULT_DURATION);
  const [remaining, setRemaining] = useState(DEFAULT_DURATION * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);

  const deadline = useRef<number | null>(null);
  const river = useRef<HTMLAudioElement | null>(null);
  const tick = useRef<HTMLAudioElement | null>(null);
  const onDone = useRef(onComplete);
  onDone.current = onComplete;

  // Restore the preferred length and today's tally. A count from an earlier
  // day is stale by definition, so it reads as zero rather than being carried.
  useEffect(() => {
    void (async () => {
      const [saved, sessions] = await Promise.all([
        getSetting<number>('focus.duration', DEFAULT_DURATION),
        getSetting<SessionCount | null>('focus.sessions', null),
      ]);
      const mins = DURATIONS.includes(saved as (typeof DURATIONS)[number])
        ? saved
        : DEFAULT_DURATION;
      setDurationState(mins);
      setRemaining(mins * 60);
      if (sessions && sessions.date === isoDate()) setSessionsToday(sessions.count);
    })();
  }, []);

  const stopAudio = useCallback(() => {
    for (const ref of [river, tick]) {
      if (!ref.current) continue;
      ref.current.pause();
      ref.current.currentTime = 0;
    }
  }, []);

  const finish = useCallback(async () => {
    deadline.current = null;
    setRunning(false);
    setRemaining(0);
    stopAudio();
    const next = sessionsToday + 1;
    setSessionsToday(next);
    await setSetting('focus.sessions', { date: isoDate(), count: next } satisfies SessionCount);
    onDone.current(next);
  }, [sessionsToday, stopAudio]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (deadline.current === null) return;
      // Ceil, not round: a countdown should read 25:00 for the whole first
      // second and reach 00:00 exactly as the deadline passes.
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        void finish();
      } else if (left <= TICK_FROM && tick.current?.paused) {
        void tick.current.play().catch(() => {});
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, finish]);

  // Whatever else happens, the loop shouldn't outlive the app.
  useEffect(() => stopAudio, [stopAudio]);

  // Read through a ref so the callback identity is stable and an animation
  // frame loop can hold onto it without restarting every second.
  const live = useRef({ duration, remaining });
  live.current = { duration, remaining };

  const fraction = useCallback(() => {
    const total = live.current.duration * 60 * 1000;
    if (total <= 0) return 0;
    const leftMs =
      deadline.current === null
        ? live.current.remaining * 1000
        : Math.max(0, deadline.current - Date.now());
    return Math.min(1, leftMs / total);
  }, []);

  const toggle = useCallback(() => {
    if (running) {
      deadline.current = null;
      setRunning(false);
      river.current?.pause();
      tick.current?.pause();
      return;
    }
    // A finished session restarts from the top rather than sitting at 00:00.
    const seconds = remaining > 0 ? remaining : duration * 60;
    // Built on the tap, not at mount: iOS only grants playback from a gesture.
    river.current ??= Object.assign(new Audio(RIVER), { loop: true });
    tick.current ??= Object.assign(new Audio(TICK), { loop: true });
    void river.current.play().catch(() => {});
    if (seconds <= TICK_FROM) void tick.current.play().catch(() => {});
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
  }, [running, remaining, duration]);

  const setDuration = useCallback(
    (minutes: number) => {
      deadline.current = null;
      setRunning(false);
      stopAudio();
      setDurationState(minutes);
      setRemaining(minutes * 60);
      void setSetting('focus.duration', minutes);
    },
    [stopAudio],
  );

  const reset = useCallback(() => {
    deadline.current = null;
    setRunning(false);
    stopAudio();
    setRemaining(duration * 60);
  }, [duration, stopAudio]);

  return { duration, remaining, fraction, running, sessionsToday, setDuration, toggle, reset };
}
