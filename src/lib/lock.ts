import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, isEmpty, setSetting } from '../db';

/**
 * The app lock.
 *
 * What this is: a gate on the UI, so someone holding your unlocked phone can't
 * read your notes. What it is NOT: encryption. IndexedDB is stored in the
 * clear, and a four-digit PIN is 10,000 guesses — deriving a key from it would
 * be theatre. The PIN is stored as a salted PBKDF2 hash rather than plaintext
 * because there's no reason not to, not because that makes the data safe.
 *
 * There is no recovery. No server means nothing to reset against; forgetting
 * the PIN means clearing app data. Hence the warning at the point of setting it.
 */

const ITERATIONS = 210_000;

/**
 * WebCrypto only exists in a secure context — https, or localhost. Served over
 * plain http (a phone pointed at a dev server on the LAN, say) `crypto.subtle`
 * is undefined and hashing throws. Rather than let that surface as a dead
 * keypad, the lock is offered only where it can actually work.
 */
export const CAN_LOCK =
  typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

interface StoredPin {
  salt: string;
  hash: string;
  iterations: number;
}

/** Minutes of inactivity before the app asks again. */
export const IDLE_CHOICES: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'Immediately' },
  { minutes: 5, label: 'After 5 minutes' },
  { minutes: 60, label: 'After 1 hour' },
  { minutes: 360, label: 'After 6 hours' },
  { minutes: 1440, label: 'After a day' },
  { minutes: -1, label: 'Never' },
];

export const DEFAULT_IDLE_MINUTES = 360;

const KEY_PIN = 'lock.pin';
const KEY_IDLE = 'lock.idleMinutes';
const KEY_SEEN = 'lock.lastActiveAt';
const KEY_NAME = 'user.name';
const KEY_NAME_SEEDED = 'user.nameSeeded';

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  await setSetting(KEY_PIN, {
    salt: toBase64(salt),
    hash,
    iterations: ITERATIONS,
  } satisfies StoredPin);
}

export async function clearPin(): Promise<void> {
  await setSetting(KEY_PIN, null);
}

export async function hasPin(): Promise<boolean> {
  return (await getSetting<StoredPin | null>(KEY_PIN, null)) !== null;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getSetting<StoredPin | null>(KEY_PIN, null);
  if (!stored) return true;
  // Iterations come from the record, not the constant, so raising the constant
  // later doesn't lock out a PIN hashed under the old one.
  const hash = await derive(pin, fromBase64(stored.salt), stored.iterations);
  return hash === stored.hash;
}

export async function getIdleMinutes(): Promise<number> {
  return getSetting<number>(KEY_IDLE, DEFAULT_IDLE_MINUTES);
}

export async function setIdleMinutes(minutes: number): Promise<void> {
  await setSetting(KEY_IDLE, minutes);
}

export async function getName(): Promise<string> {
  return getSetting<string>(KEY_NAME, '');
}

export async function setName(name: string): Promise<void> {
  await setSetting(KEY_NAME, name.trim());
}

/**
 * An install that already holds records predates the name field, and belongs to
 * the person who built it — so it keeps its greeting rather than losing the
 * name or being interrogated for one. Runs once.
 */
async function seedNameForExistingInstall(): Promise<string> {
  if (await getSetting<boolean>(KEY_NAME_SEEDED, false)) return getName();
  await setSetting(KEY_NAME_SEEDED, true);
  const existing = await getName();
  if (existing) return existing;
  if (await isEmpty()) return '';
  await setName('Kathleen');
  return 'Kathleen';
}

export interface LockState {
  /** False until the stored PIN and idle setting have been read. */
  ready: boolean;
  locked: boolean;
  pinSet: boolean;
  /** Empty until asked for — drives the greeting. */
  name: string;
  /** True on a fresh install that hasn't been through the first-run flow. */
  needsOnboarding: boolean;
  unlock: () => void;
  /** Saves the name mid-flow. Does not end onboarding — the PIN step follows. */
  chooseName: (name: string) => Promise<void>;
  /** Ends the first run, whether a PIN was set or skipped. */
  completeOnboarding: () => Promise<void>;
  /** Settings calls these; the hook keeps its own view in step. */
  refresh: () => Promise<void>;
  lockNow: () => void;
}

export function useLock(): LockState {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [name, setNameState] = useState('');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Read inside the visibility handler rather than closed over, so changing the
  // setting takes effect without re-registering the listener.
  const idleRef = useRef(DEFAULT_IDLE_MINUTES);

  const refresh = useCallback(async () => {
    const [pin, idle, savedName] = await Promise.all([hasPin(), getIdleMinutes(), getName()]);
    idleRef.current = idle;
    setPinSet(pin);
    setNameState(savedName);
  }, []);

  useEffect(() => {
    void (async () => {
      const savedName = await seedNameForExistingInstall();
      const [pin, idle, lastActive] = await Promise.all([
        hasPin(),
        getIdleMinutes(),
        getSetting<number>(KEY_SEEN, 0),
      ]);
      idleRef.current = idle;
      setPinSet(pin);
      setNameState(savedName);
      // A fresh install is one with no name and nothing in it. Anything else
      // has been used before and shouldn't be sent through onboarding.
      setNeedsOnboarding(!savedName && (await isEmpty()));

      // Cold start counts as a return: the elapsed check is the same whether
      // the app was backgrounded or discarded outright. Never lock where the
      // PIN couldn't be checked — that would be a door with no key.
      if (pin && idle >= 0 && CAN_LOCK) {
        const idleMs = idle * 60_000;
        setLocked(Date.now() - lastActive > idleMs);
      }
      setReady(true);
    })();
  }, []);

  // Stamp the time on the way out, and judge it on the way back in. Screen-off,
  // app-switch and being killed all look the same from here, which is fine —
  // all three mean the app wasn't being used.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        void setSetting(KEY_SEEN, Date.now());
        return;
      }
      void (async () => {
        if (!(await hasPin())) return;
        const idle = idleRef.current;
        if (idle < 0) return;
        const lastActive = await getSetting<number>(KEY_SEEN, 0);
        if (Date.now() - lastActive > idle * 60_000) setLocked(true);
      })();
    };
    // pagehide catches the cases visibilitychange misses on iOS.
    const onHide = () => void setSetting(KEY_SEEN, Date.now());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  const unlock = useCallback(() => {
    void setSetting(KEY_SEEN, Date.now());
    setLocked(false);
  }, []);

  const lockNow = useCallback(() => setLocked(true), []);

  const chooseName = useCallback(async (chosen: string) => {
    await setName(chosen);
    setNameState(chosen.trim());
  }, []);

  const completeOnboarding = useCallback(async () => {
    setNeedsOnboarding(false);
    setPinSet(await hasPin());
    await setSetting(KEY_SEEN, Date.now());
  }, []);

  return {
    ready,
    locked,
    pinSet,
    name,
    needsOnboarding,
    unlock,
    chooseName,
    completeOnboarding,
    refresh,
    lockNow,
  };
}
