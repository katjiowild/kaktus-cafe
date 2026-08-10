import { useEffect, useRef, useState } from 'react';
import { C, SERIF } from '../tokens';
import { DURATIONS, type FocusTimer } from '../lib/focus';
import { TRACKS } from '../lib/focusAudio';

const BG = `${import.meta.env.BASE_URL}focus/bg-focus.jpg`;

/** The photo is busy behind the small print — a soft shadow keeps it readable
 *  over foliage without darkening the whole scrim. */
const LEGIBLE = { textShadow: '0 1px 4px rgba(10,14,10,.55)' } as const;

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
export function Focus({ timer, onClose }: { timer: FocusTimer; onClose: () => void }) {
  const { duration, remaining, fraction, running, intention, track, setTrack, setDuration, toggle } =
    timer;
  const ring = useRef<SVGCircleElement>(null);
  const dial = useRef<HTMLButtonElement>(null);

  /**
   * Everything inside the dial is sized from the dial itself rather than from
   * fixed pixels, so unfolding the phone grows the clock instead of leaving a
   * small one adrift in the middle of a big screen. Measured rather than
   * computed in CSS because the dial's own size is a min() of width and
   * height — there's no viewport unit that tracks it.
   */
  const [dialSize, setDialSize] = useState(260);
  useEffect(() => {
    const el = dial.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDialSize(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 260px is the design's dial, and these are its type sizes at that width.
  const k = dialSize / 260;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const digitsSize = clamp(52 * k, 40, 104);
  const runLabelSize = clamp(13.5 * k, 12, 20);
  const titleSize = clamp(20 * k, 20, 34);
  const subtitleSize = clamp(12 * k, 12, 18);
  const pillSize = clamp(13.5 * k, 13.5, 19);

  /**
   * The ring is written straight to the DOM on animation frames instead of
   * being re-rendered from state. State only carries whole seconds — far too
   * coarse for a 704px circumference — and re-rendering the page 60 times a
   * second to smooth it out would be worse than the problem.
   */
  useEffect(() => {
    const draw = () => {
      if (ring.current) {
        ring.current.style.strokeDashoffset = String((1 - fraction()) * CIRCUMFERENCE);
      }
    };
    draw();
    if (!running) return;
    let frame = requestAnimationFrame(function loop() {
      draw();
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
    // Paused, the ring only needs redrawing when the clock itself changes.
  }, [fraction, running, duration, remaining]);

  return (
    <div
      style={{
        // The one page that ignores the app's 460px column: the photo fills
        // whatever screen it's on, and the clock centres in it.
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        overflow: 'hidden',
        // Everything on this page is white text sized for a dark photo. Until
        // the image arrives — cold load, slow connection, or it never loads —
        // that leaves the page unreadable, so the dark base goes underneath it
        // rather than the photo being the only thing holding the contrast.
        backgroundColor: '#1e2a1c',
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
            <div
              style={{ fontFamily: SERIF, fontSize: titleSize, fontWeight: 500, color: '#fff', ...LEGIBLE }}
            >
              Focus time
            </div>
            <div style={{ color: '#e9e4d8', fontSize: subtitleSize, marginTop: 2, ...LEGIBLE }}>
              Take a breath. You've got this.
            </div>
          </div>

          <button
            ref={dial}
            onClick={toggle}
            aria-label={running ? 'Pause session' : 'Start session'}
            style={{
              position: 'relative',
              // Bounded by both axes so it never crowds the pills below or the
              // close button above, and never runs past a comfortable size on
              // a large screen.
              width: 'clamp(200px, min(64vw, 46vh), 420px)',
              aspectRatio: '1',
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
                ref={ring}
                cx={125}
                cy={125}
                r={RADIUS}
                fill="none"
                stroke="url(#focusGrad)"
                strokeWidth={11}
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                // First paint only — the frame loop above owns it after that.
                // No CSS transition: it would put the ring a step behind.
                strokeDashoffset={(1 - remaining / (duration * 60)) * CIRCUMFERENCE}
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
                  fontSize: digitsSize,
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
                  fontSize: runLabelSize,
                  fontWeight: 600,
                  marginTop: 5,
                }}
              >
                <CoffeeGlyph size={runLabelSize} /> {running ? 'Pause' : 'Tap to start'}
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
                ...LEGIBLE,
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
                      padding: `${Math.round(9 * (pillSize / 13.5))}px ${Math.round(18 * (pillSize / 13.5))}px`,
                      borderRadius: 20,
                      border: on ? 'none' : '1px solid rgba(255,255,255,.4)',
                      background: on ? C.deepSage : 'rgba(255,255,255,.1)',
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontSize: pillSize,
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

          {/* Sound sits under the session lengths, sharing their shape but a
              size down — the length is the decision, this is the garnish. */}
          <div>
            <div
              style={{
                textAlign: 'center',
                color: '#e9e4d8',
                fontSize: subtitleSize,
                fontWeight: 600,
                marginBottom: 9,
                ...LEGIBLE,
              }}
            >
              Sound
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {TRACKS.map((t) => {
                const on = track === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTrack(t.id)}
                    aria-pressed={on}
                    style={{
                      flex: '0 0 auto',
                      padding: `${Math.round(7 * (pillSize / 13.5))}px ${Math.round(
                        14 * (pillSize / 13.5),
                      )}px`,
                      borderRadius: 20,
                      border: on ? 'none' : '1px solid rgba(255,255,255,.32)',
                      background: on ? C.sage : 'rgba(255,255,255,.08)',
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontSize: Math.max(12, pillSize - 1.5),
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* What she set out to do today, written on Today. Only shown when
              there is one — an empty prompt here would just be clutter while
              a session runs. */}
          {intention && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 8,
                maxWidth: 300,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.45,
                ...LEGIBLE,
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, marginTop: 1, opacity: 0.85 }}>
                <SproutGlyph size={15} />
              </span>
              <span>{intention}</span>
            </div>
          )}
        </div>

        {/* Clears the fixed bottom nav. */}
        <div style={{ flexShrink: 0, height: 96 }} />
      </div>
    </div>
  );
}
