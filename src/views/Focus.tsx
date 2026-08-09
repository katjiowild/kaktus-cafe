import { C, NARROW_MAX, SERIF, WIDE_MAX } from '../tokens';
import { DURATIONS, type FocusTimer } from '../lib/focus';

const BG = `${import.meta.env.BASE_URL}focus/bg-focus.jpg`;

const RADIUS = 112;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clock(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function CoffeeGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8h10v6a5 5 0 01-5 5 5 5 0 01-5-5z" />
      <path d="M16 9h2a3 3 0 010 6h-2" />
    </svg>
  );
}

function SproutGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 20h6" />
      <path d="M8 20l1-6h6l1 6" />
      <path d="M9 3c2 2 2 4 2 6" />
      <path d="M15 3c-2 2-2 4-2 6" />
      <path d="M12 2v7" />
    </svg>
  );
}

/**
 * Focus is the app's one full-bleed page: photographic background, no cream
 * chrome, no sticky header. It sits under the bottom nav rather than replacing
 * it, so a session is always one tap away from the rest of the app — and
 * leaving the page doesn't stop the clock (see `useFocusTimer`). Only the
 * close button does.
 */
export function Focus({
  timer,
  wide,
  onClose,
}: {
  timer: FocusTimer;
  wide: boolean;
  onClose: () => void;
}) {
  const { duration, remaining, running, sessionsToday, setDuration, toggle } = timer;
  const fraction = remaining / (duration * 60);
  const dashOffset = (1 - fraction) * CIRCUMFERENCE;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        maxWidth: wide ? WIDE_MAX : NARROW_MAX,
        margin: '0 auto',
        overflow: 'hidden',
        backgroundImage: `url(${BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        animation: 'sbfade .3s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,rgba(10,14,10,.42) 0%,rgba(10,14,10,.12) 26%,rgba(10,14,10,.1) 60%,rgba(8,10,8,.4) 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: '12px 22px 0',
          paddingTop: 'calc(12px + env(safe-area-inset-top))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close focus"
          style={{
            flexShrink: 0,
            alignSelf: 'flex-start',
            background: 'rgba(255,255,255,.16)',
            border: 'none',
            borderRadius: '50%',
            width: 30,
            height: 30,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
          >
            <path d="M6 6l12 12 M18 6L6 18" />
          </svg>
        </button>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: '#fff' }}>
              Focus time
            </div>
            <div style={{ color: '#e9e4d8', fontSize: 12, marginTop: 2 }}>
              Take a breath. You've got this.
            </div>
          </div>

          <button
            onClick={toggle}
            aria-label={running ? 'Pause session' : 'Start session'}
            style={{
              position: 'relative',
              width: 260,
              height: 260,
              maxWidth: '66vw',
              maxHeight: '66vw',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 250 250" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={125}
                cy={125}
                r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,.25)"
                strokeWidth={11}
              />
              <circle
                cx={125}
                cy={125}
                r={RADIUS}
                fill="none"
                stroke="url(#focusGrad)"
                strokeWidth={11}
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                // Matches the tick interval: the sweep glides instead of stepping.
                style={{ transition: 'stroke-dashoffset .25s linear' }}
              />
              <defs>
                <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d98a4f" />
                  <stop offset="100%" stopColor="#6f9a6a" />
                </linearGradient>
              </defs>
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 52,
                  fontWeight: 600,
                  color: '#fff',
                  letterSpacing: '-.01em',
                }}
              >
                {clock(remaining)}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#e9e4d8',
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginTop: 5,
                }}
              >
                <CoffeeGlyph /> {running ? 'Pause' : 'Tap to start'}
              </div>
            </div>
          </button>

          <div>
            <div
              style={{
                textAlign: 'center',
                color: '#e9e4d8',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 9,
              }}
            >
              Choose a session
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {DURATIONS.map((d) => {
                const on = duration === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    aria-pressed={on}
                    style={{
                      flex: '0 0 auto',
                      padding: '9px 18px',
                      borderRadius: 20,
                      border: on ? 'none' : '1px solid rgba(255,255,255,.4)',
                      background: on ? C.deepSage : 'rgba(255,255,255,.1)',
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {d} min
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session history only — the garden's growth is task-driven and this
              deliberately doesn't feed it. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              color: '#e9e4d8',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{ display: 'flex', color: '#fff', opacity: i < sessionsToday ? 1 : 0.3 }}
                >
                  <SproutGlyph />
                </span>
              ))}
            </span>
            {sessionsToday > 4 && <span>+{sessionsToday - 4}</span>}
            <span style={{ opacity: 0.8 }}>
              {sessionsToday === 1 ? '1 session today' : `${sessionsToday} sessions today`}
            </span>
          </div>
        </div>

        {/* Clears the fixed bottom nav. */}
        <div style={{ flexShrink: 0, height: 96 }} />
      </div>
    </div>
  );
}
