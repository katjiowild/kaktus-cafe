# Kaktus Cafe

A personal second brain — tasks, projects, notes, meetings, people — built as an installable offline PWA for the phone. Phase 1 (core) and Phase 2 (motivation layer) of `second-brain-scopev4.md`.

## Getting it onto your phone

The app must be served over https to install and work offline. Opening the file directly from storage (`file://`) breaks both — that's why this deploys to GitHub Pages.

**One-time setup:**

1. Create an empty GitHub repo named **`kaktus-cafe`** (public or private — Pages works with both on a free account).
2. From this folder:
   ```
   git remote add origin https://github.com/<your-username>/kaktus-cafe.git
   git push -u origin main
   ```
3. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Push finishes → the Actions tab shows a green tick → your app is live at
   `https://<your-username>.github.io/kaktus-cafe/`
5. Open that URL on the phone in Chrome → menu → **Add to Home screen**. It installs with the designed cactus icon and opens full-screen.

After that, every `git push` to `main` rebuilds and redeploys automatically. You never need Node on your own machine.

> If you name the repo something other than `kaktus-cafe`, nothing breaks — the workflow passes the repo name in as the base path automatically.

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

## Decisions taken during the build

Where the spec and the design package disagreed, these were confirmed with the owner:

| Question | Decision |
|---|---|
| Bottom nav (spec §2 vs design) | The design's bar: **Today · Projects · Calendar · Notes · More**. Tasks lives under More. |
| The design's 10-plant garden cap + Pending queue | **Dropped** — no cap, no queue. Statuses are `active`, `onhold`, `done`, per spec §3.1. |
| Recurrence options | **Specific weekdays included**, per spec §3.3 — the design's picker only had Weekly/Monthly. |
| Phase 1 vs Phase 2 split | **Merged** — the plants are the Projects screen, so building it without them meant building it twice. |

Two smaller conflicts resolved in favour of the design's *code* over its README, which contradict each other:

- Type accents: Retainer = clay, Area = gold (the README's colour table has these two swapped).
- OVERDUE red: `#c0492e` (used throughout the prototype; the README table's `#b23b2e` appears nowhere else).
