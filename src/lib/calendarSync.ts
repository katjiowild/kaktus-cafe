import { db, uid } from '../db';
import { isoNow } from './dates';
import { OAuthError, PROVIDERS, refresh } from './oauth';
import { canWrite, requestGoogleToken } from './googleAuth';
import type { CalendarAccount, Meeting, Person } from '../types';

/**
 * Read-only calendar sync (v5 §3–4). Pulls events into the same local Meeting
 * records everything else uses; the app never writes back to the provider.
 *
 * Sync window: recent past (so this morning's meeting is still there to take
 * notes against) through the next couple of months.
 */
const DAYS_BACK = 7;
const DAYS_FORWARD = 60;

export const ACCOUNTS_KEY = 'calendarAccounts';

/**
 * Everything that reads-then-writes the meeting table against a provider runs
 * through here, one at a time.
 *
 * Two races produced duplicate meetings without it:
 *  - Pushing a new meeting creates the Google event first and tags the local
 *    record second. A sync landing in that gap saw an untagged local record,
 *    decided the event was new, and inserted a second copy.
 *  - Nothing serialised sync with itself. Two overlapping runs both read the
 *    existing meetings before either wrote, so both inserted — which is how one
 *    event became five.
 */
let syncChain: Promise<unknown> = Promise.resolve();

