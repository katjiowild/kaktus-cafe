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

## What's not built yet

- **Phase 3** — Google Calendar read-only sync (OAuth 2.0 + PKCE, client-side). The data model already has `source: 'local' | 'google'` and `externalId` on meetings, and the `GCAL` badge renders wherever a Google event appears, so this is an additive change.
- **Phase 4** — v2 shared backend. The model is deliberately v2-shaped: flat collections, string ids, `createdAt`/`updatedAt` on every record, and owned children (subtasks, milestones, comments, log entries) each carry their own id so they lift into child tables without a rewrite.


