/**
 * "What's new" notes for testers — a short, friendly summary of what changed,
 * shown once per entry the first time someone opens the app after it ships.
 *
 * This is deliberately editorial, not automatic: a new entry only gets added
 * when Kathleen decides a change is worth telling testers about (most
 * internal/invisible changes aren't). Written in her voice, not a commit log.
 *
 * Add new entries to the END of the array — the last one is "latest". Each
 * `id` just needs to be unique and sort after the previous one; a date is the
 * simplest choice.
 */
export interface ChangelogEntry {
  id: string;
  intro: string;
  bullets: string[];
  outro: string;
  signoff: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-10-04',
    intro:
      "Hello! Thanks for still using the Kaktus Cafe app! A few things changed since you last opened the app:",
    bullets: [
      "Finished or parked projects won't wilt anymore — no more pretending it's been neglected.",
      "Meetings is now Meetings / Events, and the master view is split into Upcoming and Past, so you're not hunting through old ones to find what's next.",
      'Tasks can be saved for later. If something\'s worth capturing but you\'re not ready to give it a date, flip "Save for later" on it. Find them all under the Pending filter on the Task List page — and if you\'ve already got a pile of overdue stuff, select a bunch and save them all for later in one go.',
    ],
    outro: "Let me know if anything looks off or just feels clunky — that's exactly what this round is for.",
    signoff: 'Yours, Kathleen',
  },
];

export const LATEST_CHANGELOG = CHANGELOG[CHANGELOG.length - 1];
