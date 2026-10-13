@AGENTS.md
 
# Pretty Strong
 
Personal iPhone gym tracker (in the spirit of Hevy/Strong) for Alba, later for her friends, each with a private account. This is a learning project: when you make an important technical decision, explain the why in 2–3 sentences.
 
Full product spec: `docs/spec.md`. Read the relevant section before starting a feature. User stories are numbered US-01 to US-29; reference them in commits.
 
## Current scope
 
Phase 1, release V1.0 (spec: "MVP scope"). Never build anything listed under "Out of scope for Phase 1". If something seems to need it, stop and ask.
 
## Stack
 
- Expo (current SDK) + React Native + TypeScript in strict mode
- Expo Router: file-based routes in the router folder the template created (`src/app` or `app`)
- Supabase: Postgres, Auth (email + password), Row Level Security. Hosted cloud project, no local Docker stack
- TanStack Query for all server data
- Zustand, persisted with `expo-sqlite/kv-store`, for the active workout
- i18next + expo-localization; locales `ca` (default), `es`, `en`
- expo-notifications (local notifications only), expo-haptics, expo-keep-awake
- StyleSheet + typed theme tokens in `src/theme` (no UI kit, no Tailwind)
- Jest + React Native Testing Library
- The app must keep running in Expo Go. Ask before adding any library that needs a development build.
## Commands
 
- `npx expo start`: dev server; open on the iPhone by scanning the QR code (Expo Go)
- `npx expo install <pkg>`: the only way to add packages, so versions match the SDK
- `npx tsc --noEmit`: type check
- `npm test`: tests
- `npx expo lint`: lint
- `npx supabase migration new <name>`: new SQL migration in `supabase/migrations`
- `npx supabase db push`: apply migrations to the linked cloud project. Ask me before running it
- `npx supabase gen types typescript --linked > src/types/database.ts`: regenerate DB types after every migration
## Layout
 
- Router folder: screens only, kept thin; logic lives in `src/features`
- `src/features/<domain>/`: components, hooks, store, logic. Domains: workout, routines, exercises, schedule, history, auth
- `src/components/ui/`: design-system primitives (Button, Card, NumberInput, Sheet, Toast)
- `src/lib/`: Supabase client, query client, i18n setup, notifications
- `src/theme/`: colour tokens, typography, spacing (spec: "Design system and visual direction")
- `src/locales/`: `ca.json`, `es.json`, `en.json`
- `supabase/migrations/`, `supabase/seed.sql` (built-in exercise library)
- Pure logic (e.g. `compareToLastTime.ts`) has no React imports and has tests
## Data rules (never break these)
 
1. Starting a workout copies the routine into `session_exercises`. Editing a routine never changes past sessions. `session_exercises.routine_exercise_id` links back to the plan.
2. Store raw facts only. PRs, totals, stats and "last time" are SQL functions or views, never stored columns.
3. Exercises and routines are archived (`archived_at`), never hard-deleted.
4. RLS on every table: users read and write only their own rows (directly by `user_id = auth.uid()` or through the parent row). Built-in exercises (`owner_id` null) are readable by everyone and writable by no one.
5. IDs for sessions, session exercises and sets are UUIDs generated on the phone. A finished workout is uploaded through one Postgres function in a single transaction, as an idempotent upsert.
6. Units live in column names: `weight_kg`, `distance_m`, `duration_s`, `speed_kmh`, `incline_pct`. Convert only in the UI.
7. Every logged set gets `completed_at`.
8. `workout_sessions` has `source` ('manual' for now) and `external_id` for future imports.
9. Every schema change is a new migration file. Never edit a migration that has been applied.
## App rules
 
- Every user-facing string goes through `t()`. Add each key to all three locale files, Catalan first. No hard-coded text.
- Rest timer: store the timestamp when rest ends, derive the countdown from it, and schedule a local notification for that moment. Never count with `setInterval` alone.
- The active workout lives in the persisted store and is saved on every change. It must survive an app kill and work with no signal.
- Gym UX: touch targets at least 48 pt (the ✓ at least 56 pt), main actions in the bottom half, numeric keypad for numbers, an undo toast instead of "Are you sure?" for reversible actions, every swipe action also in a menu.
- Colours, type and spacing come only from `src/theme`. Dark by default, whatever the iPhone is set to (`Appearance.setColorScheme('dark')` in the root layout); keep the light tokens defined for a possible light option later.
- No secrets in the app. Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` go in `.env` (gitignored); keep `.env.example` up to date.
## How to work with me
 
- Plan first for anything touching more than about 3 files, and wait for my OK.
- Work in small steps (one user story or sub-task). The app must start after every step.
- After each step: run the type check and tests, then tell me exactly what to try on my iPhone.
- Ask before adding a dependency and say why it's needed.
- Commit messages: conventional style with the story, e.g. `feat(workout): rest timer (US-17)`. Never push without asking.
- My machine: Windows, VS Code, iPhone with Expo Go. No Mac, no iOS simulator.