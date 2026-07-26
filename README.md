# Kaktus Cafe

A personal second brain — tasks, projects, notes, meetings, people — built as an installable offline PWA for the phone. Phase 1 (core) and Phase 2 (motivation layer) of `second-brain-scopev4.md`.


## Your data

Everything lives in **IndexedDB on the phone**. There is no server and no account, by design (spec §7.0). That means:

- It works with no signal, anywhere.
- **The phone is the only copy.** Use **More → Backup & settings → Export backup** regularly and keep the JSON somewhere safe. A lost or reset phone is a lost brain otherwise.
- That same export file is what you hand to Claude for advisory mode (spec §6, modes 1–2) — it's plain JSON with every relationship expressed as an id.

Reinstalling the PWA or clearing the browser's site data will wipe it. Restoring a backup replaces everything currently in the app.

## Working on it locally

```
npm install
npm run dev      # http://localhost:5173/kaktus-cafe/
npm run check    # typecheck
npm run build    # production build into dist/
```

Node isn't on your Mac's PATH by default — it was installed to `~/.local/node`. Either run `export PATH="$HOME/.local/node/bin:$PATH"` first, or add that line to `~/.zshrc` to make it permanent.

## How it's put together

```
src/
  types.ts        the data model (Project, Task, Note, Meeting, Person)
  db.ts           IndexedDB via Dexie — one table per record type
  store.tsx       all mutations; the only place that writes
  tokens.ts       design tokens — no hex codes anywhere else
  lib/
    dates.ts      date maths + the recurrence engine (nextOccurrence)
    derive.ts     every count, %, streak, growth stage and vitality state
    backup.ts     export / import
  components/     Plant, TaskRow, Sheet (all forms), Chrome (nav + radial), Search
  views/          one file per screen
```

Two rules the code is built around, both from the spec:

- **Counts are never stored.** Progress %, task counts, note counts, milestone counts and the retainer streak are all computed in `derive.ts` from the actual relationships, every render. There is no field to fall out of sync.
- **`lastActivityDate` is the single neglect signal.** Completing a task, adding a note, ticking a milestone or leaving a comment stamps it (`touchProject` in `store.tsx`). The plant's colour and the Today nudge both read from it, so they can never disagree.

### The succulent

`components/Plant.tsx` is a direct port of the design package's `Plant.dc.html`. Two independent dimensions:

- **Growth stage 1–5** from progress — size and fullness. Neglect never reduces it.
- **Vitality** from days since activity — `healthy ≤3d → dry ≤6d → yellowing ≤10d → browning >10d`. Reviving restores colour without losing earned growth.

Species follow project type: Active = echeveria, Retainer = aeonium, Area = dracaena.

## Calendar sync (Phase 3)

Read-only sync from Google and Outlook, entirely client-side — OAuth 2.0 Authorization Code with PKCE, no backend and no client secret. Connect accounts under **More → Backup & settings → Calendars**. Multiple accounts are supported (personal + work, either provider); each event is badged `GCAL` or `OUTLOOK` and names its account.

Synced events are read-only — change the time, title or attendees in the calendar itself. **Notes you write on a synced meeting are yours and are never overwritten by a re-sync**, and a meeting you've written notes on is kept even if the organiser cancels it.

### Before it will connect

Both providers only accept sign-ins that come back to a **registered redirect URI**, which is the app's own URL including the trailing slash:

```
https://katjiowild.github.io/kaktus-cafe/
```

- **Google** — signs in through **Google Identity Services** in a popup, not a redirect, so what matters is *Authorised JavaScript origins*, not redirect URIs. Add the **origin only, no path**:
  ```
  https://katjiowild.github.io
  http://localhost:5173
  ```
  Keep the consent screen in **Testing** with yourself as the sole test user; that avoids the public-app verification process.
- **Microsoft** — the registration already has a SPA redirect URI; make sure `Calendars.Read` (delegated) is granted under API permissions. The authority is `/common`, so personal Microsoft accounts work alongside work ones.

> **Why the two providers work differently.** Google's "Web application" OAuth clients require a `client_secret` at the token endpoint, which a browser app cannot hold — so Authorization Code + PKCE cannot complete against one. (A "Desktop app" client isn't an alternative either: those only accept loopback redirect URIs and can never return to the hosted app.) Google is therefore signed in through **Google Identity Services**, which hands back an access token directly with no secret.
>
> The trade-off is that GIS issues no refresh token, so Google tokens last about an hour. That's invisible in practice: when one expires, the app asks GIS to re-issue silently (`prompt: ''`), which succeeds while the Google session is alive, and sync only ever runs from a button press. If the session has genuinely lapsed, you get a "reconnect" message rather than a silent failure.
>
> Microsoft has no such restriction — SPA redirect URIs, PKCE and refresh tokens all work as implemented, so Outlook uses the redirect flow.

## Contacts import (Phase 3)

**More → Backup & settings → Contacts → Import contacts** takes a JSON array of people. Only `name` is required:

```json
[
  { "name": "Priya Nair", "role": "CITES focal point", "howMet": "CoP side event",
    "followUp": true, "log": [{ "at": "2026-06-02T09:00:00Z", "text": "Discussed data sharing." }] },
  { "name": "Tomas Berg" }
]
```

Anyone whose name already exists is **skipped, not overwritten**, so re-running the same file never duplicates people or wipes an interaction log.

## What's not built yet

- **Phase 4** — a Supabase backend so Claude can read live data, cross-device sync, and voice capture. Not scoped yet. The model is deliberately v2-shaped: flat collections, string ids, `createdAt`/`updatedAt` on every record, and owned children (subtasks, milestones, comments, log entries) each carry their own id so they lift into child tables without a rewrite.


