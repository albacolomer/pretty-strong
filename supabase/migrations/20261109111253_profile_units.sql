-- Your units, chosen on Edita el perfil. They only change what the app
-- shows and how you type it: weights, lengths and distances are still
-- stored in kg, cm and metres (data rule 6).
alter table public.profiles
  add column weight_unit text not null default 'kg'
    constraint profiles_weight_unit_check check (weight_unit in ('kg', 'lb')),
  add column length_unit text not null default 'cm'
    constraint profiles_length_unit_check check (length_unit in ('cm', 'in')),
  add column distance_unit text not null default 'km'
    constraint profiles_distance_unit_check check (distance_unit in ('km', 'mi'));

-- The RLS update policy (your own row) still applies.
grant update (weight_unit, length_unit, distance_unit) on public.profiles to authenticated;