export function withCalendarLock<T>(fn: () => Promise<T>): Promise<T> {
  // Chain regardless of whether the previous holder resolved or threw.
  const run = syncChain.then(fn, fn);
  syncChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function loadAccounts(): Promise<CalendarAccount[]> {
  const row = await db.settings.get(ACCOUNTS_KEY);
  return (row?.value as CalendarAccount[] | undefined) ?? [];
}

export async function saveAccounts(accounts: CalendarAccount[]): Promise<void> {
  await db.settings.put({ key: ACCOUNTS_KEY, value: accounts });
}

export async function upsertAccount(account: CalendarAccount): Promise<CalendarAccount[]> {
  const accounts = await loadAccounts();
  // Re-authorising the same mailbox updates it in place rather than stacking
  // duplicate entries for one calendar.
  const i = accounts.findIndex(
    (a) => a.provider === account.provider && a.email.toLowerCase() === account.email.toLowerCase(),
  );
  if (i >= 0) {
    accounts[i] = { ...accounts[i], ...account, id: accounts[i].id };
  } else {
    accounts.push(account);
  }
  await saveAccounts(accounts);
  return accounts;
}

/** Disconnecting removes the account's synced meetings; local ones are untouched. */
export async function disconnectAccount(accountId: string): Promise<void> {
  const accounts = await loadAccounts();
  await saveAccounts(accounts.filter((a) => a.id !== accountId));
  const theirs = await db.meetings.where('accountId').equals(accountId).toArray();
  await db.meetings.bulkDelete(theirs.map((m) => m.id));
}

/** Returns a valid access token, refreshing quietly if it has expired. */
async function freshToken(account: CalendarAccount): Promise<string> {
  if (Date.now() < account.expiresAt - 60_000) return account.accessToken;

  // Google (GIS) has no refresh token — ask for a silent re-issue instead,
  // which works as long as the Google session is alive.
  if (account.provider === 'google') {
    const token = await requestGoogleToken(false);
    const accounts = await loadAccounts();
    await saveAccounts(
      accounts.map((a) =>
        a.id === account.id
          ? {
              ...a,
              accessToken: token.accessToken,
              expiresAt: token.expiresAt,
              // Keep whatever was already granted if Google doesn't restate it.
              scopes: token.scopes || a.scopes,
            }
          : a,
      ),
    );
    return token.accessToken;
  }

  if (!account.refreshToken) {
    throw new OAuthError('This connection has expired — reconnect the account.');
  }
  const config = PROVIDERS[account.provider];
  const tokens = await refresh(config, account.refreshToken);
  const accounts = await loadAccounts();
  const updated = accounts.map((a) =>
    a.id === account.id
      ? {
          ...a,
          accessToken: tokens.accessToken,
          expiresAt: tokens.expiresAt,
          // Providers don't always reissue a refresh token; keep the old one.
          refreshToken: tokens.refreshToken ?? a.refreshToken,
        }
      : a,
  );
  await saveAccounts(updated);
  return tokens.accessToken;
}

interface RemoteEvent {
  externalId: string;
  title: string;
  datetime: string;
  location: string;
  attendees: string[];
}

async function fetchGoogle(token: string): Promise<RemoteEvent[]> {
  const now = new Date();
  const min = new Date(now.getTime() - DAYS_BACK * 86400000).toISOString();
  const max = new Date(now.getTime() + DAYS_FORWARD * 86400000).toISOString();
  const params = new URLSearchParams({
    timeMin: min,
    timeMax: max,
    singleEvents: 'true', // expand recurring series into instances
    orderBy: 'startTime',
    maxResults: '250',
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new OAuthError(`Google Calendar returned ${res.status}.`);
  const json = (await res.json()) as {
    items?: {
      id: string;
      status?: string;
      summary?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      attendees?: { email?: string; displayName?: string }[];
    }[];
  };
  return (json.items ?? [])
    .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
    .map((e) => ({
      externalId: e.id,
      title: e.summary?.trim() || '(no title)',
      // All-day events have `date` only; anchor them to local midnight.
      datetime: e.start!.dateTime
        ? new Date(e.start!.dateTime).toISOString()
        : new Date(`${e.start!.date}T00:00`).toISOString(),
      location: e.location?.trim() ?? '',
      attendees: (e.attendees ?? [])
        .map((a) => a.displayName?.trim() || a.email?.trim() || '')
        .filter(Boolean),
    }));
}

async function fetchOutlook(token: string): Promise<RemoteEvent[]> {
  const now = new Date();
  const start = new Date(now.getTime() - DAYS_BACK * 86400000).toISOString();
  const end = new Date(now.getTime() + DAYS_FORWARD * 86400000).toISOString();
  // calendarView expands recurring series, the same as Google's singleEvents.
  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $orderby: 'start/dateTime',
    $top: '250',
    $select: 'id,subject,start,location,attendees,isCancelled',
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
  });
  if (!res.ok) throw new OAuthError(`Microsoft Graph returned ${res.status}.`);
  const json = (await res.json()) as {
    value?: {
      id: string;
      subject?: string;
      isCancelled?: boolean;
      start?: { dateTime?: string };
      location?: { displayName?: string };
      attendees?: { emailAddress?: { name?: string; address?: string } }[];
    }[];
  };
  return (json.value ?? [])
    .filter((e) => !e.isCancelled && e.start?.dateTime)
    .map((e) => ({
      externalId: e.id,
      title: e.subject?.trim() || '(no title)',
      // Graph returns naive UTC strings with the Prefer header above.
      datetime: new Date(`${e.start!.dateTime}Z`).toISOString(),
      location: e.location?.displayName?.trim() ?? '',
      attendees: (e.attendees ?? [])
        .map((a) => a.emailAddress?.name?.trim() || a.emailAddress?.address?.trim() || '')
        .filter(Boolean),
    }));
}

/** Attendee names that match a Person get a real link; the rest stay as text. */
function linkAttendees(attendees: string[], people: Person[]) {
  const personIds: string[] = [];
  const leftover: string[] = [];
  for (const name of attendees) {
    const match = people.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() || p.name.toLowerCase() === name.split('@')[0].toLowerCase(),
    );
    if (match) {
      if (!personIds.includes(match.id)) personIds.push(match.id);
    } else {
      leftover.push(name);
    }
  }
  return { personIds, peopleText: leftover.join(', ') };
}

export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
}

