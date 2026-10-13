# Pretty Strong — Phase 1 Product Spec

Oct 7, 2026 · @Alba Colomer

## Product vision

A personal iPhone gym tracker that puts routines, logging, rest timing and exercise help in one pleasant app. It is built first for Alba, then for her friends, each with a private account.

**What it replaces today**

- Notes for routines, reps and weights → routines plus live logging with last time pre-filled
- The phone stopwatch → a rest timer that starts on its own and alerts you when the phone is locked
- Searching the web or TikTok for technique → exercise notes and in-app video now, an AI coach in Phase 2

**Training it must support:** a fixed weekly plan that mixes an upper/lower strength split, HYROX, running, ab circuits and cardio finishers (stairmaster, incline walk).

**Principles**

1. Fast in the gym: one tap per set, usable one-handed between sets.
2. Flexible: reorder, swap or skip without breaking the plan.
3. Honest history: record what actually happened; editing a routine never rewrites the past.
4. Simple and pretty: calm layout, soft pink, a little girly.
5. Clean foundation: store raw facts so AI agents, Garmin and friends plug in later without rework.

## MVP scope

Phase 1 ships as two releases on the same data model. V1.0 replaces Notes and the stopwatch in the gym; V1.1 adds the progress views. The database covers both from day one, so V1.1 is new screens and queries, not a migration of old data.

**V1.0: in the gym**

- **Account:** email + password sign-in, unique username, language (Catalan by default, Spanish, English)
- **Exercise library:** about 80 built-in exercises plus custom ones; personal notes and default rest on any exercise
- **Routines:** ordered exercises, supersets and circuits, planned number of sets and rest per exercise, a label (Strength, HYROX, Run, Other)
- **Weekly schedule:** each weekday points to a routine or to rest
- **Today:** start today's routine, swap it, skip it, mark it done, or start any other routine
- **Live logging:** sets pre-filled from last time, one-tap tick, "vs last time" indicator, drop sets, optional RPE
- **Mid-workout changes:** reorder, swap, add or skip exercises and sets for this session only, with an optional reason
- **Rest timer:** starts on tick, per-exercise default, pause, skip, ±15 s, vibration and notification when it ends
- **Quick log:** mark a session done and add exercises and results afterwards
- **Cardio:** segments with duration, distance, speed, incline and level; runs as distance + time with pace calculated
- **Finish:** summary, energy 1–5, notes
- **History:** past workouts, edit and delete them, log a workout after the fact
- **Reliability:** the active workout works offline and resumes after the app closes

**V1.1: progress**

- **Exercise progress:** chart of top weight, estimated 1RM, volume or reps; ranges 1M, 3M, 1Y, All; past sessions; how often trained
- **Stats:** consistency calendar, sets per muscle group per week, cardio totals by type
- **Video:** YouTube tutorial played inside the app (TikTok best effort)
- **Body:** bodyweight, measurements, progress photos
- **Schedule:** "shift week forward" after a skipped day

If V1.1 grows too big, progress photos are the first thing to cut: they are the only feature that needs private file storage.

## User stories

29 stories, each with an ID so tasks in Claude Code can reference them. Stories are grouped by area, in the order a workout happens.

### V1.0

| ID | As Alba, I want to… |
| --- | --- |
| US-01 | Sign up and log in with email and password, so my data stays private on my own account |
| US-02 | Use the app in Catalan by default, or switch to Spanish or English |
| US-03 | Search the built-in exercises by name, muscle and equipment |
| US-04 | Create a custom exercise with name, muscles, equipment and tracking type |
| US-05 | Add personal notes (seat height, cues) and a default rest to any exercise |
| US-06 | Archive exercises and routines I no longer use without losing history |
| US-07 | Create a routine with ordered exercises and a planned number of sets |
| US-08 | Group exercises into a superset or a circuit done in rounds |
| US-09 | Assign a routine, or rest, to each weekday |
| US-10 | Edit a routine when I want a change to apply every time |
| US-11 | See today's workout when I open the app and start it in one tap |
| US-12 | Swap today's routine for another, or skip the day, with an optional reason |
| US-13 | See each set pre-filled with last time's numbers and tick it in one tap |
| US-14 | See whether I beat last time on each exercise, so I can apply progressive overload |
| US-15 | Reorder, swap, add or skip exercises mid-workout without changing the routine |
| US-16 | Log drop sets and, when I want, RPE |
| US-17 | Have rest start on its own after a set, and pause, skip or adjust it |
| US-18 | Get a vibration and a notification when rest ends, even with the phone locked |
| US-19 | Log cardio as segments (duration, speed, incline, level) and runs as distance + time |
| US-20 | Mark a HYROX session done and add the details afterwards |
| US-21 | Finish with a summary, an energy score from 1 to 5 and notes |
| US-22 | Keep logging with no signal, and resume if the app closes |
| US-23 | Browse, edit and delete past workouts |
| US-24 | Log a whole workout after the fact |

