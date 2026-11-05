-- US-04/US-05: a photo of one of your own exercises, so you recognise it in
-- the library, the picker and a workout. The picture lives in the private
-- photos bucket, in your own folder ("<user id>/exercise/<uuid>.jpg"), under
-- the bucket's existing policies; the exercise keeps only where it is.
-- Built-ins have their own bundled pictures and never a photo.

alter table public.exercises
  add column photo_path text
    constraint exercises_photo_path_check
      -- "owner_id is not null" is spelled out: for a built-in the comparison
      -- alone would be unknown, which a check lets through.
      check (
        photo_path is null
        or (owner_id is not null and split_part(photo_path, '/', 1) = owner_id::text)
      );
