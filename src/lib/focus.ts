import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, setSetting } from '../db';
import { DEFAULT_TRACK, FocusAudio, trackUrl, type TrackId } from './focusAudio';
import { isoDate } from './dates';

/** The three session lengths the design offers, in minutes. */
export const DURATIONS = [15, 25, 50] as const;

const DEFAULT_DURATION = 25;

/** Seconds left when the ticking clock takes over. */
const TICK_FROM = 5;
/** Seconds left when the river starts receding, so it's gone by TICK_FROM. */
const FADE_FROM = 8;

interface SessionCount {
  date: string;
  count: number;
}

/** What she's set out to do today. Dated, so it clears itself overnight
 *  instead of yesterday's intention greeting her in the morning. */
interface Intention {
  date: string;
  text: string;
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
  /** Today's intention, set on Today and shown on the Focus page. */
  intention: string;
  setIntention: (text: string) => void;
  /** Which ambience plays while running. The clock at the end is unaffected. */
  track: TrackId;
  setTrack: (id: TrackId) => void;
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
  const [intention, setIntentionState] = useState('');
  const [track, setTrackState] = useState<TrackId>(DEFAULT_TRACK);
  // Read by the ticker without re-registering it when the choice changes.
  const trackRef = useRef<TrackId>(DEFAULT_TRACK);
  trackRef.current = track;

  const deadline = useRef<number | null>(null);
  const audio = useRef<FocusAudio | null>(null);
  if (!audio.current) audio.current = new FocusAudio();
  /** Set once per session so the fade is scheduled a single time. */
  const fading = useRef(false);
  const onDone = useRef(onComplete);
  onDone.current = onComplete;

  // Restore the preferred length and today's tally. A count from an earlier
  // day is stale by definition, so it reads as zero rather than being carried.
  useEffect(() => {
    void (async () => {
      const [saved, sessions, aim, savedTrack] = await Promise.all([
        getSetting<number>('focus.duration', DEFAULT_DURATION),
        getSetting<SessionCount | null>('focus.sessions', null),
        getSetting<Intention | null>('focus.intention', null),
        getSetting<TrackId>('focus.track', DEFAULT_TRACK),
      ]);
      setTrackState(savedTrack);
      const mins = DURATIONS.includes(saved as (typeof DURATIONS)[number])
        ? saved
        : DEFAULT_DURATION;
      setDurationState(mins);
      setRemaining(mins * 60);
      if (sessions && sessions.date === isoDate()) setSessionsToday(sessions.count);
      if (aim && aim.date === isoDate()) setIntentionState(aim.text);
    })();
  }, []);

  const setIntention = useCallback((text: string) => {
    const trimmed = text.trim();
    setIntentionState(trimmed);
    void setSetting('focus.intention', { date: isoDate(), text: trimmed } satisfies Intention);
  }, []);

  const stopAudio = useCallback(() => {
    fading.current = false;
    audio.current?.stopAll();
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
      } else if (left <= TICK_FROM) {
        // The river has faded by now; the clock finishes alone.
        if (!audio.current?.tickRunning) audio.current?.startTick();
      } else if (left <= FADE_FROM && !fading.current) {
        fading.current = true;
        audio.current?.fadeOutLoop(left - TICK_FROM);
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
      audio.current?.stopAll();
      fading.current = false;
      return;
    }
    // A finished session restarts from the top rather than sitting at 00:00.
    const seconds = remaining > 0 ? remaining : duration * 60;
    // Started from the tap, not at mount: iOS only grants playback from a gesture.
    if (seconds <= TICK_FROM) {
      audio.current?.startTick();
      fading.current = true;
    } else {
      // Resuming inside the fade window picks the ramp up where it belongs.
      const fadeIn = seconds <= FADE_FROM ? seconds - TICK_FROM : undefined;
      fading.current = fadeIn !== undefined;
      void audio.current?.startLoop(trackUrl(trackRef.current), fadeIn);
    }
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

  const setTrack = useCallback(
    (id: TrackId) => {
      setTrackState(id);
      trackRef.current = id;
      void setSetting('focus.track', id);
      // Swap the sound under a running session rather than interrupting it —
      // unlike changing the length, this doesn't change the clock.
      if (running) {
        const left = deadline.current
          ? Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
          : 0;
        if (left > TICK_FROM) {
          const fadeIn = left <= FADE_FROM ? left - TICK_FROM : undefined;
          void audio.current?.startLoop(trackUrl(id), fadeIn);
        }
      }
    },
    [running],
  );

  const reset = useCallback(() => {
    deadline.current = null;
    setRunning(false);
    stopAudio();
    setRemaining(duration * 60);
  }, [duration, stopAudio]);

  return {
    duration,
    remaining,
    fraction,
    running,
    sessionsToday,
    intention,
    setIntention,
    track,
    setTrack,
    setDuration,
    toggle,
    reset,
  };
}
