-- Caminar and Estiraments: logged on Avui (a rest day's quick buttons, or
-- + → Registra un esport), never planned in the week, so only sessions get
-- the new codes; weekly_sports_sport_check stays as it is. They're activity,
-- not workouts: the app leaves them out of the weekly goal, the streak and
-- the workout totals.
alter table public.workout_sessions
  drop constraint workout_sessions_sport_check,
  add constraint workout_sessions_sport_check check (sport in ('padel', 'tennis', 'football', 'basketball', 'volleyball', 'climbing', 'hiking', 'swimming', 'cycling', 'yoga', 'dance', 'walking', 'stretching', 'other'));
