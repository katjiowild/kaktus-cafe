import { useEffect, useMemo, useState } from 'react';
import { C, NARROW_MAX, SERIF, TYPE, WIDE_BREAKPOINT, WIDE_MAX } from './tokens';
import { useStore } from './store';
import { BottomNav, RadialMenu, Scrim, type AddKind } from './components/Chrome';
import { Sheet, type SheetState } from './components/Sheet';
import { HamburgerIcon, SearchIcon, Toast } from './components/ui';
import { Search } from './components/Search';
import { Today } from './views/Today';
import { Greenhouse } from './views/Greenhouse';
import { ProjectDetail } from './views/ProjectDetail';
import { Tasks } from './views/Tasks';
import { Notes } from './views/Notes';
import { Calendar } from './views/Calendar';
import { Focus } from './views/Focus';
import { People, PersonDetail } from './views/People';
import { Meetings, More, VisualSystem } from './views/Misc';
import { Settings } from './views/Settings';
import { useFocusTimer } from './lib/focus';
import { useLock } from './lib/lock';
import { Lock } from './views/Lock';
import type { View, ViewProps } from './views/types';

/**
 * Two-pane master–detail when unfolded. The Greenhouse is in here: unfolded,
 * the glasshouse becomes a column of plants on the left with the project you
 * picked open beside it, and the photograph stays inside that column rather
 * than running under the detail pane.
 */
const TWO_PANE: Partial<Record<View, true>> = {
  garden: true,
  projectDetail: true,
  people: true,
  personDetail: true,
};

/** The tabs the bottom bar can land on — used to remember where the hamburger
 *  was opened from, so Back and the lit tab both point home. */
const MAIN_VIEWS: Partial<Record<View, true>> = {
  today: true,
  notes: true,
  calendar: true,
  focus: true,
  garden: true,
};