### V1.1

| ID | As Alba, I want to… |
| --- | --- |
| US-25 | See an exercise's progress chart and its past sessions |
| US-26 | See a consistency calendar, sets per muscle group per week and cardio totals |
| US-27 | Watch a technique video for an exercise inside the app |
| US-28 | Log bodyweight, measurements and progress photos |
| US-29 | Shift the rest of the week forward after skipping a day |

## Core user flows

Nine flows cover V1.0. Every in-workout change touches only the current session; the routine changes only from the routine editor.

**1. Start today's workout**

1. Open the app. Today shows the week strip and today's card, e.g. "Tuesday · Upper Body 1" with its exercises.
2. Tap Start. The app copies the routine into a new session and opens the active workout.
3. Other actions on the card: Swap, Skip, Mark as done. Any routine can also be started from the Plan tab.

**2. Log a set and rest**

1. The current exercise shows its planned sets, pre-filled with last time's weight and reps (this routine first, then anywhere).
2. Do the set, edit the numbers if they differ, tap ✓.
3. The rest timer starts with the exercise's default. A bar at the bottom offers pause, skip and ±15 s.
4. When rest ends: vibration plus a notification such as "Next: Lat pulldown, set 3", even with the phone locked.
5. After the last set, a "vs last time" badge shows ↑, = or ↓, and the next exercise comes into focus.
6. In a superset or circuit, a tick moves to the next exercise in the group. Rest starts after the last exercise of the round.

**3. Change things mid-workout**

- Reorder: drag an exercise card.
- Swap: pick another exercise; optional reason (machine busy, pain, tired, no time).
- Add an exercise or a set; skip an exercise or a set.
- None of this changes the routine. To make a change permanent, edit the routine.

**4. Swap or skip the day**

- Swap: Today → Swap → pick a routine, optional reason. It replaces today's plan only.
- Skip: Today → Skip → optional reason. The day shows as skipped on the week strip.
- V1.1: after a skip, offer "Shift week forward".

**5. Quick-log a session (e.g. HYROX)**

1. Either tap Mark as done on Today, or start the session, log what you can, and finish.
2. Optionally add duration and notes.
3. Later, open it from History and add exercises and results.

**6. Log cardio**

- Machines (incline walk, stairmaster, ski erg): each row is a segment with duration and any of distance, speed, incline, level. Minutes 1–5 at incline 5, then 5–10 at incline 10, is two rows.
- Runs: distance and time; pace is calculated.

**7. Finish and resume**

1. Tap Finish. The summary shows duration, exercises, sets, volume and the "vs last time" highlights.
2. Add energy 1–5 and notes if you want, then Save.
3. If the app closed or the phone died, opening it shows "Resume workout".

**8. Edit or backfill history**

- History → a workout → edit sets, add or remove exercises, change date or duration, or delete.
- History → + → pick a routine and a date, fill in the sets.

**9. Set up routines and the week**

1. Plan → Routines → New: name, label, add exercises, set planned sets and rest, group exercises, reorder.
2. Plan → Week: assign a routine or Rest to each day, Monday to Sunday.

## Screen list

V1.0 has 15 screens and sheets. V1.1 adds a Progress tab and extends the exercise detail.

