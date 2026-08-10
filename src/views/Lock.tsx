import { useEffect, useRef, useState } from 'react';
import { C, SERIF } from '../tokens';
import { setPin, verifyPin } from '../lib/lock';

const BG = `${import.meta.env.BASE_URL}lock/bg-lock.jpg`;
const LOGO = `${import.meta.env.BASE_URL}lock/logo.png`;

const PIN_LENGTH = 4;
/** Lets the fourth dot visibly fill before the screen judges it. */
const SETTLE_MS = 180;

export type LockMode =
  /** Fresh install: say hello, take a name, offer a PIN. */
  | { kind: 'onboard' }
  /** Returning after the idle window. */
  | { kind: 'unlock' }
  /** Setting or changing a PIN from Settings. */
  | { kind: 'set' };

type Stage = 'welcome' | 'name' | 'set' | 'confirm' | 'enter';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 72px)',
        gap: 16,
        justifyContent: 'center',
      }}
    >
      {KEYS.map((k, i) => (
        <button
          key={i}
          onClick={() => k && onKey(k)}
          aria-label={k === '⌫' ? 'Delete' : k || undefined}
          disabled={!k}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: k ? '1px solid rgba(255,255,255,.3)' : 'none',
            background: k ? 'rgba(255,255,255,.12)' : 'transparent',
            color: '#fbf9f4',
            fontFamily: SERIF,
            fontSize: 22,
            fontWeight: 500,
            cursor: k ? 'pointer' : 'default',
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function Dots({ filled }: { filled: number }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 44 }}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <span
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid #efe9da',
            background: i < filled ? C.gold : 'transparent',
            transition: 'background .12s ease',
          }}
        />
      ))}
    </div>
  );
}

/**
 * The landing page: splash, first-run and unlock in one screen, because they
 * are the same moment from the outside — you've opened the app and it wants to
 * know who you are before it shows you anything.
 *
 * The gate is over the UI only. See `lib/lock.ts` for what that is and isn't.
 */
