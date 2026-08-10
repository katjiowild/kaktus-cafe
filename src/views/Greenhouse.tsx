import { useState } from 'react';
import { C, CARD_SHADOW_LG, NARROW_MAX, SERIF } from '../tokens';
import { useStore } from '../store';
import { projectMeta, type ProjectMeta } from '../lib/derive';
import { Plant } from '../components/Plant';
import { HamburgerIcon, PinIcon, SearchIcon } from '../components/ui';
import type { Project, ProjectStatus } from '../types';
import type { ViewProps } from './types';

/**
 * The Greenhouse — every project as a potted succulent, in three tabs.
 *
 * This is the whole of project browsing: it replaced both the Projects list
 * and the Archive, which were the same records split across two screens by a
 * single status field. The tabs are that field.
 *
 * Full-bleed like Focus: the photographic background is the page, so it opts
 * out of the app's cream chrome and carries its own header.
 */

const TABS: { status: ProjectStatus; label: string; empty: string }[] = [
  { status: 'active', label: 'Ongoing', empty: 'Nothing growing yet. Tap + to plant a project.' },
  { status: 'onhold', label: 'On hold', empty: 'Nothing parked.' },
  { status: 'done', label: 'Completed', empty: 'No finished projects yet.' },
];

/** Growth has to be visible on the card itself, and the illustrations are all
 *  normalised to one height — so the card scales them by level instead. */
const SCALE_FOR_STAGE = [0.74, 0.83, 0.92, 1];

/**
 * Three across on a phone leaves each card about 105px wide, so everything
 * inside it is sized from here rather than from fixed numbers — going back to
 * two is this one line plus the sizes it drives.
 */
const COLUMNS = 3;
const TILE =
  COLUMNS >= 3
    ? { art: 94, plant: 84, name: 13.5, meta: 11, pct: 17, pad: '8px 9px 10px' }
    : { art: 124, plant: 112, name: 15.5, meta: 12, pct: 21, pad: '11px 12px 13px' };

