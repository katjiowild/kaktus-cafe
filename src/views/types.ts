export type View =
  | 'today'
  | 'projects'
  | 'projectDetail'
  | 'calendar'
  | 'notes'
  | 'focus'
  | 'more'
  | 'tasks'
  | 'meetings'
  | 'people'
  | 'personDetail'
  | 'archive'
  | 'settings'
  | 'system';

import type { SheetState } from '../components/Sheet';

/** Everything a view needs to drive navigation and open forms. */
export interface ViewProps {
  wide: boolean;
  go: (v: View) => void;
  openProject: (id: string) => void;
  openPerson: (id: string) => void;
  openSheet: (s: SheetState) => void;
  activeProjectId: string | null;
  activePersonId: string | null;
  /** Focus sessions finished today — Today's focus card reports it. */
  focusSessions: number;
}