/** Short names — the header shows these, and the back chevron reuses them. */
const TITLES: Record<View, string> = {
  today: 'Today',
  garden: 'Greenhouse',
  projectDetail: 'Project',
  calendar: 'Calendar',
  notes: 'Notes',
  focus: 'Focus',
  more: 'More',
  tasks: 'Tasks',
  meetings: 'Meetings',
  people: 'People',
  personDetail: 'Person',
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
  const [prevMainView, setPrevMainView] = useState<View>('today');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [radialOpen, setRadialOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const wide = useWide();
  // Lifted out of the Focus view so a session keeps running while you go and
  // look something up (v-phase2 §1).
  const focusTimer = useFocusTimer(() => store.showToast('Session complete 🌱'));
  // Above the gate on purpose: a session keeps counting while the app is
  // locked, and the calendar keeps syncing.
  const lock = useLock();

  /**
   * Home-screen shortcuts land here as `?new=task` / `?new=meeting` (v6 §1) —
   * open that capture sheet straight away and tidy the URL, so a refresh or a
   * later share doesn't reopen the sheet.
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    const kind = url.searchParams.get('new');
    if (kind !== 'task' && kind !== 'meeting') return;
    setSheet(kind === 'task' ? { type: 'task' } : { type: 'meeting' });
    url.searchParams.delete('new');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }, []);

  const go = (v: View) => {
    setView(v);
    if (MAIN_VIEWS[v]) setPrevMainView(v);
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
    () => ({
      wide,
      go,
      openProject,
      openPerson,
      openSheet,
      openSearch: () => setSearchOpen(true),
      activeProjectId,
      activePersonId,
      focusIntention: focusTimer.intention,
      setFocusIntention: focusTimer.setIntention,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wide, activeProjectId, activePersonId, focusTimer.intention, focusTimer.setIntention],
  );

  const isPeoplePane = view === 'people' || view === 'personDetail';
  const isGardenPane = view === 'garden' || view === 'projectDetail';
  const twoPane = wide && Boolean(TWO_PANE[view]);
  const isFocus = view === 'focus';
  /**
   * Folded, the Greenhouse is full-bleed like Focus: it replaces the cream
   * chrome and carries its own header. Unfolded it becomes the left pane of a
   * master–detail instead, and hands the header back to the app chrome —
   * otherwise the page would carry two titles and two search buttons.
   */
  const isGreenhouse = view === 'garden' && !wide;
  const chromeless = isFocus || isGreenhouse;

  /**
   * Nothing under the hamburger has a tab of its own any more, so each of those
   * pages carries its own way back: out to the menu, and from the menu out to
   * whichever tab you opened it from.
   */
  const back: View | null =
    view === 'more'
      ? prevMainView
      : view === 'personDetail'
        ? 'people'
        : view === 'projectDetail'
          ? 'garden'
          : MAIN_VIEWS[view]
            ? null
            : 'more';
  // Unfolded, the detail pane sits beside its list — there's nothing to go back to.
  const showBack =
    back !== null && !(wide && (view === 'projectDetail' || view === 'personDetail'));

  const activePerson = store.people.find((p) => p.id === activePersonId);
  // Project detail carries its own header row — thumbnail, name, status pill —
  // so the chrome only supplies the back chevron above it.
  const headerTitle =
    view === 'projectDetail'
      ? // Unfolded, the Greenhouse is still on screen beside the project, so
        // the header keeps naming it. Folded, the project's own header row —
        // thumbnail, name, status pill — is the title, and the chrome above it
        // stays empty.
        wide
        ? 'Greenhouse'
        : ''
      : view === 'personDetail'
        ? (activePerson?.name ?? 'Person')
        : // Today carries the greeting above it, so the headline can be the
          // design's question rather than repeating the word.
          view === 'today'
          ? "What's brewing today?"
          : TITLES[view];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    // No name yet — greet anyway rather than greeting the wrong person.
    return lock.name ? `${part}, ${lock.name}` : part;
  }, [lock.name]);

  if (!store.ready || !lock.ready) {
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
      {!chromeless && (
        <>
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              padding: '18px 20px 10px',
              background: 'linear-gradient(#f4f1e9 76%, rgba(244,241,233,0))',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              {/* A page with its own way back doesn't also offer the menu —
                  one backwards affordance per screen. */}
              {showBack ? (
                <span />
              ) : (
                <button
                  onClick={() => go('more')}
                  title="Menu"
                  aria-label="Menu"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 6,
                    margin: '0 0 0 -6px',
                    color: C.ink,
                    display: 'flex',
                  }}
                >
                  <HamburgerIcon />
                </button>
              )}
              <button
                onClick={() => setSearchOpen(true)}
                title="Search"
                aria-label="Search"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  margin: '0 -6px 0 0',
                  color: C.softInk,
                  display: 'flex',
                }}
              >
                <SearchIcon />
              </button>
            </div>
            {showBack && back && (
              <button
                onClick={() => go(back)}
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
                ‹ {TITLES[back]}
              </button>
            )}
            {view === 'today' && (
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: '.05em',
                  color: C.clay,
                  fontWeight: 700,
                }}
              >
                {greeting}
              </div>
            )}
            <div
              style={{
                fontFamily: SERIF,
                fontSize: view === 'today' ? TYPE.headline : TYPE.pageTitle,
                fontWeight: 500,
                letterSpacing: '-.01em',
                marginTop: 3,
                lineHeight: 1.05,
              }}
            >
              {headerTitle}
            </div>
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
            {view === 'settings' && <Settings lock={lock} />}
            {view === 'system' && <VisualSystem />}

            {/* Two-pane: the list stays put and the detail fills the right pane. */}
            {isGardenPane && wide && <Greenhouse {...props} />}
            {isGardenPane && (wide || view === 'projectDetail') && <ProjectDetail {...props} />}
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
        </>
      )}

      {/* Folded only — unfolded, it renders as a pane inside main above. */}
      {isGreenhouse && <Greenhouse {...props} />}

      {isFocus && (
        <Focus
          timer={focusTimer}
          onClose={() => {
            focusTimer.reset();
            go('today');
          }}
        />
      )}

      <BottomNav view={view} fallback={prevMainView} onGo={go} />

      {sheet && (
        <Sheet
          state={sheet}
          onClose={() => setSheet(null)}
          onOpenSheet={setSheet}
          wide={wide}
        />
      )}

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

      {/* Last, and above everything — the rest of the app stays mounted behind
          it so unlocking doesn't reload or lose a running session. */}
      {(lock.needsOnboarding || lock.locked) && (
        <Lock
          mode={lock.needsOnboarding ? { kind: 'onboard' } : { kind: 'unlock' }}
          name={lock.name}
          onUnlocked={() => {
            // Onboarding ends here — after the PIN step, set or skipped — not
            // when the name is entered.
            if (lock.needsOnboarding) void lock.completeOnboarding();
            else {
              void lock.refresh();
              lock.unlock();
            }
          }}
          biometricOn={lock.biometricOn}
          onNameChosen={lock.chooseName}
        />
      )}
    </div>
  );
}
