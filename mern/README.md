# Focus Prints ERP — MERN

A MERN re-implementation of the Focus Prints **Checklist & Delegation** modules that
previously ran as a Google Apps Script web app bound to a spreadsheet.

The Apps Script project (`../appsscript/Delegation & checklist/`) is the functional
reference and is left untouched. This folder is a standalone application:

```
mern/
├─ server/          Express + MongoDB API
│  ├─ src/
│  │  ├─ config/    env + database connection
│  │  ├─ models/    User · ChecklistTask · DelegationTask · Counter · Holiday
│  │  ├─ middleware auth (JWT) · error handler · multer upload
│  │  ├─ services/  mail (nodemailer) · templates · daily reminder cron
│  │  ├─ controllers auth · users · checklist · delegation · uploads
│  │  └─ routes/    one router mounted at /api
│  ├─ scripts/      seed.js + the Doer List / Holiday data pulled from the workbook
│  └─ uploads/      proof-of-completion files (replaces Google Drive)
└─ client/          React 18 + Vite + Tailwind
   └─ src/
      ├─ api/       axios client + typed service wrappers
      ├─ context/   AuthContext (session + role entitlements)
      ├─ components Layout · Sidebar · Topbar · shared UI · per-module panels
      ├─ pages/     Login · Overview · Delegation · Checklist · Tasks
      └─ utils/     dates, permissions, navigation map, SweetAlert wrappers
```

---

## Quick start

**Prerequisites:** Node 18+ and a MongoDB instance (local `mongod` or Atlas).

```bash
# 1 — API
cd mern/server
npm install
cp .env.example .env          # then edit MONGODB_URI / JWT_SECRET / mail settings
npm run seed                  # loads the 31 people from the Doer List sheet
npm run dev                   # http://localhost:5000

# 2 — Web client (second terminal)
cd mern/client
npm install
npm run dev                   # http://localhost:5173  (proxies /api to :5000)
```

Sign in with any name from the **Doer List** sheet, e.g. `Shreyansh` / `SD@Focus123`
(a Delegator in the Admin department, so all three modules are visible) or
`Prachi` / `Prachi@Focus123` (a Delegatee, so only the Task Center is).

Useful seed flags:

```bash
npm run seed -- --reset       # wipe users, holidays, tasks and id counters first
npm run seed -- --demo        # also insert a few sample tasks
```

### Single-origin production build

`server/src/app.js` serves `client/dist` when it exists, so one process can host both:

```bash
cd mern/client && npm run build
cd ../server   && npm start        # app + API on http://localhost:5000
```

---

## What was ported

| Apps Script | MERN |
| --- | --- |
| `Index.html` login + nav shell | `pages/Login.jsx`, `components/Layout.jsx` + `Sidebar`/`Topbar`, `AuthContext` |
| `Delegation.html` | `pages/Delegation.jsx` + `components/delegation/*` |
| `Checklist.html` | `pages/Checklist.jsx` + `components/checklist/*` |
| `Tasks.html` | `pages/Tasks.jsx` + `components/tasks/*` |
| `Doer List` sheet | `User` collection |
| `Checklist` sheet | `ChecklistTask` collection |
| `Delegation` sheet | `DelegationTask` collection |
| `Holiday list` sheet | `Holiday` collection |
| `google.script.run` calls | REST endpoints under `/api` |
| `MailApp.sendEmail` | `services/mailService.js` (nodemailer) |
| `Drive.Files.create` | `POST /api/uploads` → local disk, served from `/uploads` |
| `ScriptApp` daily 9 AM trigger | `node-cron` job in `services/reminderService.js` |

### Passwords

Passwords are stored **in plaintext**, exactly as column B of the `Doer List` sheet held
them — no hashing, so `npm run seed` and the sheet stay interchangeable. The field is
`select: false`, which keeps it out of ordinary queries but is not encryption: anyone who
can read the `users` collection, a database backup or a connection string can read every
user's real password. Restrict database access accordingly, and prefer a private network
or IP allow-list over a publicly reachable MongoDB instance.

### Business rules kept identical

* **Task IDs** stay `Task-N`, now issued atomically by a `Counter` document instead of
  scanning the sheet for the maximum.
* **Checklist recurrence** — Daily generates 365 occurrences, Weekly 52, Monthly 12,
  Quarterly 4, all from the first selected date; Yearly and blank use exactly the dates
  picked on the calendar. Month arithmetic clamps to the last valid day (Jan 31 → Feb 28).
  All rows from one form row share a `Group ID`.
* **Checklist auto-verification** — completing a task whose *Proof is Required* is `No`
  marks it verified immediately; `Yes` leaves it awaiting the named verifier.
