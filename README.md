# Pretty Strong

A gym tracker I built for my friends and me. It's made for hybrid training: strength routines, HYROX stations, runs and other sports, all planned and logged in one app. 

🌐 **[Try it in your browser](https://prettystrong.vercel.app/)** 

## Why I built it

Apps like Hevy and Strong are made for lifting, but my friends and I train hybrid: gym, HYROX, running and sports like padel. We wanted one place to plan the week, log a session and see how we did last time, without switching between apps.

## What it does

- **Today:** opens on today's plan. Start your routine, log other activities, track your steps against your daily goal, and see a countdown to your next race.
- **Active workout:** a rest timer, a "vs last time" badge on every set, supersets and RPE, cardio and HYROX measures, and how you felt at the end.
- **Week:** your usual week with routines and sports. Drag them between days, change just this week or every week, and plan the next one.
- **Routines and exercises:** a routine editor with sets, targets and rest times, plus an exercise library with photos and technique notes. You can add your own exercises too.
- **History:** a calendar of everything you've done. Log or edit past workouts.
- **Body:** weight and measurement charts, and progress photos you can compare side by side and lock behind Face ID.
- **Languages:** Catalan, Spanish and English.

## Design

A clean light mode in white and platinum, with steel and metallic details, glacier-blue accents and soft shadows instead of borders. Minimal and sporty. I designed the screens first, then built them. 

### Product decisions

- **Routines, not programs.** You always train from a routine, which keeps the app simple and matches how most people actually train.
- **Workout changes stay in that session.** You can swap or reorder an exercise mid-workout without breaking your routine. Editing the routine is what makes a change permanent.
- **"Last time" instead of targets.** Seeing what you lifted last time is enough to push progressive overload. AI recommendations come later.
- **Week changes for this week or every week.** Life gets in the way, so moving a session shouldn't rewrite your usual plan.

## How it's built

- **App:** React Native, Expo (Expo Router), TypeScript. The same codebase also exports to the web.
- **Data:** Supabase (Postgres, Auth, Storage). There are 36 SQL migrations, and Row Level Security is on every table, so each person only sees their own data.
- **State:** TanStack Query for server data, Zustand for the active workout.
- **Quality:** 75 test files with Jest and Testing Library.
- **Process:** built from a product spec written as user stories. Every commit references the story it delivers, for example `feat(schedule): … (US-09)`.
- **Hosting:** the web version is on Vercel.

## Run it locally

```bash
git clone https://github.com/albacolomer/pretty-strong.git
cd pretty-strong
npm install
cp .env.example .env    # add your Supabase project URL and publishable key
npx supabase db push    # apply the migrations in supabase/migrations to your project
npx expo start          # scan the QR code with your iPhone, or press w for web
npm test
```