| Screen | Lives in | Purpose |
| --- | --- | --- |
| Sign in / Sign up | Auth stack | Email + password, username, language |
| Today | Today tab | Week strip, today's card (Start, Swap, Skip, Mark as done), resume banner |
| Active workout | Full-screen modal | Exercise cards, sets, rest bar, reorder, add, swap, finish |
| Exercise picker | Sheet | Search and filter the library to add or swap an exercise |
| Rest timer | Bottom bar + sheet | Countdown, pause, skip, ±15 s |
| Reason picker | Sheet | Optional reason chips for a swap or skip |
| Workout summary | Modal | Totals, "vs last time" highlights, energy 1–5, notes |
| History | History tab | Workouts by date, newest first; + to log a past workout |
| Workout detail | History stack | View and edit a finished workout |
| Plan | Plan tab | Segments: Routines, Exercises, Week |
| Routine editor | Plan stack | Name, label, exercises, groups, planned sets, rest |
| Weekly schedule | Plan stack | Monday to Sunday → routine or Rest |
| Exercise detail | Plan stack, or ⓘ in a workout | Muscles, equipment, your notes, default rest, recent sessions |
| Exercise editor | Plan stack | Create a custom exercise; personal additions on a built-in one |
| Profile | Profile tab | Username, language, default rest, notifications, sign out |

**V1.1 additions**

- Progress tab with **Stats** (consistency calendar, sets per muscle group per week, cardio totals) and **Body** (bodyweight, measurements, photos)
- Exercise detail gains the progress chart and the in-app video

## Navigation structure

Four tabs in V1.0 (Today, History, Plan, Profile), with Progress added in V1.1. The active workout is a full-screen modal over the tabs, so nothing outside it can be tapped by accident mid-set.

&#91;embedded content: navigation · 4 tabs (5 in V1.1), 1 workout modal\]

- The app always opens on Today.
- Swiping the workout down shrinks it into a bar above the tabs ("Upper Body 1 · 32:10"), so you can check History mid-workout; tap the bar to return.
- Sheets (exercise picker, rest timer, reason picker) slide up over the workout and never leave it.
- Only one workout can be active at a time.

## Data model

A relational Postgres model in Supabase with 10 tables in V1.0. Only raw facts are stored; PRs, charts and stats are calculated from sets.

&#91;embedded content: data model · plan, log and library\]

The plan (left) and the log (right) never share rows: starting a workout copies the plan into the log, and both point at the same exercise library.

### Tables

| Table | Key fields | Notes |
| --- | --- | --- |
| profiles | id (= auth user id), username (unique), language, created\_at | One row per user |
| exercises | id, owner\_id, name, name\_i18n, tracking\_type, primary\_muscles\[\], secondary\_muscles\[\], equipment, is\_unilateral, video\_url, archived\_at | owner\_id empty = built-in. Built-ins use name\_i18n {ca, es, en}; custom ones use name |
| user\_exercise\_settings | user\_id, exercise\_id, notes, default\_rest\_s | Your personal layer on any exercise, built-in or custom |
| routines | id, user\_id, name, label, notes, archived\_at | label: strength, hyrox, run, other |
| routine\_exercises | id, routine\_id, exercise\_id, position, group\_key, planned\_sets, rest\_s, notes | Same group\_key = superset or circuit; planned\_sets = rounds |
| weekly\_schedule | user\_id, weekday (1–7), routine\_id | Empty routine\_id = rest day |
| workout\_sessions | id, user\_id, date, planned\_routine\_id, routine\_id, status, log\_mode, started\_at, ended\_at, energy, notes, change\_reason, source, external\_id | status: in\_progress, completed, skipped. log\_mode: live, quick. source: manual for now |
| session\_exercises | id, session\_id, exercise\_id, routine\_exercise\_id, position, group\_key, rest\_s, change, swapped\_from\_id, change\_reason, notes | change: added, swapped, skipped, or empty |
| sets | id, session\_exercise\_id, position, set\_type, weight\_kg, reps, duration\_s, distance\_m, speed\_kmh, incline\_pct, level, rpe, completed\_at | set\_type: normal, drop. Unused columns stay empty |
| app\_config | key, value | Seed version of the exercise library, feature flags |

V1.1 adds `body_metrics` (date, type, value), `progress_photos` (date, storage\_path) and `schedule_overrides` (date, routine\_id) for "shift week forward".

### Tracking types

The tracking type decides which set columns the logging row shows.

| Type | Columns shown | Examples |
| --- | --- | --- |
| weight\_reps | weight\_kg, reps | Lat pulldown, hip thrust, wall balls |
| bodyweight\_reps | reps, optional weight\_kg | Dead bug, reverse crunch |
| duration | duration\_s | Plank, side plank |
| weight\_distance | weight\_kg, distance\_m | Sled push, farmers carry |
| cardio\_machine | duration\_s, distance\_m, speed\_kmh, incline\_pct, level | Incline walk, stairmaster, ski erg |
| run | distance\_m, duration\_s (pace calculated) | Sunday run |

