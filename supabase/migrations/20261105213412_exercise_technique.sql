-- US-03, US-05, US-27: technique on the exercise's page.
-- Built-ins get tips in every language; their video goes in the existing
-- exercises.video_url. Both are filled in by supabase/seed_technique.sql.

-- { ca: [tip, ...], es: [...], en: [...] }. Empty on custom exercises.
alter table public.exercises
  add column technique_i18n jsonb
    constraint exercises_technique_languages check (technique_i18n ?& array['ca', 'es', 'en']);

-- Your own technique video for an exercise, used instead of its video_url.
-- Built-ins are shared, so changing the link there would change it for
-- everyone. Empty means "use the exercise's video".
alter table public.user_exercise_settings
  add column video_url text
    constraint user_exercise_settings_video_url_length check (char_length(video_url) <= 500);