* **Delegation completion** — `Approval Required = Yes` moves the task to
  *Approval Waiting*; otherwise a completion after the end of the revised (or original)
  due day becomes *Completed With Delay*.
* **Bulk status update** — reverting a task to *Pending* clears its completion time; every
  change appends to the remark history with the acting user and resulting status.
* **Revision** — writes the revised date and increments *Count of Revisions*, logging a
  `Revised Due Date` entry in the remark history.
* **Assignment emails** — the purple delegation template and the green checklist template
  are ports of the original HTML, one mail per person + description rather than one per
  generated occurrence.
* **Daily reminders** — one mail per pending Delegation task and per checklist task with
  an empty *Actual*, deduplicated through a `lastReminderSent` field so a re-run on the
  same day sends nothing.
* **Default views** — Delegation opens on *Pending · Approval Waiting · Overdue*;
  Checklist opens on today + tomorrow; the Task Center opens on pending work.

### Role model

Ported from `configureNavigationByRole()` and enforced again on the server:

| Role | Department | Modules | Landing |
| --- | --- | --- | --- |
| Delegator | Admin | Delegation · Checklist · Tasks | Delegation |
| Delegator | other | Delegation · Tasks | Delegation |
| Admin / PC | any | Delegation · Checklist · Tasks | Delegation |
| Delegatee / User | any | Tasks | Tasks |

Write permissions (`server/src/utils/permissions.js`):

* Creating, editing and deleting tasks — Delegator, Admin, PC only.
* Remarks and status changes — Admin/PC, or the task's own delegator.
* Completing / revising — the doer, the delegator, or the assigned sub-monitor.
* Verifying a checklist task — only the person named in *Verified by* (or Admin/PC).
* The "All | By Me | To Me" switcher is offered to Delegator/Admin/PC only; a Delegatee's
  view is always scoped to their own work.
* A sub-monitor who is neither delegator nor delegatee stops seeing a task once it
  completes — the same auto-removal the Apps Script did.

---

## Deliberate differences

These change *how* something is done, not *what* it does:

1. **Sessions are JWTs**, not the `base64(username|email)` token the Apps Script stored.
2. **The strict Google-account check** in `authenticateUserWithToken` has no equivalent
   outside Apps Script and was dropped; ordinary username/password auth replaces it.
3. **Recurrence expansion moved server-side.** The browser used to POST up to 365 rows;
   it now sends one row per form entry and the server expands it, using the same rules.
4. **Remark history is a real array** of `{ time, remark, user, status }` subdocuments
   rather than a JSON string in a cell. The client still reads the legacy string form.
5. **Proof files land on local disk** under `server/uploads` and are served from
   `/uploads`. Point `UPLOAD_DIR` at a mounted volume, or swap `uploadController.js`
   for S3/Drive, before deploying.
6. **Dates are stored as real `Date` values** and travel as ISO strings; the
   `dd MMM yy` display formatting happens in `client/src/utils/format.js`.
7. **The Task Center opens on the tab that has pending work** when the default
   (Delegation) tab is empty, instead of always landing on an empty list.
8. **An Overview dashboard is the landing page** for every role, replacing the
   straight-to-a-module landing. It adds no endpoints and performs no writes.
9. **Hold and In Progress are filterable.** The remark panel could always set them,
   but the old status filter offered neither, so a task moved to Hold vanished with no
   way to bring it back. Both are now in the filter list and in the default view.

## Configuration

All server settings live in `server/.env` — see `.env.example` for the annotated list.
The ones worth knowing:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | database connection string |
| `JWT_SECRET` | **must** be changed before deploying |
| `CLIENT_URL` | CORS allow-list (comma-separated, or `*`) |
| `SERVER_URL` | public base URL used to build uploaded-file links |
| `MAIL_HOST` … `MAIL_FROM` | SMTP; leave `MAIL_HOST` empty to log mail instead of sending |
| `REMINDER_CRON` / `TZ_NAME` | reminder schedule, default `0 9 * * *` in `Asia/Kolkata` |
| `ENABLE_REMINDERS` | set `false` to disable the cron entirely |
| `MAX_UPLOAD_MB` | proof upload cap, default 15 |

`POST /api/reminders/run` (Admin/PC) fires the daily reminder pass on demand.

## API surface

```
GET    /api/health
GET    /api/auth/usernames            POST /api/auth/login
POST   /api/auth/forgot-password      POST /api/auth/reset-password
GET    /api/auth/me                   POST /api/auth/change-password

GET    /api/users                     GET  /api/users/departments
GET    /api/users/hierarchy           POST /api/users            PATCH /api/users/:id

GET    /api/checklist                 GET  /api/checklist/summary
POST   /api/checklist/bulk            POST /api/checklist/complete
POST   /api/checklist/verify          POST /api/checklist/revise
PUT    /api/checklist/group/:groupId  DELETE /api/checklist/group/:groupId
DELETE /api/checklist/:taskId

GET    /api/delegation                POST /api/delegation
PUT    /api/delegation/:taskId        DELETE /api/delegation[/:taskId]
POST   /api/delegation/bulk-status    POST /api/delegation/complete
POST   /api/delegation/revise

POST   /api/uploads                   DELETE /api/uploads/:filename
POST   /api/reminders/run
```