export function Lock({
  mode,
  name,
  onUnlocked,
  onNameChosen,
  onCancel,
}: {
  mode: LockMode;
  name: string;
  /** A correct PIN, a skipped PIN, or a newly set one. */
  onUnlocked: () => void;
  /** Onboarding only — saves the name and stays on screen for the PIN step. */
  onNameChosen?: (name: string) => Promise<void>;
  /** Setting a PIN from Settings: back out without changing anything. */
  onCancel?: () => void;
}) {
  const [stage, setStage] = useState<Stage>(
    mode.kind === 'onboard' ? 'welcome' : mode.kind === 'set' ? 'set' : 'enter',
  );
  const [draft, setDraft] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [typedName, setTypedName] = useState(name);
  const busy = useRef(false);

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    setDraft('');
    window.setTimeout(() => setShake(false), 400);
  };

  // Runs when the fourth digit lands, after the dot has had a moment to fill.
  useEffect(() => {
    if (draft.length !== PIN_LENGTH || busy.current) return;
    busy.current = true;
    const id = window.setTimeout(() => {
      void (async () => {
        if (stage === 'set') {
          setFirst(draft);
          setDraft('');
          setError('');
          setStage('confirm');
        } else if (stage === 'confirm') {
          if (draft === first) {
            await setPin(draft);
            onUnlocked();
          } else {
            // The prototype said "Incorrect PIN" here, which is the wrong
            // sentence for two entries that simply didn't match.
            setFirst('');
            setStage('set');
            fail("Those didn't match — start again");
          }
        } else if (stage === 'enter') {
          if (await verifyPin(draft)) onUnlocked();
          else fail('Incorrect PIN — try again');
        }
        busy.current = false;
      })();
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(id);
      busy.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, stage, first]);

  const press = (k: string) => {
    setError('');
    if (k === '⌫') setDraft((d) => d.slice(0, -1));
    else setDraft((d) => (d.length < PIN_LENGTH ? d + k : d));
  };

  const titles: Record<Stage, { title: string; sub: string }> = {
    welcome: { title: 'Kaktus Cafe', sub: 'A quiet place for your work to grow.' },
    name: { title: 'What should I call you?', sub: 'It only shows up in your greeting.' },
    set: { title: 'Set your PIN', sub: 'Choose a 4-digit PIN to lock the app.' },
    confirm: { title: 'Confirm your PIN', sub: 'Enter it once more to confirm.' },
    enter: {
      title: 'Welcome back',
      sub: name ? `Good to see you, ${name}.` : 'Enter your PIN to continue.',
    },
  };
  const copy = titles[stage];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // Above everything: nav, FAB, sheets and toasts all sit below this.
        zIndex: 100,
        overflow: 'auto',
        backgroundColor: '#1e2a1c',
        backgroundImage: `url(${BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,26,20,.68)' }} />

      <div
        style={{
          position: 'relative',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 26px 40px',
          paddingTop: 'calc(20px + env(safe-area-inset-top))',
        }}
      >
        {onCancel && (
          <button
            onClick={onCancel}
            aria-label="Back"
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: '#fbf9f4',
              cursor: 'pointer',
              padding: 8,
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ‹ Back
          </button>
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            animation: shake ? 'sbshake .4s ease' : undefined,
          }}
        >
          {(stage === 'welcome' || stage === 'enter') && (
            <img
              src={LOGO}
              alt=""
              style={{
                width: stage === 'welcome' ? 108 : 74,
                height: 'auto',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.35))',
                marginBottom: 14,
              }}
            />
          )}

          <div
            style={{
              fontFamily: SERIF,
              fontSize: stage === 'welcome' ? 40 : 27,
              fontWeight: stage === 'welcome' ? 700 : 500,
              color: '#fbf9f4',
              letterSpacing: '-.01em',
              marginBottom: 8,
            }}
          >
            {copy.title}
          </div>
          <div style={{ color: '#cfd6cd', fontSize: 14, marginBottom: 34 }}>{copy.sub}</div>

          {stage === 'welcome' && (
            <button
              onClick={() => setStage('name')}
              style={{
                width: 250,
                background: '#1b3f2d',
                color: '#fff',
                border: '1px solid rgba(255,255,255,.55)',
                borderRadius: 14,
                padding: 15,
                fontFamily: 'inherit',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,.3)',
              }}
            >
              Let's get started
            </button>
          )}

          {stage === 'name' && (
            <>
              <input
                autoFocus
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && typedName.trim()) setStage('set');
                }}
                placeholder="Your name"
                style={{
                  width: 250,
                  maxWidth: '100%',
                  background: 'rgba(255,255,255,.12)',
                  border: '1px solid rgba(255,255,255,.35)',
                  borderRadius: 12,
                  padding: '13px 15px',
                  fontFamily: 'inherit',
                  fontSize: 16,
                  color: '#fbf9f4',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <button
                onClick={() =>
                  void (async () => {
                    await onNameChosen?.(typedName);
                    setStage('set');
                  })()
                }
                disabled={!typedName.trim()}
                style={{
                  width: 250,
                  marginTop: 14,
                  background: typedName.trim() ? '#1b3f2d' : 'rgba(255,255,255,.12)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,.4)',
                  borderRadius: 14,
                  padding: 15,
                  fontFamily: 'inherit',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: typedName.trim() ? 'pointer' : 'default',
                }}
              >
                Continue
              </button>
            </>
          )}

          {(stage === 'set' || stage === 'confirm' || stage === 'enter') && (
            <>
              <Dots filled={draft.length} />
              {error && (
                <div
                  role="alert"
                  style={{
                    color: '#e8a08c',
                    fontSize: 13,
                    fontWeight: 600,
                    margin: '-24px 0 24px',
                  }}
                >
                  {error}
                </div>
              )}
              <Keypad onKey={press} />
            </>
          )}

          {/* Skipping is allowed, and says plainly what it costs. */}
          {stage === 'set' && mode.kind === 'onboard' && (
            <button
              onClick={onUnlocked}
              style={{
                marginTop: 28,
                background: 'none',
                border: 'none',
                color: '#e8dbb4',
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Skip — don't lock this app
            </button>
          )}

          {stage === 'set' && (
            <div
              style={{
                marginTop: 22,
                maxWidth: 280,
                color: '#cfd6cd',
                fontSize: 12,
                lineHeight: 1.5,
                opacity: 0.85,
              }}
            >
              There's no way to reset this. Forget it and the only way back in is
              clearing the app — so keep a backup.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
