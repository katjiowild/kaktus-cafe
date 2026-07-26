import { C } from '../tokens';
import { useStore } from '../store';
import { projectMeta } from '../lib/derive';
import { Plant } from './Plant';

/** Gentle vertical jitter so the plants read as planted, not lined up. */
const LIFTS = [0, -13, 9, -6, 13, -8, 4, -15, 10, -4];

/**
 * The garden scene — every active project as a succulent, planted in the
 * ground. Lives at the top of Today (v5 §1); the Projects screen keeps the
 * list/detail view. Growth and vitality logic is untouched — this is placement
 * only.
 */
export function Garden({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { projects, tasks, notes, dismissed } = useStore();
  const planted = projects.filter((p) => p.status === 'active');

  const metaOf = (id: string) => {
    const p = projects.find((x) => x.id === id)!;
    return projectMeta(p, tasks, notes, dismissed);
  };

  const thirsty = planted.filter((p) => metaOf(p.id).needsWater).length;
  const caption = planted.length === 0 ? '' : thirsty ? `${thirsty} need water` : 'all thriving';
  const overlap = planted.length > 6 ? -30 : -20;

  return (
    <div
      style={{
        margin: '4px 2px 8px',
        border: '1px solid #d9cdb0',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(#eef2ea 0%,#e7ece1 26%,#e4d9bd 27%,#d9caa4 100%)',
      }}
    >
      <div style={{ position: 'relative', minHeight: 130, padding: '7px 12px 0' }}>
        <div
          style={{
            position: 'absolute',
            left: '6%',
            bottom: 4,
            width: 76,
            height: 34,
            background: 'linear-gradient(#cfc3a6,#b7a884)',
            borderRadius: '40% 46% 30% 34%/60% 60% 40% 40%',
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '8%',
            bottom: 0,
            width: 98,
            height: 40,
            background: 'linear-gradient(#d3c8ac,#bcad88)',
            borderRadius: '42% 38% 34% 40%/64% 58% 42% 40%',
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '43%',
            bottom: 8,
            width: 62,
            height: 26,
            background: 'linear-gradient(#c9bd9f,#b3a37e)',
            borderRadius: '44% 40% 32% 36%/62% 60% 40% 40%',
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: planted.length > 5 ? 'flex-start' : 'center',
            minHeight: 122,
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
        >
          {planted.map((p, i) => {
            const m = metaOf(p.id);
            let size = 54 + m.stage * 9;
            if (p.type === 'area') size += 22;
            if (p.type === 'retainer') size += 8;
            const lift = LIFTS[i % LIFTS.length];
            return (
              <Plant
                key={p.id}
                stage={m.stage}
                vitality={m.vitality}
                species={p.type}
                size={size}
                onClick={() => onOpenProject(p.id)}
                title={p.name}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  marginLeft: i === 0 ? 0 : overlap,
                  transform: `translateY(${lift}px)`,
                  zIndex: 20 + lift,
                }}
              />
            );
          })}
          {planted.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, padding: '40px 0' }}>
              Your garden is empty — start a project.
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 16, background: 'linear-gradient(#b69c6e,#9a8054)' }} />
      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#7a7263',
          fontWeight: 600,
          padding: '8px 0 11px',
          letterSpacing: '.02em',
          background: '#e9dcbe',
        }}
      >
        Your garden — {planted.length} {planted.length === 1 ? 'plant' : 'plants'}
        {caption && ` · ${caption}`}
      </div>
    </div>
  );
}