One-sided exercises (is\_unilateral) are logged per side: 10 reps means 10 each leg.

### Design rules, and why

1. **Snapshot on start.** Starting a workout copies the routine into session\_exercises. *Why:* history shows what you did, and routine\_exercise\_id still links each exercise to its plan, giving the AI "planned vs actual" later.
2. **Raw facts only.** No stored PRs or totals; SQL functions calculate them. *Why:* one source of truth, no stale numbers, and PRs later are a new query, not a migration.
3. **Archive, don't delete.** Exercises and routines get archived\_at. *Why:* past workouts keep pointing at real rows.
4. **Row Level Security on every table.** Each row is visible only when user\_id matches the signed-in user; built-ins are readable by everyone, writable by no one. *Why:* privacy is enforced by the database, not by app code you might forget.
5. **IDs generated on the phone (UUIDs).** *Why:* a workout created offline uploads with its final IDs, and a retried upload updates instead of duplicating.
6. **Units in column names** (weight\_kg, distance\_m, duration\_s). *Why:* no guessing what a number means; the UI formats it.
7. **Timestamps on sets** (completed\_at). *Why:* real rest times and session pace become analysable later.
8. **source + external\_id on sessions.** *Why:* Garmin, Strava or Apple Health imports can be matched and never duplicated.

## Key UI components

Fifteen reusable components carry V1.0; the set row and the rest bar matter most, because they are touched dozens of times per session.

| Component | What it does |
| --- | --- |
| WeekStrip | Monday to Sunday with today highlighted; dots for done, skipped, planned, rest |
| TodayCard | Today's routine, exercise preview, Start, Swap, Skip, Mark as done |
| ResumeBanner | Appears when an unfinished workout exists; one tap to resume |
| ExerciseCard | Name, ⓘ for details and notes, set rows, + set, menu (swap, skip, reorder, notes) |
| SetRow | Columns follow the tracking type; last time's values pre-filled in a softer colour; large ✓ |
| NumberInput | Numeric keypad, quick steppers (±2.5 kg, ±1 rep), large touch area |
| GroupBracket | Pink bracket joining a superset or circuit, with a round counter |
| CardioSegmentRow | Duration, distance, speed, incline, level; + segment |
| RestTimerBar | Sticky bottom bar with countdown; tap to expand; pause, skip, ±15 s |
| VsLastTimeBadge | ↑ +2.5 kg, ↑ +1 rep, = same, ↓ lower |
| ReasonChips | Machine busy, pain, tired, no time |
| ExercisePicker | Search, filter chips for muscle and equipment, recent exercises first |
| WorkoutSummary | Duration, sets, volume, highlights, energy 1–5, notes |
| UndoToast | Replaces confirmation dialogs for reversible actions |
| EmptyState | Friendly first-run states for routines, history and schedule |

V1.1 adds ConsistencyCalendar, ProgressChart, MuscleSetsBar and VideoPlayer.

## Design system and visual direction

Dark by default, whatever the iPhone's light/dark setting, with a soft rose-pink accent: calm, rounded and a little girly, readable at a glance between sets. The light tokens are kept so a light option can be added later.

### Colour tokens

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| background | #0F0B0E | #FFF7FA | Screen background |
| surface | #1B1519 | #FFFFFF | Cards, sheets |
| surface-raised | #261E23 | #FBEFF4 | Inputs, active card |
| text | #F8F1F5 | #2A1E24 | Main text |
| text-muted | #B9A8B1 | #7B6871 | Labels, last-time values |
| accent | #FF7EB6 | #E0508C | Buttons, ticks, timer, brackets |
| accent-soft | #FF7EB6 at 15% | #E0508C at 12% | Selected rows, chips |
| on-accent | #2B0F1C | #FFFFFF | Text on accent buttons |
| up | #7ED9A6 | #2E9E64 | "Beat last time" |
| down | #FFB86B | #C9771F | "Below last time" (amber, not red: a lighter day is not a failure) |
| danger | #FF6B6B | #D64545 | Delete |

### Type, shape and motion