/**
 * Collapse meetings that already share an `externalId` within one account —
 * the wreckage left by the races above, which sync would otherwise preserve
 * forever (both copies match a real event, so neither looks stale).
 *
 * Keeps one record and re-points any notes from the copies onto it, so a
 * write-up attached to the "wrong" duplicate isn't lost.
 */
async function collapseDuplicates(accountId: string): Promise<number> {
  const mine = await db.meetings.where('accountId').equals(accountId).toArray();
  const groups = new Map<string, Meeting[]>();
  for (const m of mine) {
    if (!m.externalId) continue;
    const list = groups.get(m.externalId) ?? [];
    list.push(m);
    groups.set(m.externalId, list);
  }

  let removed = 0;
  for (const [, copies] of groups) {
    if (copies.length < 2) continue;
    // Keep the oldest — the original the user actually created.
    const ordered = [...copies].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const keep = ordered[0];
    const drop = ordered.slice(1);

    for (const d of drop) {
      const theirNotes = await db.notes.where('meetingId').equals(d.id).toArray();
      await Promise.all(
        theirNotes.map((n) => db.notes.update(n.id, { meetingId: keep.id, updatedAt: isoNow() })),
      );
    }
    await db.meetings.bulkDelete(drop.map((d) => d.id));
    removed += drop.length;
  }
  return removed;
}

export async function syncAccount(account: CalendarAccount): Promise<SyncResult> {
  const token = await freshToken(account);
  const events =
    account.provider === 'google' ? await fetchGoogle(token) : await fetchOutlook(token);

  const people = await db.people.toArray();
  await collapseDuplicates(account.id);

  const existing = await db.meetings.where('accountId').equals(account.id).toArray();
  const byExternal = new Map(existing.map((m) => [m.externalId ?? '', m]));

  /**
   * Meetings pushed to this account whose local record never got tagged —
   * because the app closed between creating the Google event and adopting it.
   * The lock can't cover that, so match them here on title + start time and
   * adopt rather than inserting a duplicate.
   */
  const orphans = (await db.meetings.where('source').equals('local').toArray()).filter(
    (m) => m.externalId === null,
  );
  const orphanKey = (title: string, datetime: string) =>
    `${title.trim().toLowerCase()}@${new Date(datetime).getTime()}`;
  const byOrphan = new Map(orphans.map((m) => [orphanKey(m.title, m.datetime), m]));

  const seen = new Set<string>();
  const now = isoNow();

  let added = 0;
  let updated = 0;

  for (const e of events) {
    seen.add(e.externalId);
    const { personIds, peopleText } = linkAttendees(e.attendees, people);
    const prev = byExternal.get(e.externalId);
    if (prev) {
      // Never clobber her own notes, or person links she set by hand — only the
      // fields the provider actually owns.
      await db.meetings.update(prev.id, {
        title: e.title,
        datetime: e.datetime,
        location: e.location,
        personIds: prev.personIds.length ? prev.personIds : personIds,
        peopleText: prev.peopleText || peopleText,
        updatedAt: now,
      });
      updated++;
    } else if (byOrphan.has(orphanKey(e.title, e.datetime))) {
      // This is our own push that never finished being adopted — claim it.
      const orphan = byOrphan.get(orphanKey(e.title, e.datetime))!;
      byOrphan.delete(orphanKey(e.title, e.datetime));
      await db.meetings.update(orphan.id, {
        source: account.provider,
        externalId: e.externalId,
        accountId: account.id,
        location: e.location,
        updatedAt: now,
      });
      updated++;
    } else {
      const meeting: Meeting = {
        id: uid('mtg'),
        title: e.title,
        datetime: e.datetime,
        personIds,
        peopleText,
        location: e.location,
        source: account.provider,
        externalId: e.externalId,
        accountId: account.id,
        createdAt: now,
        updatedAt: now,
      };
      await db.meetings.add(meeting);
      added++;
    }
  }

  // Events deleted upstream: drop ours too, but keep any we've written notes
  // against — losing the context for those notes to someone else's cancellation
  // would be worse than a stale row.
  const notedMeetingIds = new Set(
    (await db.notes.toArray()).map((n) => n.meetingId).filter((id): id is string => Boolean(id)),
  );
  const stale = existing.filter(
    (m) => !seen.has(m.externalId ?? '') && !notedMeetingIds.has(m.id),
  );
  const inWindow = stale.filter((m) => {
    const t = new Date(m.datetime).getTime();
    return t > Date.now() - DAYS_BACK * 86400000 && t < Date.now() + DAYS_FORWARD * 86400000;
  });
  await db.meetings.bulkDelete(inWindow.map((m) => m.id));

  const accounts = await loadAccounts();
  await saveAccounts(
    accounts.map((a) =>
      a.id === account.id ? { ...a, lastSyncedAt: now, lastError: null } : a,
    ),
  );

  return { added, updated, removed: inWindow.length };
}