Every response is `{ success, ... }`; failures carry `{ success: false, message }`.

## Design system

**Layout.** A fixed dark rail on the left holds the logo, the module navigation and
the signed-in user; it collapses to a 76px icon rail (remembered in `localStorage`)
and becomes a slide-over drawer under `lg`. A sticky topbar carries the current page
title, the date and the user menu, so pages never repeat their own heading. Every
page then follows the same rhythm: a strip of KPI tiles, then one or more titled
`<Section>` panels holding the real content.

**Colour.** The `brand` scale in `client/tailwind.config.js` is built out from
`#904A20`, sampled directly from the logo's wordmark; `brand-950` is the sidebar and
drawer-header ground. Neutrals use a custom warm `sand` ramp rather than Tailwind's
cool greys, which clash with copper. Status colours stay semantic and are the only
non-brand hues: amber for pending, blue for approval-waiting, emerald for completed,
red for overdue, violet for completed-with-delay.

**Type.** Outfit for headings and figures — its geometric, slightly rounded shapes
echo the logo lettering. Inter for body and UI text. JetBrains Mono for task IDs,
group IDs and timestamps, with `font-variant-numeric: tabular-nums` on the KPI
figures so digits do not jitter as counts change.

**Responsive behaviour.** Verified with an automated sweep at 360 / 390 / 430 /
768 / 1024 / 1280 / 1536px — no page overflows horizontally at any width, and
every interactive control clears the 24px minimum tap size.

| Element | Phone | Tablet | Laptop and up |
| --- | --- | --- | --- |
| Sidebar | slide-over drawer | drawer | fixed rail, collapsible to 76px |
| KPI tiles | two-up, hint line dropped | two-up | full row of four |
| Delegation rows | one card each | two cards per row | table with 5 frozen columns |
| Task Center cards | one-up | two-up | three-up |
| Checklist / Task tables | scroll inside their own container | same | same |
| Forms and drawers | single column, full-bleed | single column | two columns |
| Data tables | page scrolls | page scrolls | table body scrolls, header pinned |

The Delegation table's five frozen columns total 622px, so pinning is applied
only from `lg` up — below that they would be wider than the viewport and stack
on top of each other. Under `lg` the module switches to `DelegationCard`, which
puts the task title, flow, due date and actions in view without any horizontal
scrolling.

**Components.** `common.jsx` holds the reusable primitives — `StatCard`, `Section`,
`PageBody`, `Toolbar`, `RoleSwitcher`, `ToggleGroup`, `StarRating`, `Avatar`, `Pill`
and the empty/error/loading states — so the three modules stay visually identical
without duplicating markup. Semantic class shortcuts (`fp-btn-primary`, `fp-input`,
`fp-section`, `fp-th`) live in `index.css`.

**Overview.** A read-only landing page that aggregates the delegation and checklist
data the user is already entitled to see: KPI tiles, an "up next" queue sorted by due
date, the delegation status mix, a recent-activity feed built from remark history, and
module shortcuts. It reuses the same `filterDelegationByRole` scoping as the Delegation
module, so a Delegatee never sees another person's tasks in the feed.

The four KPI tiles are links into the Task Center, each carrying the filter that
produced its figure:

| Tile | Opens |
| --- | --- |
| Open tasks | `/tasks?scope=tome&quick=open` |
| Due today | `/tasks?scope=tome&quick=today` |
| Overdue | `/tasks?scope=tome&quick=delayed` |
| Awaiting you | `/tasks?quick=verify` |

Two details make the figure and the destination agree rather than merely look
related:

* **`scope=tome`** on the personal tiles. Those count *your* work, while the Task
  Center's default tab shows everything a manager can see — without it, "Open
  tasks: 0" would land on a list of 66.
* **`quick=open`** skips the checklist module's default today-and-tomorrow window,
  so "Open tasks" really does show everything outstanding. `quick=verify` is the
  other addition: completed work where you are the named verifier and have not yet
  signed off, which also flips the status filter off "pending only" so those tasks
  are not hidden.

Both the visible list and the tab badges run through one `applyLens()` function, so
a badge can never contradict the list. Arriving at `/tasks` with no parameters — the
sidebar link — resets to the default view, so a filter followed from a tile never
sticks.
