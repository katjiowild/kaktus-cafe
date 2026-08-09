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
  /** Today's intention — written on Today's focus card, read on the Focus page. */
  focusIntention: string;
  setFocusIntention: (text: string) => void;
}