export function syncAll(): Promise<{ result: SyncResult; errors: string[] }> {
  // Serialised: never overlaps another sync, nor an in-flight push.
  return withCalendarLock(runSyncAll);
}

async function runSyncAll(): Promise<{ result: SyncResult; errors: string[] }> {
  const accounts = await loadAccounts();
  const total: SyncResult = { added: 0, updated: 0, removed: 0 };
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const r = await syncAccount(account);
      total.added += r.added;
      total.updated += r.updated;
      total.removed += r.removed;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed.';
      errors.push(`${account.email}: ${message}`);
      const current = await loadAccounts();
      await saveAccounts(
        current.map((a) => (a.id === account.id ? { ...a, lastError: message } : a)),
      );
    }
  }
  return { result: total, errors };
}

export const DEFAULT_WRITE_ACCOUNT_KEY = 'defaultCalendarAccountId';

export async function getDefaultWriteAccountId(): Promise<string | null> {
  const row = await db.settings.get(DEFAULT_WRITE_ACCOUNT_KEY);
  return (row?.value as string | null | undefined) ?? null;
}

export async function setDefaultWriteAccountId(id: string | null): Promise<void> {
  await db.settings.put({ key: DEFAULT_WRITE_ACCOUNT_KEY, value: id });
}

/**
 * Push a meeting to Google as a real event (v6 §2), so the phone's own calendar
 * handles the reminder. Always the account's **primary** calendar — she has no
 * sub-calendars, so there's nothing to choose between.
 *
 * Create-time only: this never runs again for the same meeting, and the app
 * never pushes edits. To keep that honest, the meeting is adopted as the
 * account's event afterwards (see store.saveMeeting) — otherwise a later
 * in-app edit would silently disagree with the reminder Google is holding.
 */
export async function createGoogleEvent(
  account: CalendarAccount,
  meeting: { title: string; datetime: string; location: string; peopleText: string },
): Promise<{ externalId: string }> {
  if (!canWrite(account.scopes)) {
    throw new OAuthError(
      `${account.email} hasn't been given permission to add events — enable it in Settings.`,
    );
  }
  const token = await freshToken(account);
  const start = new Date(meeting.datetime);
  // No duration in the app's model; an hour is the least surprising default.
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: meeting.title,
        location: meeting.location || undefined,
        description: meeting.peopleText ? `With ${meeting.peopleText}` : undefined,
        start: { dateTime: start.toISOString(), timeZone },
        end: { dateTime: end.toISOString(), timeZone },
      }),
    },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (res.status === 401 || res.status === 403) {
      throw new OAuthError(
        `Google wouldn't accept the event for ${account.email} — re-enable "add events" in Settings.`,
      );
    }
    throw new OAuthError(body.error?.message ?? `Google returned ${res.status}.`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new OAuthError('Google accepted the event but returned no id.');
  return { externalId: json.id };
}

export function newAccount(input: {
  provider: CalendarAccount['provider'];
  email: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scopes?: string;
}): CalendarAccount {
  return {
    id: uid('acct'),
    lastSyncedAt: null,
    lastError: null,
    ...input,
  };
}