- **Font:** SF Pro, the iPhone system font. Tabular (fixed-width) digits for weights and the timer, so numbers don't jump as they change.
- **Sizes:** timer 48 bold, screen title 28 bold, card title 20 semibold, body 17, set inputs 22 semibold, caption 13.
- **Shape:** cards with 16-pt corners, inputs 12 pt, pill-shaped buttons, no heavy shadows.
- **Icons:** one rounded icon set (SF Symbols through expo-symbols).
- **Delight, kept small:** a soft haptic on every tick, and a tiny sparkle on the badge when you beat last time.

### Gym UX rules

1. Touch targets of at least 48 pt; the ✓ button at least 56 pt.
2. Main actions in the bottom half, within thumb reach.
3. The current exercise and the rest countdown are readable at arm's length.
4. No typing during a workout except numbers; steppers for common changes.
5. The screen stays awake during an active workout.
6. Haptics on tick and when rest ends.
7. Undo instead of "Are you sure?" for anything reversible.
8. Every swipe action also lives in a menu, for sweaty hands.

## Technical architecture

An Expo app talks directly to Supabase; there is no custom backend server in V1. The only offline-capable part is the active workout, kept in a local store until it uploads.

&#91;embedded content: architecture · app, Supabase, later phases, build path\]

The workout store is the only part that must work without signal; on finish it uploads the whole session in one call. Dashed parts are later phases.

### Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | React Native + Expo + TypeScript | One codebase, builds on what you know from React, iOS builds from Windows |
| Navigation | Expo Router | Folders and files become screens, tabs and modals, like Next.js |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions | Workouts are relational; SQL makes "sets per muscle per week" one query; RLS gives multi-user privacy; Edge Functions will host the AI |
| Server data | TanStack Query | Caching, retries and background refresh, so screens stay fast and simple |
| Active workout | Zustand store persisted to expo-sqlite's key-value store | Survives app kills, works with no signal, and runs in Expo Go (MMKV would need a development build) |
| Types | Supabase CLI type generation + Zod | Database types flow into the app; Zod checks data at the edges |
| Language | i18next + expo-localization | Catalan by default, Spanish and English |
| Device | expo-notifications, expo-haptics, expo-keep-awake | Rest alerts, tick feedback, screen awake |
| Styling | StyleSheet + typed theme tokens | No extra build step; light and dark from one token file |
| Tests | Jest + React Native Testing Library | For the logic that must be right: pre-fill, "vs last time", sync |
| Builds | EAS Build, EAS Update, TestFlight | Cloud iOS builds without a Mac; over-the-air fixes; easy sharing with friends later |
| V1.1 | A Skia-based chart library; react-native-youtube-iframe | Chosen when V1.1 starts |

*Why Supabase over Firebase:* Firebase stores documents, which makes cross-workout questions (weekly sets per muscle, progression) awkward and slow. Postgres answers them in SQL, and the same SQL functions will become AI tools in Phase 3.

### Key mechanisms

**Offline-safe workout.** The active session lives in the local store and is saved on every tick. On finish, or whenever signal returns, the app sends the whole session in one call to a Postgres function that writes it in a single transaction. *Why:* a workout is never half-saved, and phone-made IDs make retries safe. Other screens are online, with cached data readable offline.

**Rest timer.** The app stores the moment rest ends, not a counter. The countdown is calculated from that timestamp, and a local notification is scheduled for the same moment. Pause cancels the notification and stores the time left; resume schedules a new one. *Why:* iOS freezes the app's code when the phone is locked, so a counter would stop; a timestamp and a scheduled notification don't.

**"Last time" lookup.** One SQL function returns the sets of each exercise from the last completed session of this routine, falling back to the last session anywhere. It is called once when a workout starts, for all its exercises.

**Translations.** Interface text lives in ca.json, es.json and en.json. Built-in exercise names live in the database (name\_i18n). Dates and numbers use the selected language's format.

**Security.** The app holds only Supabase's public key and the user's session; RLS does the protecting. Future AI keys live only in Edge Functions, never in the app.

**Install on your iPhone.** During development V1.0 runs in Expo Go, which already includes local notifications, SQLite and WebView. A standalone install that works without your PC is an EAS build; installing it on an iPhone or using TestFlight requires a paid Apple Developer Program membership.

## Recommended project structure

One repository with the app and the database side by side, code grouped by feature rather than by file type.

