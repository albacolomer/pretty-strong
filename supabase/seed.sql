-- Built-in exercise library (US-03).
--
-- Safe to run again: rows are matched by slug and updated in place, never
-- duplicated. To change the library, edit this file and run
--   npx supabase db push --include-seed
-- Never delete a line: to retire an exercise, archive it (archived_at), so
-- past workouts keep pointing at it (data rule 3).
--
-- Columns per line:
--   slug, name (ca), name (es), name (en), tracking type,
--   primary muscles, secondary muscles, equipment, one side at a time
-- In SQL text, an apostrophe is written twice: 'Press d''espatlles'.

insert into public.exercises
  (slug, name_i18n, tracking_type, primary_muscles, secondary_muscles, equipment, is_unilateral)
select
  slug,
  jsonb_build_object('ca', name_ca, 'es', name_es, 'en', name_en),
  tracking_type,
  primary_muscles::text[],
  secondary_muscles::text[],
  equipment,
  is_unilateral
from (values
  -- Chest
  ('barbell_bench_press', 'Press de banca amb barra', 'Press de banca con barra', 'Barbell bench press', 'weight_reps', '{chest}', '{triceps,shoulders}', 'barbell', false),
  ('dumbbell_bench_press', 'Press de banca amb manuelles', 'Press de banca con mancuernas', 'Dumbbell bench press', 'weight_reps', '{chest}', '{triceps,shoulders}', 'dumbbell', false),
  ('incline_dumbbell_press', 'Press inclinat amb manuelles', 'Press inclinado con mancuernas', 'Incline dumbbell press', 'weight_reps', '{chest}', '{shoulders,triceps}', 'dumbbell', false),
  ('machine_chest_press', 'Press de pit a màquina', 'Press de pecho en máquina', 'Machine chest press', 'weight_reps', '{chest}', '{triceps,shoulders}', 'machine', false),
  ('pec_deck', 'Contractor de pit', 'Contractor de pecho', 'Pec deck', 'weight_reps', '{chest}', '{shoulders}', 'machine', false),
  ('cable_fly', 'Obertures amb politja', 'Aperturas en polea', 'Cable fly', 'weight_reps', '{chest}', '{shoulders}', 'cable', false),
  ('push_up', 'Flexions', 'Flexiones', 'Push-up', 'bodyweight_reps', '{chest}', '{triceps,shoulders,abs}', 'none', false),

  -- Back
  ('lat_pulldown', 'Tracció al pit', 'Jalón al pecho', 'Lat pulldown', 'weight_reps', '{lats}', '{biceps,upper_back}', 'cable', false),
  ('seated_cable_row', 'Rem assegut amb politja', 'Remo sentado en polea', 'Seated cable row', 'weight_reps', '{upper_back,lats}', '{biceps,shoulders}', 'cable', false),
  ('machine_row', 'Rem a màquina', 'Remo en máquina', 'Machine row', 'weight_reps', '{upper_back,lats}', '{biceps}', 'machine', false),
  ('barbell_row', 'Rem amb barra', 'Remo con barra', 'Barbell row', 'weight_reps', '{upper_back,lats}', '{biceps,lower_back}', 'barbell', false),
  ('one_arm_dumbbell_row', 'Rem a una mà amb manuella', 'Remo a una mano con mancuerna', 'One-arm dumbbell row', 'weight_reps', '{lats,upper_back}', '{biceps}', 'dumbbell', true),
  ('pull_up', 'Dominades', 'Dominadas', 'Pull-up', 'bodyweight_reps', '{lats}', '{biceps,upper_back}', 'none', false),
  ('assisted_pull_up', 'Dominades assistides', 'Dominadas asistidas', 'Assisted pull-up', 'weight_reps', '{lats}', '{biceps,upper_back}', 'machine', false),
  ('straight_arm_pulldown', 'Pullover amb politja', 'Pullover en polea', 'Straight-arm pulldown', 'weight_reps', '{lats}', '{triceps}', 'cable', false),
  ('face_pull', 'Face pull', 'Face pull', 'Face pull', 'weight_reps', '{shoulders,upper_back}', '{traps}', 'cable', false),
  ('dumbbell_shrug', 'Encongiment d''espatlles amb manuelles', 'Encogimiento de hombros con mancuernas', 'Dumbbell shrug', 'weight_reps', '{traps}', '{forearms}', 'dumbbell', false),
  ('back_extension', 'Extensions lumbars', 'Hiperextensiones', 'Back extension', 'bodyweight_reps', '{lower_back}', '{glutes,hamstrings}', 'machine', false),

  -- Shoulders
  ('dumbbell_shoulder_press', 'Press d''espatlles amb manuelles', 'Press de hombros con mancuernas', 'Dumbbell shoulder press', 'weight_reps', '{shoulders}', '{triceps}', 'dumbbell', false),
  ('machine_shoulder_press', 'Press d''espatlles a màquina', 'Press de hombros en máquina', 'Machine shoulder press', 'weight_reps', '{shoulders}', '{triceps}', 'machine', false),
  ('lateral_raise', 'Elevacions laterals', 'Elevaciones laterales', 'Lateral raise', 'weight_reps', '{shoulders}', '{}', 'dumbbell', false),
  ('cable_lateral_raise', 'Elevació lateral amb politja', 'Elevación lateral en polea', 'Cable lateral raise', 'weight_reps', '{shoulders}', '{}', 'cable', true),
  ('rear_delt_fly', 'Obertures posteriors amb manuelles', 'Pájaros con mancuernas', 'Rear delt fly', 'weight_reps', '{shoulders}', '{upper_back}', 'dumbbell', false),

  -- Arms
  ('dumbbell_curl', 'Curl de bíceps amb manuelles', 'Curl de bíceps con mancuernas', 'Dumbbell curl', 'weight_reps', '{biceps}', '{forearms}', 'dumbbell', false),
  ('hammer_curl', 'Curl martell', 'Curl martillo', 'Hammer curl', 'weight_reps', '{biceps}', '{forearms}', 'dumbbell', false),
  ('barbell_curl', 'Curl de bíceps amb barra', 'Curl de bíceps con barra', 'Barbell curl', 'weight_reps', '{biceps}', '{forearms}', 'barbell', false),
  ('cable_curl', 'Curl de bíceps amb politja', 'Curl de bíceps en polea', 'Cable curl', 'weight_reps', '{biceps}', '{forearms}', 'cable', false),
  ('triceps_pushdown', 'Extensió de tríceps amb politja', 'Extensión de tríceps en polea', 'Triceps pushdown', 'weight_reps', '{triceps}', '{}', 'cable', false),
  ('overhead_triceps_extension', 'Extensió de tríceps per sobre del cap', 'Extensión de tríceps sobre la cabeza', 'Overhead triceps extension', 'weight_reps', '{triceps}', '{}', 'cable', false),
  ('bench_dip', 'Fons de tríceps al banc', 'Fondos de tríceps en banco', 'Bench dip', 'bodyweight_reps', '{triceps}', '{chest,shoulders}', 'none', false),

  -- Legs and glutes
  ('back_squat', 'Esquat amb barra', 'Sentadilla con barra', 'Barbell back squat', 'weight_reps', '{quads,glutes}', '{adductors,lower_back}', 'barbell', false),
  ('goblet_squat', 'Esquat goblet', 'Sentadilla goblet', 'Goblet squat', 'weight_reps', '{quads,glutes}', '{abs}', 'dumbbell', false),
  ('hack_squat', 'Hack squat', 'Sentadilla hack', 'Hack squat', 'weight_reps', '{quads}', '{glutes}', 'machine', false),
  ('leg_press', 'Premsa de cames', 'Prensa de piernas', 'Leg press', 'weight_reps', '{quads,glutes}', '{hamstrings}', 'machine', false),
  ('deadlift', 'Pes mort', 'Peso muerto', 'Deadlift', 'weight_reps', '{glutes,hamstrings,lower_back}', '{quads,traps,forearms}', 'barbell', false),
  ('romanian_deadlift', 'Pes mort romanès', 'Peso muerto rumano', 'Romanian deadlift', 'weight_reps', '{hamstrings,glutes}', '{lower_back}', 'barbell', false),
  ('dumbbell_romanian_deadlift', 'Pes mort romanès amb manuelles', 'Peso muerto rumano con mancuernas', 'Dumbbell Romanian deadlift', 'weight_reps', '{hamstrings,glutes}', '{lower_back}', 'dumbbell', false),
  ('hip_thrust', 'Hip thrust amb barra', 'Hip thrust con barra', 'Barbell hip thrust', 'weight_reps', '{glutes}', '{hamstrings}', 'barbell', false),
  ('machine_hip_thrust', 'Hip thrust a màquina', 'Hip thrust en máquina', 'Machine hip thrust', 'weight_reps', '{glutes}', '{hamstrings}', 'machine', false),
  ('glute_bridge', 'Pont de glutis', 'Puente de glúteos', 'Glute bridge', 'bodyweight_reps', '{glutes}', '{hamstrings}', 'none', false),
  ('cable_kickback', 'Patada de glutis amb politja', 'Patada de glúteo en polea', 'Cable glute kickback', 'weight_reps', '{glutes}', '{hamstrings}', 'cable', true),
  ('bulgarian_split_squat', 'Esquat búlgar', 'Sentadilla búlgara', 'Bulgarian split squat', 'weight_reps', '{quads,glutes}', '{adductors}', 'dumbbell', true),
  ('walking_lunge', 'Gambades caminant', 'Zancadas caminando', 'Walking lunge', 'weight_reps', '{quads,glutes}', '{hamstrings}', 'dumbbell', true),
  ('reverse_lunge', 'Gambada enrere', 'Zancada hacia atrás', 'Reverse lunge', 'weight_reps', '{quads,glutes}', '{hamstrings}', 'dumbbell', true),
  ('step_up', 'Pujades al calaix', 'Subidas al cajón', 'Step-up', 'weight_reps', '{quads,glutes}', '{hamstrings}', 'dumbbell', true),
  ('leg_extension', 'Extensió de quàdriceps', 'Extensión de cuádriceps', 'Leg extension', 'weight_reps', '{quads}', '{}', 'machine', false),
  ('lying_leg_curl', 'Curl femoral estirat', 'Curl femoral tumbado', 'Lying leg curl', 'weight_reps', '{hamstrings}', '{calves}', 'machine', false),
  ('seated_leg_curl', 'Curl femoral assegut', 'Curl femoral sentado', 'Seated leg curl', 'weight_reps', '{hamstrings}', '{}', 'machine', false),
  ('hip_abduction', 'Abducció de maluc a màquina', 'Abducción de cadera en máquina', 'Hip abduction machine', 'weight_reps', '{abductors}', '{glutes}', 'machine', false),
  ('hip_adduction', 'Adducció de maluc a màquina', 'Aducción de cadera en máquina', 'Hip adduction machine', 'weight_reps', '{adductors}', '{}', 'machine', false),
  ('banded_lateral_walk', 'Passos laterals amb goma', 'Pasos laterales con banda', 'Banded lateral walk', 'bodyweight_reps', '{abductors,glutes}', '{}', 'band', true),
  ('standing_calf_raise', 'Elevació de bessons dret', 'Elevación de gemelos de pie', 'Standing calf raise', 'weight_reps', '{calves}', '{}', 'machine', false),
  ('kettlebell_swing', 'Swing amb kettlebell', 'Swing con kettlebell', 'Kettlebell swing', 'weight_reps', '{glutes,hamstrings}', '{lower_back,shoulders}', 'kettlebell', false),
  ('box_jump', 'Salt al calaix', 'Salto al cajón', 'Box jump', 'bodyweight_reps', '{quads,glutes}', '{calves}', 'none', false),

  -- Core
  ('plank', 'Planxa', 'Plancha', 'Plank', 'duration', '{abs}', '{obliques,shoulders}', 'none', false),
  ('side_plank', 'Planxa lateral', 'Plancha lateral', 'Side plank', 'duration', '{obliques}', '{abs}', 'none', true),
  ('hollow_hold', 'Hollow hold', 'Hollow hold', 'Hollow hold', 'duration', '{abs}', '{}', 'none', false),
  ('dead_bug', 'Dead bug', 'Dead bug', 'Dead bug', 'bodyweight_reps', '{abs}', '{}', 'none', false),
  ('bird_dog', 'Bird dog', 'Bird dog', 'Bird dog', 'bodyweight_reps', '{lower_back,abs}', '{glutes}', 'none', true),
  ('crunch', 'Crunch abdominal', 'Crunch abdominal', 'Crunch', 'bodyweight_reps', '{abs}', '{}', 'none', false),
  ('reverse_crunch', 'Crunch invers', 'Crunch inverso', 'Reverse crunch', 'bodyweight_reps', '{abs}', '{}', 'none', false),
  ('bicycle_crunch', 'Crunch bicicleta', 'Crunch bicicleta', 'Bicycle crunch', 'bodyweight_reps', '{abs,obliques}', '{}', 'none', false),
  ('russian_twist', 'Gir rus', 'Giro ruso', 'Russian twist', 'bodyweight_reps', '{obliques}', '{abs}', 'none', false),
  ('mountain_climber', 'Escaladors', 'Escaladores', 'Mountain climber', 'bodyweight_reps', '{abs}', '{shoulders,quads}', 'none', false),
  ('hanging_knee_raise', 'Elevació de genolls penjada', 'Elevación de rodillas colgado', 'Hanging knee raise', 'bodyweight_reps', '{abs}', '{forearms}', 'none', false),
  ('cable_crunch', 'Crunch amb politja', 'Crunch en polea', 'Cable crunch', 'weight_reps', '{abs}', '{}', 'cable', false),
  ('pallof_press', 'Press Pallof', 'Press Pallof', 'Pallof press', 'weight_reps', '{obliques}', '{abs}', 'cable', true),

  -- HYROX stations
  ('ski_erg', 'SkiErg', 'SkiErg', 'SkiErg', 'cardio_machine', '{lats,triceps}', '{abs,shoulders}', 'ski_erg', false),
  ('sled_push', 'Empenta de trineu', 'Empuje de trineo', 'Sled push', 'weight_distance', '{quads,glutes}', '{calves,shoulders,chest}', 'sled', false),
  ('sled_pull', 'Arrossegament de trineu', 'Arrastre de trineo', 'Sled pull', 'weight_distance', '{upper_back,lats}', '{biceps,hamstrings,glutes}', 'sled', false),
  ('burpee_broad_jump', 'Burpee amb salt horitzontal', 'Burpee con salto horizontal', 'Burpee broad jump', 'bodyweight_reps', '{quads,glutes}', '{chest,shoulders,triceps,abs}', 'none', false),
  ('rowing', 'Rem (ergòmetre)', 'Remo (ergómetro)', 'Rowing (erg)', 'cardio_machine', '{quads,upper_back}', '{lats,biceps,glutes,hamstrings}', 'rower', false),
  ('farmers_carry', 'Passeig del granger', 'Paseo del granjero', 'Farmers carry', 'weight_distance', '{forearms,traps}', '{abs,glutes}', 'kettlebell', false),
  ('sandbag_lunge', 'Gambades amb sac', 'Zancadas con saco', 'Sandbag lunges', 'weight_distance', '{quads,glutes}', '{hamstrings,abs}', 'sandbag', false),
  ('wall_ball', 'Wall balls', 'Wall balls', 'Wall balls', 'weight_reps', '{quads,glutes,shoulders}', '{triceps,abs}', 'medicine_ball', false),

  -- Running and cardio
  ('run', 'Córrer', 'Correr', 'Run', 'run', '{quads,hamstrings,calves}', '{glutes}', 'none', false),
  ('treadmill_run', 'Córrer a la cinta', 'Correr en cinta', 'Treadmill run', 'run', '{quads,hamstrings,calves}', '{glutes}', 'treadmill', false),
  ('incline_walk', 'Caminar en pendent', 'Caminar en pendiente', 'Incline walk', 'cardio_machine', '{glutes,calves}', '{hamstrings,quads}', 'treadmill', false),
  ('stairmaster', 'Escales (StairMaster)', 'Escaleras (StairMaster)', 'StairMaster', 'cardio_machine', '{glutes,quads}', '{calves,hamstrings}', 'stair_climber', false),
  ('stationary_bike', 'Bicicleta estàtica', 'Bicicleta estática', 'Stationary bike', 'cardio_machine', '{quads}', '{glutes,hamstrings,calves}', 'bike', false),
  ('assault_bike', 'Assault bike', 'Assault bike', 'Assault bike', 'cardio_machine', '{quads}', '{shoulders,glutes,hamstrings}', 'bike', false),
  ('elliptical', 'El·líptica', 'Elíptica', 'Elliptical', 'cardio_machine', '{quads,glutes}', '{hamstrings,calves}', 'machine', false)
) as library (slug, name_ca, name_es, name_en, tracking_type, primary_muscles, secondary_muscles, equipment, is_unilateral)
on conflict (slug) do update set
  name_i18n = excluded.name_i18n,
  tracking_type = excluded.tracking_type,
  primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  is_unilateral = excluded.is_unilateral;