export function Greenhouse({ wide, openProject, openSheet, openSearch, go }: ViewProps) {
  const { projects, tasks, notes, dismissed } = useStore();
  const [tab, setTab] = useState<ProjectStatus>('active');

  const metaOf = (p: Project) => projectMeta(p, tasks, notes, dismissed);

  const shown = projects
    .filter((p) => p.status === tab)
    .sort((a, b) => {
      // Pinned float, then the tab's own idea of recency: what you finished
      // last for Completed, what you touched last for everything else.
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (tab === 'done') return (b.completedOn ?? '').localeCompare(a.completedOn ?? '');
      return b.lastActivityDate.localeCompare(a.lastActivityDate);
    });

  const empty = TABS.find((t) => t.status === tab)!.empty;

  // The entry fade goes on the content, never on an ancestor of the background.
  // sbfade animates a transform, and a transformed element becomes the
  // containing block for position:fixed inside it — so for those 300ms the
  // photo was sized to the full scroll height rather than the viewport, then
  // snapped to a different crop the moment the transform cleared. It read as
  // the background flicking between two different images.
  return (
    <div
      style={
        wide
          ? // Unfolded: a column of plants beside the open project, scrolling
            // on its own. Sticky alone wasn't enough — the column is taller
            // than the screen, so a sticky pane pins its top and puts its last
            // row permanently out of reach.
            //
            // The photo goes on the pane itself rather than in a child layer:
            // a background belongs to the border box, so it stays put while
            // the plants scroll over it, and it stops at the pane's edge
            // instead of running under the project beside it.
            {
              position: 'sticky',
              top: 4,
              alignSelf: 'flex-start',
              flex: '0 0 42%',
              maxWidth: '42%',
              maxHeight: 'calc(100vh - 150px)',
              overflowY: 'auto',
              borderRadius: 18,
              boxShadow: CARD_SHADOW_LG,
              backgroundImage: `url(${import.meta.env.BASE_URL}garden/bg-greenhouse.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { position: 'relative', minHeight: '100vh' }
      }
    >
      {/* Folded, the photo is fixed to the viewport rather than scrolling with
          the content: the glasshouse is a room you're standing in, and a photo
          that slides away down a long list reads as wallpaper instead. */}
      {!wide && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: NARROW_MAX,
            backgroundImage: `url(${import.meta.env.BASE_URL}garden/bg-greenhouse.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          maxWidth: wide ? undefined : NARROW_MAX,
          margin: '0 auto',
          padding: wide ? '14px 14px 18px' : '18px 16px 128px',
          animation: 'sbfade .3s ease',
        }}
      >
        {/* In a pane the app chrome supplies the title, menu and search — two
            of each on one screen would be a mess. */}
        {!wide && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <GlassButton label="Menu" onClick={() => go('more')}>
                <HamburgerIcon size={20} />
              </GlassButton>
              <GlassButton label="Search" onClick={openSearch}>
                <SearchIcon size={19} />
              </GlassButton>
            </div>

            <h1
              style={{
                fontFamily: SERIF,
                fontSize: 40,
                fontWeight: 500,
                color: '#fff',
                letterSpacing: '-.02em',
                margin: '14px 0 20px',
                textShadow: '0 2px 18px rgba(20,32,25,.5)',
              }}
            >
              Greenhouse
            </h1>
          </>
        )}

        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 4,
            padding: 5,
            borderRadius: 999,
            background: 'rgba(252,250,245,.9)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(20,32,25,.22)',
          }}
        >
          {TABS.map((t) => {
            const on = tab === t.status;
            const count = projects.filter((p) => p.status === t.status).length;
            return (
              <button
                key={t.status}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.status)}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: 999,
                  padding: '11px 4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  // Three tabs, so the design's icons are dropped — at this
                  // width a glyph would push the labels to an ellipsis.
                  fontSize: 13.5,
                  fontWeight: 600,
                  background: on ? C.deepSage : 'transparent',
                  color: on ? '#fff' : C.softInk,
                  transition: 'background .18s, color .18s',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span style={{ opacity: on ? 0.65 : 0.5, marginLeft: 5, fontSize: 12 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
            gap: 10,
            marginTop: 18,
          }}
        >
          {shown.map((p) => (
            <ProjectTile key={p.id} project={p} meta={metaOf(p)} onOpen={() => openProject(p.id)} />
          ))}

          {/* Only where a new project would actually land. */}
          {tab === 'active' && (
            <button
              onClick={() => openSheet({ type: 'project' })}
              style={{
                minHeight: COLUMNS >= 3 ? 168 : 210,
                borderRadius: 16,
                border: '1.5px dashed rgba(255,255,255,.55)',
                background: 'rgba(255,255,255,.07)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 30, fontWeight: 300, lineHeight: 1 }}>+</span>
              Add project
            </button>
          )}
        </div>

        {shown.length === 0 && (
          <div
            style={{
              marginTop: 20,
              textAlign: 'center',
              color: 'rgba(255,255,255,.82)',
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          >
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function GlassButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        background: 'rgba(252,250,245,.92)',
        color: C.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(20,32,25,.24)',
      }}
    >
      {children}
    </button>
  );
}

function ProjectTile({
  project: p,
  meta: m,
  onOpen,
}: {
  project: Project;
  meta: ProjectMeta;
  onOpen: () => void;
}) {
  const scale = SCALE_FOR_STAGE[Math.max(1, Math.min(4, m.stage)) - 1];

  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(252,250,245,.95)',
        boxShadow: '0 4px 18px rgba(20,32,25,.28)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        // Done projects read as settled rather than active, without hiding.
        opacity: p.status === 'done' ? 0.88 : 1,
      }}
    >
      <div
        style={{
          position: 'relative',
          height: TILE.art,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          background: 'linear-gradient(rgba(233,238,228,.9), rgba(214,225,208,.75))',
        }}
      >
        <Plant
          stage={m.stage}
          vitality={m.vitality}
          species={p.species}
          size={TILE.plant * scale}
          // The neglected illustration already browns; the extra desaturation
          // is what makes it read at thumbnail size in a grid.
          style={{ filter: m.needsWater ? 'saturate(.7)' : undefined, marginBottom: 2 }}
        />
        {p.pinned && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(252,250,245,.94)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(20,32,25,.18)',
            }}
          >
            <PinIcon pinned size={12} color={C.clay} />
          </span>
        )}
      </div>

      <div style={{ padding: TILE.pad, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: TILE.name,
            fontWeight: 500,
            lineHeight: 1.25,
            color: C.ink,
          }}
        >
          {p.name}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 6 }}>
          <TileMeta project={p} meta={m} />
        </div>
      </div>
    </div>
  );
}

/**
 * One card frame, three meta lines. A retainer has no meaningful percentage
 * and an area has no meaningful task count — showing them one anyway would be
 * a number that means nothing.
 */
function TileMeta({ project: p, meta: m }: { project: Project; meta: ProjectMeta }) {
  if (p.type === 'retainer') {
    return (
      <>
        {/* The cadence used to lead this line, but "Weekly · 20-week streak"
            says weekly twice — the unit inside the streak already carries it. */}
        <div style={{ fontSize: TILE.meta, color: C.softInk }}>
          {m.streak}
          {p.cadence === 'monthly' ? '-month' : '-week'} streak
        </div>
        <div style={{ display: 'flex', gap: 2.5, marginTop: 7 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i < m.streak ? C.clay : '#e2d9c6',
              }}
            />
          ))}
        </div>
      </>
    );
  }

  if (p.type === 'area') {
    return (
      <div style={{ fontSize: TILE.meta, color: C.softInk }}>
        {m.noteCount} {m.noteCount === 1 ? 'note' : 'notes'}
        <div style={{ color: C.muted, marginTop: 2 }}>evergreen</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: TILE.meta, color: C.softInk }}>
        {m.done} of {m.total} {m.total === 1 ? 'task' : 'tasks'}
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: TILE.pct,
          fontWeight: 500,
          color: C.sageInk,
          margin: '2px 0 7px',
        }}
      >
        {m.pct}%
      </div>
      <div style={{ height: 6, background: C.paper2, borderRadius: 6, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${m.pct}%`,
            background: C.deepSage,
            borderRadius: 6,
          }}
        />
      </div>
    </>
  );
}