```
gym-app/
├─ app/                        # Expo Router: each file is a screen
│  ├─ _layout.tsx              # providers: auth, query, theme, i18n
│  ├─ (auth)/                  # sign-in.tsx, sign-up.tsx
│  ├─ (tabs)/
│  │  ├─ _layout.tsx           # tab bar
│  │  ├─ today.tsx
│  │  ├─ history/              # index.tsx, [sessionId].tsx
│  │  ├─ plan/                 # index.tsx, routines/[id].tsx,
│  │  │                        # exercises/[id].tsx, schedule.tsx
│  │  └─ profile.tsx
│  └─ workout/                 # full-screen modal: active.tsx, summary.tsx
├─ src/
│  ├─ features/                # one folder per domain
│  │  ├─ workout/              # components, hooks, store, logic
│  │  ├─ routines/
│  │  ├─ exercises/
│  │  ├─ schedule/
│  │  ├─ history/
│  │  └─ auth/
│  ├─ components/ui/           # Button, Card, NumberInput, Sheet, Toast
│  ├─ lib/                     # supabase, query client, i18n, notifications
│  ├─ theme/                   # colour tokens, type, spacing
│  ├─ types/database.ts        # generated from Supabase
│  └─ locales/                 # ca.json, es.json, en.json
├─ supabase/
│  ├─ migrations/              # every database change as versioned SQL
│  ├─ seed.sql                 # built-in exercise library
│  └─ functions/               # Edge Functions (AI, later)
├─ app.config.ts, eas.json, tsconfig.json
└─ CLAUDE.md                   # spec summary and conventions for Claude Code
```

Recent Expo templates put the router folder at `src/app` instead of `app/`; keep whichever the template creates, with everything else under `src/` as shown.

**Why this shape**

- **Feature folders:** everything about the workout (screen parts, store, logic) sits together, so a change touches one folder.
- **Pure logic files** (e.g. `compareToLastTime.ts`) contain no UI, so they are easy to test and reuse.
- **Migrations in Git:** the database can be rebuilt from scratch, and every change is reviewable.
- **SQL functions for shared calculations:** the app now and the AI agents later call the same logic.
- **CLAUDE.md:** gives Claude Code the spec and rules every session, so it doesn't drift from the architecture.

## Future extensibility

Each later phase plugs into something Phase 1 already has; none of them needs the Phase 1 data reshaped.

| Phase | What it needs | Already in Phase 1 |
| --- | --- | --- |
| 2. AI exercise coach | A server place for the LLM and search calls; exercise context | Edge Functions; exercise names in 3 languages, muscles, equipment, video\_url |
| 3. Agent tools | Tools that read your history, routines and progression | SQL functions (last time, weekly sets) become tools; RLS limits the agent to the signed-in user's data when it runs with your session, not an admin key |
| 4. Personal coach | Planned vs actual, context for patterns | routine\_exercise\_id links, change reasons, skips, energy, RPE, set timestamps |
| 5. Multi-agent | Orchestration of several agents | Runs server-side in Edge Functions; the app only needs a chat screen |
| 6. Garmin | Import of runs and HYROX sessions | source + external\_id on sessions; cardio columns match distance, duration, pace. Likely route: Apple Health or Strava, to verify then |
| 7. Social | Friends, sharing, comparisons | Unique usernames, separate accounts, RLS; a shared built-in library. Adds a friendships table and sharing rules |

**Deliberately not built now:** a full offline sync engine, a custom backend server, microservices, GraphQL. Each adds weeks of work and solves problems a one-person, one-phone app doesn't have yet.

## Out of scope for Phase 1

Everything below waits for a later phase or is dropped. If it comes up during development, it goes on this list rather than into the code.

- PRs and PR celebrations
- Benchmarks (HYROX stations, run times)
- All AI features: coach, agents, recommendations
- Garmin, Strava and Apple Health integration
- Friends, sharing, challenges, leaderboards
- Sign in with Apple or Google; logging in with a username
- A fully offline app (only the active workout works offline)
- iPad, web and Android builds
- Programs (weeks, progression schemes, deloads) and targets in routines
- Warm-up sets, and set types beyond normal and drop
- Lock-screen Live Activity and an Apple Watch app
- CSV export and importing old workouts from Notes
- Units other than kg
- Server-sent push notifications (rest alerts are local)

## Open questions

- [ ] App name: Pretty Strong (decided)
- [ ] Final list of the \~80 built-in exercises: your split, HYROX stations and common gym moves
- [ ] Which body measurements to track in V1.1 (e.g. waist, hips, thigh, arm)
- [ ] Join the Apple Developer Program before the first install on your iPhone
