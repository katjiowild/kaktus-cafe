export type View =
  | 'today'
  | 'garden'
  | 'projectDetail'
  | 'calendar'
  | 'notes'
  | 'focus'
  | 'more'
  | 'tasks'
  | 'meetings'
  | 'people'
  | 'personDetail'
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
  /** Full-bleed pages carry their own header, so they open search themselves
   *  rather than through the app chrome. */
  openSearch: () => void;
  activeProjectId: string | null;
  activePersonId: string | null;
  /** Today's intention — written on Today's focus card, read on the Focus page. */
  focusIntention: string;
  setFocusIntention: (text: string) => void;
}
