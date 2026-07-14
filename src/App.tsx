import { useEffect, useMemo, useState } from 'react';
import { C, NARROW_MAX, SERIF, WIDE_BREAKPOINT, WIDE_MAX } from './tokens';
import { useStore } from './store';
import { BottomNav, RadialMenu, Scrim, type AddKind } from './components/Chrome';
import { Sheet, type SheetState } from './components/Sheet';
import { SearchIcon, Toast } from './components/ui';
import { Search } from './components/Search';
import { Today } from './views/Today';
import { Projects } from './views/Projects';
import { ProjectDetail } from './views/ProjectDetail';
import { Tasks } from './views/Tasks';
import { Notes } from './views/Notes';
import { Calendar } from './views/Calendar';
import { People, PersonDetail } from './views/People';
import { Archive, Meetings, More, VisualSystem } from './views/Misc';
import { Settings } from './views/Settings';
import type { View, ViewProps } from './views/types';

/** Two-pane master–detail when unfolded (owner-confirmed: Projects, People, Calendar). */
const TWO_PANE: Partial<Record<View, true>> = {
  projects: true,
  projectDetail: true,
  people: true,
  personDetail: true,
};

const TITLES: Record<View, string> = {
  today: 'Today',
  projects: 'Projects',
  projectDetail: 'Project',
  calendar: 'Calendar',
  notes: 'Notes',
  more: 'More',
  tasks: 'Tasks',
  meetings: 'Meetings',
  people: 'People',
  personDetail: 'Person',
  archive: 'Archive',
  settings: 'Settings',
  system: 'Visual system',
};

function useWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= WIDE_BREAKPOINT,
  );
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= WIDE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return wide;
}

export function App() {
  const store = useStore();
  // Selection lives independently of the width flag, so folding and unfolding
  // mid-use never resets which project or person is open (§1.1).
  const [view, setView] = useState<View>('today');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [radialOpen, setRadialOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const wide = useWide();

  const go = (v: View) => {
    setView(v);
    setActiveProjectId(null);
    setActivePersonId(null);
    setRadialOpen(false);
  };

  const openProject = (id: string) => {
    setActiveProjectId(id);
    setView('projectDetail');
    setRadialOpen(false);
  };

  const openPerson = (id: string) => {
    setActivePersonId(id);
    setView('personDetail');
    setRadialOpen(false);
  };

  const openSheet = (s: SheetState) => {
    setSheet(s);
    setRadialOpen(false);
  };

  const onAdd = (kind: AddKind) => {
    // Adding from inside a project pre-fills the link — capture stays one tap.
    const ctx = view === 'projectDetail' ? activeProjectId : null;
    if (kind === 'task') openSheet({ type: 'task', projectId: ctx });
    else if (kind === 'note') openSheet({ type: 'note', projectId: ctx });
    else openSheet({ type: kind } as SheetState);
  };

  const props: ViewProps = useMemo(
    () => ({ wide, go, openProject, openPerson, openSheet, activeProjectId, activePersonId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wide, activeProjectId, activePersonId],
  );

  const isProjectPane = view === 'projects' || view === 'projectDetail';
  const isPeoplePane = view === 'people' || view === 'personDetail';
  const twoPane = wide && Boolean(TWO_PANE[view]);
  const showBack = !wide && (view === 'projectDetail' || view === 'personDetail');

  const activeProject = store.projects.find((p) => p.id === activeProjectId);
  const activePerson = store.people.find((p) => p.id === activePersonId);
  const headerTitle =
    view === 'projectDetail'
      ? (activeProject?.name ?? 'Project')
      : view === 'personDetail'
        ? (activePerson?.name ?? 'Person')
        : TITLES[view];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, Kathleen`;
  }, []);

  if (!store.ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.paper,
          color: C.muted,
          fontSize: 14,
        }}
      >
        Opening your garden…
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: wide ? WIDE_MAX : NARROW_MAX,
        margin: '0 auto',
        minHeight: '100vh',
        background: C.paper,
        position: 'relative',
        boxShadow: '0 0 60px rgba(36,43,40,.12)',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          padding: '18px 20px 10px',
          background: 'linear-gradient(#f4f1e9 76%, rgba(244,241,233,0))',
        }}
      >
        {showBack && (
          <button
            onClick={() => go(view === 'projectDetail' ? 'projects' : 'people')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: C.softInk,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0 0 6px',
            }}
          >
            ‹ {view === 'projectDetail' ? 'Projects' : 'People'}
          </button>
        )}
        {view === 'today' && (
          <div
            style={{
              fontSize: 12,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: C.muted,
              fontWeight: 600,
            }}
          >
            {greeting}
          </div>
        )}
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 29,
            fontWeight: 500,
            letterSpacing: '-.01em',
            marginTop: 2,
            lineHeight: 1.05,
          }}
        >
          {headerTitle}
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          title="Search"
          aria-label="Search"
          style={{
            position: 'absolute',
            top: 16,
            right: 18,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 7,
            color: C.softInk,
            display: 'flex',
          }}
        >
          <SearchIcon />
        </button>
      </header>

      <main
        style={
          twoPane
            ? { padding: '2px 20px 120px', display: 'flex', gap: 20, alignItems: 'flex-start' }
            : { padding: '2px 16px 128px' }
        }
      >
        {view === 'today' && <Today {...props} />}
        {view === 'tasks' && <Tasks {...props} />}
        {view === 'notes' && <Notes {...props} />}
        {view === 'calendar' && <Calendar {...props} />}
        {view === 'meetings' && <Meetings {...props} />}
        {view === 'more' && <More {...props} />}
        {view === 'archive' && <Archive {...props} />}
        {view === 'settings' && <Settings />}
        {view === 'system' && <VisualSystem />}

        {/* Two-pane: the list stays put and the detail fills the right pane. */}
        {isProjectPane && (wide || view === 'projects') && <Projects {...props} />}
        {isProjectPane && (wide || view === 'projectDetail') && <ProjectDetail {...props} />}
        {isPeoplePane && (wide || view === 'people') && <People {...props} />}
        {isPeoplePane && (wide || view === 'personDetail') && <PersonDetail {...props} />}
      </main>

      {radialOpen && <Scrim onClick={() => setRadialOpen(false)} />}

      <RadialMenu
        open={radialOpen}
        wide={wide}
        onToggle={() => setRadialOpen((o) => !o)}
        onPick={onAdd}
      />

      <BottomNav view={view} wide={wide} onGo={go} />

      {sheet && <Sheet state={sheet} onClose={() => setSheet(null)} wide={wide} />}

      {searchOpen && (
        <Search
          wide={wide}
          onClose={() => setSearchOpen(false)}
          openProject={openProject}
          openPerson={openPerson}
          openSheet={openSheet}
        />
      )}

      <Toast message={store.toast} />
    </div>
  );
}
