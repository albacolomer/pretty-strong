-- Technique tips for the built-in exercises (US-03).
--
-- Safe to run again: rows are matched by slug and only technique_i18n changes.
-- To change a tip, edit this file and paste it all into Supabase's SQL Editor.
-- The tips of an exercise are shown in this order, so every language has the
-- same number of them, in the same order.
--
-- Each block is JSON between $$ marks, so an apostrophe stays as it is:
-- l'espatlla. Don't use double quotes inside a tip.

update public.exercises as exercise
set technique_i18n = library.tips::jsonb
from (values
  -- Chest
  ('barbell_bench_press', $${
    "ca": ["Omòplats enrere i avall, ben recolzats al banc", "Baixa la barra controlada fins a tocar el pit", "Colzes una mica tancats, no oberts en creu"],
    "es": ["Omóplatos atrás y abajo, bien apoyados en el banco", "Baja la barra controlada hasta tocar el pecho", "Codos algo cerrados, no abiertos en cruz"],
    "en": ["Shoulder blades back and down, set on the bench", "Lower the bar under control until it touches your chest", "Keep your elbows slightly tucked, not flared out"]
  }$$),
  ('dumbbell_bench_press', $${
    "ca": ["Baixa les manuelles a l'altura del pit, amb els colzes una mica tancats", "Puja-les empenyent amunt, sense picar-les a dalt", "Omòplats enrere i peus ferms a terra"],
    "es": ["Baja las mancuernas a la altura del pecho, con los codos algo cerrados", "Súbelas empujando hacia arriba, sin chocarlas arriba", "Omóplatos atrás y pies firmes en el suelo"],
    "en": ["Lower the dumbbells to chest level, elbows slightly tucked", "Press straight up without knocking them together", "Shoulder blades back, feet planted on the floor"]
  }$$),
  ('incline_dumbbell_press', $${
    "ca": ["Banc a uns 30°: si és més alt, treballen més les espatlles", "Baixa fins a l'altura de la part alta del pit", "Omòplats enrere i glutis sempre al banc"],
    "es": ["Banco a unos 30°: si está más alto, trabajan más los hombros", "Baja hasta la altura de la parte alta del pecho", "Omóplatos atrás y glúteos siempre en el banco"],
    "en": ["Set the bench to about 30°: any higher and your shoulders take over", "Lower to the level of your upper chest", "Shoulder blades back, glutes on the bench throughout"]
  }$$),
  ('machine_chest_press', $${
    "ca": ["Ajusta el seient: les nanses a l'altura del pit", "Omòplats enrere i esquena recolzada tota l'estona", "Empeny sense bloquejar els colzes de cop"],
    "es": ["Ajusta el asiento: las asas a la altura del pecho", "Omóplatos atrás y espalda apoyada todo el rato", "Empuja sin bloquear los codos de golpe"],
    "en": ["Adjust the seat so the handles are at chest height", "Shoulder blades back, back on the pad throughout", "Press without snapping your elbows straight"]
  }$$),
  ('pec_deck', $${
    "ca": ["Ajusta el seient: colzes a l'altura del pit o una mica per sota", "Ajunta els braços com si abracessis algú, sense empènyer", "Torna a poc a poc, sense deixar caure el pes"],
    "es": ["Ajusta el asiento: codos a la altura del pecho o algo por debajo", "Junta los brazos como si abrazaras a alguien, sin empujar", "Vuelve despacio, sin dejar caer el peso"],
    "en": ["Adjust the seat so your elbows are at or just below chest height", "Bring your arms together as if hugging someone, not pushing", "Return slowly, without letting the weight drop"]
  }$$),
  ('cable_fly', $${
    "ca": ["Colzes una mica flexionats i fixos tot el moviment", "Ajunta les mans davant del pit fent un arc ample", "Obre a poc a poc fins a notar l'estirament al pit"],
    "es": ["Codos algo flexionados y fijos todo el movimiento", "Junta las manos delante del pecho en un arco amplio", "Abre despacio hasta notar el estiramiento en el pecho"],
    "en": ["Keep a slight, fixed bend in your elbows", "Bring your hands together in front of your chest in a wide arc", "Open slowly until you feel a stretch in your chest"]
  }$$),
  ('push_up', $${
    "ca": ["Cos recte del cap als talons, amb abdominals i glutis actius", "Mans una mica més obertes que les espatlles", "Baixa fins gairebé tocar a terra amb el pit, colzes una mica tancats"],
    "es": ["Cuerpo recto de la cabeza a los talones, con abdominales y glúteos activos", "Manos algo más abiertas que los hombros", "Baja hasta casi tocar el suelo con el pecho, codos algo cerrados"],
    "en": ["Straight line from head to heels, abs and glutes tight", "Hands slightly wider than your shoulders", "Lower until your chest nearly touches the floor, elbows slightly tucked"]
  }$$),

  -- Back
  ('lat_pulldown', $${
    "ca": ["Tira la barra cap a la part alta del pit, mai darrere del clatell", "Comença baixant les espatlles i porta els colzes cap als costats", "Inclina't només una mica enrere, sense balancejar-te"],
    "es": ["Tira de la barra hacia la parte alta del pecho, nunca detrás de la nuca", "Empieza bajando los hombros y lleva los codos hacia los lados", "Inclínate solo un poco atrás, sin balancearte"],
    "en": ["Pull the bar to your upper chest, never behind your neck", "Start by lowering your shoulders, then drive your elbows to your sides", "Lean back only slightly, without swinging"]
  }$$),
  ('seated_cable_row', $${
    "ca": ["Pit amunt i esquena recta, sense balancejar-te", "Porta els colzes enrere i ajunta els omòplats", "Torna a poc a poc fins a estirar els braços"],
    "es": ["Pecho arriba y espalda recta, sin balancearte", "Lleva los codos atrás y junta los omóplatos", "Vuelve despacio hasta estirar los brazos"],
    "en": ["Chest up, back straight, no rocking", "Drive your elbows back and squeeze your shoulder blades", "Return slowly until your arms are straight"]
  }$$),
  ('machine_row', $${
    "ca": ["Ajusta el seient perquè el pit quedi ben recolzat", "Tira amb els colzes, no amb les mans", "Ajunta els omòplats al final i torna a poc a poc"],
    "es": ["Ajusta el asiento para que el pecho quede bien apoyado", "Tira con los codos, no con las manos", "Junta los omóplatos al final y vuelve despacio"],
    "en": ["Adjust the seat so your chest rests on the pad", "Pull with your elbows, not your hands", "Squeeze your shoulder blades at the end, then return slowly"]
  }$$),
  ('barbell_row', $${
    "ca": ["Malucs enrere i esquena recta, amb el tors inclinat endavant", "Porta la barra cap a la part baixa de l'abdomen", "El tors es queda quiet: no pugis amb impuls d'esquena"],
    "es": ["Caderas atrás y espalda recta, con el torso inclinado adelante", "Lleva la barra hacia la parte baja del abdomen", "El torso se queda quieto: no subas con impulso de espalda"],
    "en": ["Hips back, back straight, torso leaning forward", "Pull the bar towards your lower abdomen", "Keep your torso still: don't heave the weight up"]
  }$$),
  ('one_arm_dumbbell_row', $${
    "ca": ["Recolza la mà i el genoll al banc, amb l'esquena plana", "Porta la manuella cap al maluc, no cap a l'espatlla", "No giris el tors per pujar-la més"],
    "es": ["Apoya la mano y la rodilla en el banco, con la espalda plana", "Lleva la mancuerna hacia la cadera, no hacia el hombro", "No gires el torso para subirla más"],
    "en": ["Rest your hand and knee on the bench, back flat", "Pull the dumbbell towards your hip, not your shoulder", "Don't twist your torso to lift it higher"]
  }$$),
  ('pull_up', $${
    "ca": ["Comença baixant les espatlles, abans de doblegar els braços", "Puja fins que la barbeta passi la barra", "Baixa amb control fins a estirar els braços, sense balancejar-te"],
    "es": ["Empieza bajando los hombros, antes de doblar los brazos", "Sube hasta que la barbilla pase la barra", "Baja con control hasta estirar los brazos, sin balancearte"],
    "en": ["Start by pulling your shoulders down, before bending your arms", "Pull up until your chin clears the bar", "Lower under control to straight arms, without swinging"]
  }$$),
  ('assisted_pull_up', $${
    "ca": ["Tria l'ajuda que et deixi fer totes les repeticions netes", "Baixa les espatlles abans de doblegar els braços", "Baixa a poc a poc fins a estirar els braços"],
    "es": ["Elige la ayuda que te deje hacer todas las repeticiones limpias", "Baja los hombros antes de doblar los brazos", "Baja despacio hasta estirar los brazos"],
    "en": ["Pick the assistance that lets you do every rep cleanly", "Pull your shoulders down before bending your arms", "Lower slowly until your arms are straight"]
  }$$),
  ('straight_arm_pulldown', $${
    "ca": ["Inclina't una mica endavant, amb els braços gairebé rectes", "Baixa la barra fent un arc fins a les cuixes", "Mou només les espatlles: els colzes no es doblen més"],
    "es": ["Inclínate un poco adelante, con los brazos casi rectos", "Baja la barra en arco hasta los muslos", "Mueve solo los hombros: los codos no se doblan más"],
    "en": ["Lean forward slightly with your arms almost straight", "Bring the bar down to your thighs in an arc", "Move only at the shoulders: don't bend your elbows further"]
  }$$),
  ('face_pull', $${
    "ca": ["Politja a l'altura de la cara o una mica per sobre", "Tira la corda cap al front, amb els colzes alts", "Separa les mans al final i ajunta els omòplats"],
    "es": ["Polea a la altura de la cara o algo por encima", "Tira de la cuerda hacia la frente, con los codos altos", "Separa las manos al final y junta los omóplatos"],
    "en": ["Set the cable at face height or slightly above", "Pull the rope towards your forehead, elbows high", "Pull your hands apart at the end and squeeze your shoulder blades"]
  }$$),
  ('dumbbell_shrug', $${
    "ca": ["Puja les espatlles recte cap a les orelles", "No facis cercles amb les espatlles", "Aguanta un segon a dalt i baixa a poc a poc"],
    "es": ["Sube los hombros rectos hacia las orejas", "No hagas círculos con los hombros", "Aguanta un segundo arriba y baja despacio"],
    "en": ["Lift your shoulders straight up towards your ears", "Don't roll your shoulders", "Hold for a second at the top, then lower slowly"]
  }$$),
  ('back_extension', $${
    "ca": ["Ajusta el suport perquè el maluc es pugui doblegar", "Puja fins a alinear el cos, sense arquejar l'esquena", "Mou-te a poc a poc i estreny els glutis a dalt"],
    "es": ["Ajusta el soporte para que la cadera se pueda doblar", "Sube hasta alinear el cuerpo, sin arquear la espalda", "Muévete despacio y aprieta los glúteos arriba"],
    "en": ["Set the pad so your hips can bend freely", "Rise until your body is in line, without arching your back", "Move slowly and squeeze your glutes at the top"]
  }$$),

  -- Shoulders
  ('dumbbell_shoulder_press', $${
    "ca": ["Comença amb les manuelles a l'altura de les orelles", "Empeny amunt amb els abdominals actius, sense arquejar l'esquena", "Baixa amb control, sense rebotar"],
    "es": ["Empieza con las mancuernas a la altura de las orejas", "Empuja hacia arriba con los abdominales activos, sin arquear la espalda", "Baja con control, sin rebotar"],
    "en": ["Start with the dumbbells at ear height", "Press up with your abs tight, without arching your back", "Lower under control, without bouncing"]
  }$$),
  ('machine_shoulder_press', $${
    "ca": ["Ajusta el seient: les nanses a l'altura de les espatlles", "Esquena recolzada tota l'estona", "Puja sense bloquejar els colzes de cop i baixa a poc a poc"],
    "es": ["Ajusta el asiento: las asas a la altura de los hombros", "Espalda apoyada todo el rato", "Sube sin bloquear los codos de golpe y baja despacio"],
    "en": ["Adjust the seat so the handles are at shoulder height", "Keep your back on the pad throughout", "Press without snapping your elbows straight, then lower slowly"]
  }$$),
  ('lateral_raise', $${
    "ca": ["Puja fins a l'altura de les espatlles, no més amunt", "Colzes una mica flexionats, portant-los cap als costats", "Sense impuls: baixa a poc a poc"],
    "es": ["Sube hasta la altura de los hombros, no más arriba", "Codos algo flexionados, llevándolos hacia los lados", "Sin impulso: baja despacio"],
    "en": ["Raise to shoulder height, no higher", "Keep a slight bend in your elbows and lead with them", "No swinging: lower slowly"]
  }$$),
  ('cable_lateral_raise', $${
    "ca": ["Politja baixa i cable per davant del cos", "Puja portant el colze fins a l'altura de l'espatlla", "Mantén la tensió en baixar, sense deixar caure el pes"],
    "es": ["Polea baja y cable por delante del cuerpo", "Sube llevando el codo hasta la altura del hombro", "Mantén la tensión al bajar, sin dejar caer el peso"],
    "en": ["Set the cable low and run it across the front of your body", "Lead with your elbow up to shoulder height", "Keep the tension on the way down, don't let the weight drop"]
  }$$),
  ('rear_delt_fly', $${
    "ca": ["Inclina el tors endavant amb l'esquena recta", "Obre els braços amb els colzes una mica flexionats", "Pes lleuger i sense impuls"],
    "es": ["Inclina el torso adelante con la espalda recta", "Abre los brazos con los codos algo flexionados", "Peso ligero y sin impulso"],
    "en": ["Lean your torso forward with your back straight", "Open your arms with a slight bend in your elbows", "Go light, with no swinging"]
  }$$),

  -- Arms
  ('dumbbell_curl', $${
    "ca": ["Colzes enganxats al cos i quiets", "Puja sense balancejar el tors", "Baixa a poc a poc fins a estirar el braç"],
    "es": ["Codos pegados al cuerpo y quietos", "Sube sin balancear el torso", "Baja despacio hasta estirar el brazo"],
    "en": ["Keep your elbows still and close to your body", "Curl up without swinging your torso", "Lower slowly until your arm is straight"]
  }$$),
  ('hammer_curl', $${
    "ca": ["Palmells mirant-se tot el moviment", "Colzes quiets al costat del cos", "Sense impuls: baixa a poc a poc"],
    "es": ["Palmas mirándose todo el movimiento", "Codos quietos al lado del cuerpo", "Sin impulso: baja despacio"],
    "en": ["Palms facing each other throughout", "Elbows still at your sides", "No swinging: lower slowly"]
  }$$),
  ('barbell_curl', $${
    "ca": ["Agafa la barra a l'amplada de les espatlles", "Colzes enganxats al cos: no els portis endavant", "No tiris el cos enrere per pujar"],
    "es": ["Agarra la barra a la anchura de los hombros", "Codos pegados al cuerpo: no los lleves adelante", "No eches el cuerpo atrás para subir"],
    "en": ["Grip the bar shoulder-width apart", "Keep your elbows at your sides, not drifting forward", "Don't lean back to lift the weight"]
  }$$),
  ('cable_curl', $${
    "ca": ["Politja baixa, de peu i amb el pit amunt", "Colzes quiets al costat del cos", "Mantén la tensió en baixar, sense deixar caure el pes"],
    "es": ["Polea baja, de pie y con el pecho arriba", "Codos quietos al lado del cuerpo", "Mantén la tensión al bajar, sin dejar caer el peso"],
    "en": ["Set the cable low and stand tall, chest up", "Elbows still at your sides", "Keep the tension on the way down, don't let the weight drop"]
  }$$),
  ('triceps_pushdown', $${
    "ca": ["Colzes enganxats al cos i quiets", "Estira els braços del tot a baix", "Puja fins a uns 90°, sense que el pes t'aixequi les espatlles"],
    "es": ["Codos pegados al cuerpo y quietos", "Estira los brazos del todo abajo", "Sube hasta unos 90°, sin que el peso te levante los hombros"],
    "en": ["Elbows still and close to your body", "Straighten your arms fully at the bottom", "Come up to about 90°, without the weight lifting your shoulders"]
  }$$),
  ('overhead_triceps_extension', $${
    "ca": ["Colzes a prop del cap, apuntant amunt", "Baixa el pes darrere del cap fins a notar l'estirament", "Abdominals actius, sense arquejar l'esquena"],
    "es": ["Codos cerca de la cabeza, apuntando hacia arriba", "Baja el peso detrás de la cabeza hasta notar el estiramiento", "Abdominales activos, sin arquear la espalda"],
    "en": ["Elbows close to your head, pointing up", "Lower the weight behind your head until you feel a stretch", "Abs tight, without arching your back"]
  }$$),
  ('bench_dip', $${
    "ca": ["Mans al banc i esquena a prop seu", "Baixa fins que els colzes facin uns 90°", "Colzes cap enrere, no oberts als costats"],
    "es": ["Manos en el banco y espalda cerca de él", "Baja hasta que los codos formen unos 90°", "Codos hacia atrás, no abiertos a los lados"],
    "en": ["Hands on the bench, back close to it", "Lower until your elbows reach about 90°", "Point your elbows back, not out to the sides"]
  }$$),

  -- Legs and glutes
  ('back_squat', $${
    "ca": ["Agafa aire i activa els abdominals abans de baixar", "Genolls en la direcció de les puntes dels peus", "Baixa fins on puguis mantenir l'esquena recta"],
    "es": ["Coge aire y activa los abdominales antes de bajar", "Rodillas en la dirección de las puntas de los pies", "Baja hasta donde puedas mantener la espalda recta"],
    "en": ["Breathe in and brace your abs before you go down", "Knees tracking in line with your toes", "Go as low as you can while keeping your back straight"]
  }$$),
  ('goblet_squat', $${
    "ca": ["Aguanta el pes enganxat al pit, amb els colzes avall", "Baixa entre els genolls, amb el tors ben dret", "Puja empenyent el terra amb tot el peu"],
    "es": ["Sujeta el peso pegado al pecho, con los codos abajo", "Baja entre las rodillas, con el torso bien erguido", "Sube empujando el suelo con todo el pie"],
    "en": ["Hold the weight against your chest, elbows down", "Sink between your knees with your torso upright", "Drive up by pushing the floor with your whole foot"]
  }$$),
  ('hack_squat', $${
    "ca": ["Esquena i cap recolzats tota l'estona", "Genolls en la direcció de les puntes dels peus", "Puja sense bloquejar els genolls de cop"],
    "es": ["Espalda y cabeza apoyadas todo el rato", "Rodillas en la dirección de las puntas de los pies", "Sube sin bloquear las rodillas de golpe"],
    "en": ["Back and head on the pad throughout", "Knees tracking in line with your toes", "Drive up without snapping your knees straight"]
  }$$),
  ('leg_press', $${
    "ca": ["Peus sencers a la plataforma, a l'amplada dels malucs", "Baixa sense que els lumbars se separin del respatller", "No bloquegis els genolls a dalt"],
    "es": ["Pies enteros en la plataforma, a la anchura de las caderas", "Baja sin que las lumbares se separen del respaldo", "No bloquees las rodillas arriba"],
    "en": ["Whole foot on the platform, hip-width apart", "Lower without your lower back leaving the pad", "Don't lock your knees at the top"]
  }$$),
  ('deadlift', $${
    "ca": ["Barra sobre el mig del peu, gairebé tocant les tíbies", "Esquena recta i abdominals actius abans d'aixecar", "Empeny el terra i porta la barra enganxada al cos"],
    "es": ["Barra sobre el medio del pie, casi tocando las tibias", "Espalda recta y abdominales activos antes de levantar", "Empuja el suelo y lleva la barra pegada al cuerpo"],
    "en": ["Bar over mid-foot, almost touching your shins", "Back straight and abs tight before you lift", "Push the floor away and keep the bar close to your body"]
  }$$),
  ('romanian_deadlift', $${
    "ca": ["Porta els malucs enrere, amb els genolls una mica flexionats", "Barra enganxada a les cames i esquena recta", "Baixa fins a notar l'estirament als isquiotibials"],
    "es": ["Lleva las caderas atrás, con las rodillas algo flexionadas", "Barra pegada a las piernas y espalda recta", "Baja hasta notar el estiramiento en los isquiotibiales"],
    "en": ["Push your hips back with your knees slightly bent", "Bar close to your legs, back straight", "Lower until you feel a stretch in your hamstrings"]
  }$$),
  ('dumbbell_romanian_deadlift', $${
    "ca": ["Porta els malucs enrere, amb els genolls una mica flexionats", "Manuelles a prop de les cames i esquena recta", "Baixa fins a notar l'estirament als isquiotibials"],
    "es": ["Lleva las caderas atrás, con las rodillas algo flexionadas", "Mancuernas cerca de las piernas y espalda recta", "Baja hasta notar el estiramiento en los isquiotibiales"],
    "en": ["Push your hips back with your knees slightly bent", "Dumbbells close to your legs, back straight", "Lower until you feel a stretch in your hamstrings"]
  }$$),
  ('hip_thrust', $${
    "ca": ["Part alta de l'esquena al banc, just sota els omòplats", "A dalt, genolls a 90° i tíbies verticals", "Barbeta avall i estreny els glutis, sense arquejar els lumbars"],
    "es": ["Parte alta de la espalda en el banco, justo bajo los omóplatos", "Arriba, rodillas a 90° y tibias verticales", "Barbilla abajo y aprieta los glúteos, sin arquear las lumbares"],
    "en": ["Upper back on the bench, just below your shoulder blades", "At the top, knees at 90° and shins vertical", "Chin down and squeeze your glutes, without arching your lower back"]
  }$$),
  ('machine_hip_thrust', $${
    "ca": ["Ajusta el coixí perquè quedi sobre els malucs", "A dalt, genolls a 90° i tíbies verticals", "Estreny els glutis un segon, sense arquejar els lumbars"],
    "es": ["Ajusta el cojín para que quede sobre las caderas", "Arriba, rodillas a 90° y tibias verticales", "Aprieta los glúteos un segundo, sin arquear las lumbares"],
    "en": ["Adjust the pad so it sits across your hips", "At the top, knees at 90° and shins vertical", "Squeeze your glutes for a second, without arching your lower back"]
  }$$),
  ('glute_bridge', $${
    "ca": ["Panxa amunt, amb els talons a prop dels glutis", "Empeny amb els talons fins a alinear genolls, malucs i espatlles", "Estreny els glutis a dalt, sense arquejar els lumbars"],
    "es": ["Boca arriba, con los talones cerca de los glúteos", "Empuja con los talones hasta alinear rodillas, caderas y hombros", "Aprieta los glúteos arriba, sin arquear las lumbares"],
    "en": ["Lie down with your heels close to your glutes", "Drive through your heels until knees, hips and shoulders line up", "Squeeze your glutes at the top, without arching your lower back"]
  }$$),
  ('cable_kickback', $${
    "ca": ["Inclina't una mica endavant, agafant-te a la màquina", "Porta la cama enrere amb els glutis, no amb els lumbars", "Torna a poc a poc, sense deixar caure el pes"],
    "es": ["Inclínate un poco adelante, agarrándote a la máquina", "Lleva la pierna atrás con los glúteos, no con las lumbares", "Vuelve despacio, sin dejar caer el peso"],
    "en": ["Lean forward slightly, holding on to the machine", "Drive your leg back with your glutes, not your lower back", "Return slowly, without letting the weight drop"]
  }$$),
  ('bulgarian_split_squat', $${
    "ca": ["Peu del darrere recolzat al banc, davanter prou lluny", "Baixa recte, amb el pes a la cama de davant", "Genoll en la direcció de la punta del peu"],
    "es": ["Pie de atrás apoyado en el banco, el delantero bastante lejos", "Baja recto, con el peso en la pierna de delante", "Rodilla en la dirección de la punta del pie"],
    "en": ["Back foot on the bench, front foot far enough forward", "Lower straight down, with your weight on the front leg", "Knee tracking in line with your toes"]
  }$$),
  ('walking_lunge', $${
    "ca": ["Fes una passa llarga i baixa recte", "Tors dret i abdominals actius", "Empeny amb el peu de davant per avançar"],
    "es": ["Da un paso largo y baja recto", "Torso erguido y abdominales activos", "Empuja con el pie de delante para avanzar"],
    "en": ["Take a long step and lower straight down", "Torso upright, abs tight", "Push through your front foot to move forward"]
  }$$),
  ('reverse_lunge', $${
    "ca": ["Fes una passa enrere i baixa recte", "Pes a la cama de davant", "Puja empenyent amb el peu de davant"],
    "es": ["Da un paso atrás y baja recto", "Peso en la pierna de delante", "Sube empujando con el pie de delante"],
    "en": ["Step back and lower straight down", "Keep your weight on the front leg", "Drive back up through your front foot"]
  }$$),
  ('step_up', $${
    "ca": ["Tot el peu recolzat al calaix", "Puja amb la cama de dalt, sense impulsar-te amb la de baix", "Baixa a poc a poc, sense deixar-te caure"],
    "es": ["Todo el pie apoyado en el cajón", "Sube con la pierna de arriba, sin impulsarte con la de abajo", "Baja despacio, sin dejarte caer"],
    "en": ["Whole foot on the box", "Step up with the top leg, without pushing off the bottom one", "Lower slowly, don't drop down"]
  }$$),
  ('leg_extension', $${
    "ca": ["Ajusta el seient: l'eix de la màquina a l'altura del genoll", "Estira les cames sense donar cops", "Aguanta un moment a dalt i baixa a poc a poc"],
    "es": ["Ajusta el asiento: el eje de la máquina a la altura de la rodilla", "Estira las piernas sin dar golpes", "Aguanta un momento arriba y baja despacio"],
    "en": ["Adjust the seat so the machine's pivot lines up with your knee", "Straighten your legs without jerking", "Hold for a moment at the top, then lower slowly"]
  }$$),
  ('lying_leg_curl', $${
    "ca": ["Eix de la màquina a l'altura del genoll i coixí sobre els turmells", "Malucs enganxats al banc tota l'estona", "Baixa a poc a poc, sense deixar caure el pes"],
    "es": ["Eje de la máquina a la altura de la rodilla y cojín sobre los tobillos", "Caderas pegadas al banco todo el rato", "Baja despacio, sin dejar caer el peso"],
    "en": ["Line the machine's pivot up with your knee, pad above your ankles", "Keep your hips on the bench throughout", "Lower slowly, without letting the weight drop"]
  }$$),
  ('seated_leg_curl', $${
    "ca": ["Eix de la màquina a l'altura del genoll i coixí sobre els turmells", "Esquena recolzada i cuixes ben subjectes", "Torna a poc a poc, sense deixar caure el pes"],
    "es": ["Eje de la máquina a la altura de la rodilla y cojín sobre los tobillos", "Espalda apoyada y muslos bien sujetos", "Vuelve despacio, sin dejar caer el peso"],
    "en": ["Line the machine's pivot up with your knee, pad above your ankles", "Back on the pad, thighs held down firmly", "Return slowly, without letting the weight drop"]
  }$$),
  ('hip_abduction', $${
    "ca": ["Esquena recolzada i malucs quiets", "Obre les cames empenyent amb la part de fora dels genolls", "Torna a poc a poc, sense deixar caure el pes"],
    "es": ["Espalda apoyada y caderas quietas", "Abre las piernas empujando con la parte de fuera de las rodillas", "Vuelve despacio, sin dejar caer el peso"],
    "en": ["Back on the pad, hips still", "Open your legs by pushing out through your knees", "Return slowly, without letting the weight drop"]
  }$$),
  ('hip_adduction', $${
    "ca": ["Comença amb una obertura còmoda, sense forçar", "Esquena recolzada i malucs quiets", "Ajunta les cames a poc a poc i torna amb control"],
    "es": ["Empieza con una apertura cómoda, sin forzar", "Espalda apoyada y caderas quietas", "Junta las piernas despacio y vuelve con control"],
    "en": ["Start from a comfortable opening, don't force it", "Back on the pad, hips still", "Bring your legs together slowly, and return under control"]
  }$$),
  ('banded_lateral_walk', $${
    "ca": ["Genolls una mica flexionats i tors dret", "Passes curtes, sense ajuntar del tot els peus", "Mantén la goma tensa i els genolls cap enfora"],
    "es": ["Rodillas algo flexionadas y torso erguido", "Pasos cortos, sin juntar del todo los pies", "Mantén la banda tensa y las rodillas hacia fuera"],
    "en": ["Knees slightly bent, torso upright", "Short steps, without bringing your feet fully together", "Keep the band tight and your knees pushing out"]
  }$$),
  ('standing_calf_raise', $${
    "ca": ["Puja al màxim sobre les puntes dels peus", "Aguanta un segon a dalt", "Baixa a poc a poc fins a notar l'estirament, sense rebotar"],
    "es": ["Sube al máximo sobre las puntas de los pies", "Aguanta un segundo arriba", "Baja despacio hasta notar el estiramiento, sin rebotar"],
    "en": ["Rise as high as you can on your toes", "Hold for a second at the top", "Lower slowly until you feel a stretch, without bouncing"]
  }$$),
  ('kettlebell_swing', $${
    "ca": ["El moviment surt del maluc, no és un esquat", "Els braços només acompanyen: la força ve dels glutis", "Esquena recta i estreny els glutis a dalt"],
    "es": ["El movimiento sale de la cadera, no es una sentadilla", "Los brazos solo acompañan: la fuerza viene de los glúteos", "Espalda recta y aprieta los glúteos arriba"],
    "en": ["The movement comes from your hips, it's not a squat", "Your arms just follow: the power comes from your glutes", "Back straight, glutes squeezed at the top"]
  }$$),
  ('box_jump', $${
    "ca": ["Comença amb un calaix baix i puja'l a poc a poc", "Aterra suau, amb tot el peu i els genolls flexionats", "Baixa caminant, sense saltar enrere"],
    "es": ["Empieza con un cajón bajo y súbelo poco a poco", "Aterriza suave, con todo el pie y las rodillas flexionadas", "Baja andando, sin saltar hacia atrás"],
    "en": ["Start with a low box and build up gradually", "Land softly on your whole foot, knees bent", "Step down, don't jump back"]
  }$$),

  -- Core
  ('plank', $${
    "ca": ["Colzes sota les espatlles", "Cos recte, amb abdominals i glutis actius", "Que no et caiguin els malucs, i respira"],
    "es": ["Codos bajo los hombros", "Cuerpo recto, con abdominales y glúteos activos", "Que no se te caigan las caderas, y respira"],
    "en": ["Elbows under your shoulders", "Body straight, abs and glutes tight", "Don't let your hips sag, and keep breathing"]
  }$$),
  ('side_plank', $${
    "ca": ["Colze sota l'espatlla", "Cos recte del cap als peus", "Empeny el maluc amunt i no el deixis caure"],
    "es": ["Codo bajo el hombro", "Cuerpo recto de la cabeza a los pies", "Empuja la cadera hacia arriba y no la dejes caer"],
    "en": ["Elbow under your shoulder", "Body straight from head to feet", "Push your hip up and don't let it drop"]
  }$$),
  ('hollow_hold', $${
    "ca": ["Lumbars enganxats a terra tota l'estona", "Aixeca espatlles i cames, amb els braços estirats", "Si l'esquena s'arqueja, doblega els genolls o puja les cames"],
    "es": ["Lumbares pegadas al suelo todo el rato", "Levanta hombros y piernas, con los brazos estirados", "Si la espalda se arquea, dobla las rodillas o sube las piernas"],
    "en": ["Lower back pressed into the floor throughout", "Lift your shoulders and legs, arms reaching long", "If your back arches, bend your knees or raise your legs"]
  }$$),
  ('dead_bug', $${
    "ca": ["Lumbars enganxats a terra tota l'estona", "Estira el braç i la cama contraris a poc a poc", "Baixa només fins on l'esquena no s'arquegi"],
    "es": ["Lumbares pegadas al suelo todo el rato", "Estira el brazo y la pierna contrarios despacio", "Baja solo hasta donde la espalda no se arquee"],
    "en": ["Lower back pressed into the floor throughout", "Slowly extend the opposite arm and leg", "Only go as low as you can without arching your back"]
  }$$),
  ('bird_dog', $${
    "ca": ["Mans sota les espatlles i genolls sota els malucs", "Estira el braç i la cama contraris, sense girar el maluc", "Aguanta un segon i torna a poc a poc"],
    "es": ["Manos bajo los hombros y rodillas bajo las caderas", "Estira el brazo y la pierna contrarios, sin girar la cadera", "Aguanta un segundo y vuelve despacio"],
    "en": ["Hands under your shoulders, knees under your hips", "Extend the opposite arm and leg without rotating your hips", "Hold for a second, then return slowly"]
  }$$),
  ('crunch', $${
    "ca": ["Aixeca les espatlles enrotllant l'esquena", "No estiris del coll amb les mans", "Treu l'aire en pujar i baixa a poc a poc"],
    "es": ["Levanta los hombros enrollando la espalda", "No tires del cuello con las manos", "Suelta el aire al subir y baja despacio"],
    "en": ["Lift your shoulders by curling your spine", "Don't pull on your neck with your hands", "Breathe out as you rise, then lower slowly"]
  }$$),
  ('reverse_crunch', $${
    "ca": ["Porta els genolls cap al pit enrotllant el maluc", "Aixeca el maluc de terra amb els abdominals, no amb impuls", "Baixa a poc a poc, sense deixar caure les cames"],
    "es": ["Lleva las rodillas al pecho enrollando la cadera", "Levanta la cadera del suelo con los abdominales, no con impulso", "Baja despacio, sin dejar caer las piernas"],
    "en": ["Bring your knees to your chest by curling your hips", "Lift your hips off the floor with your abs, not momentum", "Lower slowly, without letting your legs drop"]
  }$$),
  ('bicycle_crunch', $${
    "ca": ["Gira el tors, no només el colze", "Porta l'espatlla cap al genoll contrari", "Vés a poc a poc i estira bé l'altra cama"],
    "es": ["Gira el torso, no solo el codo", "Lleva el hombro hacia la rodilla contraria", "Ve despacio y estira bien la otra pierna"],
    "en": ["Rotate your torso, not just your elbow", "Bring your shoulder towards the opposite knee", "Go slowly and fully straighten the other leg"]
  }$$),
  ('russian_twist', $${
    "ca": ["Inclina't enrere amb l'esquena recta, sense encorbar-la", "Gira el tors sencer, no només els braços", "Si cal, recolza els peus a terra"],
    "es": ["Inclínate atrás con la espalda recta, sin encorvarla", "Gira el torso entero, no solo los brazos", "Si hace falta, apoya los pies en el suelo"],
    "en": ["Lean back with your back straight, not rounded", "Rotate your whole torso, not just your arms", "Keep your feet on the floor if you need to"]
  }$$),
  ('mountain_climber', $${
    "ca": ["Mans sota les espatlles i cos recte", "Porta els genolls cap al pit, un cada vegada", "Que els malucs no pugin ni es balancegin"],
    "es": ["Manos bajo los hombros y cuerpo recto", "Lleva las rodillas al pecho, una cada vez", "Que las caderas no suban ni se balanceen"],
    "en": ["Hands under your shoulders, body straight", "Drive your knees to your chest, one at a time", "Keep your hips from rising or swaying"]
  }$$),
  ('hanging_knee_raise', $${
    "ca": ["Penja't amb les espatlles actives, sense balancejar-te", "Puja els genolls enrotllant el maluc", "Baixa a poc a poc, sense impuls"],
    "es": ["Cuélgate con los hombros activos, sin balancearte", "Sube las rodillas enrollando la cadera", "Baja despacio, sin impulso"],
    "en": ["Hang with active shoulders, without swinging", "Raise your knees by curling your hips", "Lower slowly, with no momentum"]
  }$$),
  ('cable_crunch', $${
    "ca": ["De genolls, amb la corda al costat del cap", "Enrotlla l'esquena portant els colzes cap als genolls", "Els malucs es queden quiets: no t'asseguis enrere"],
    "es": ["De rodillas, con la cuerda al lado de la cabeza", "Enrolla la espalda llevando los codos hacia las rodillas", "Las caderas se quedan quietas: no te sientes atrás"],
    "en": ["Kneel with the rope beside your head", "Curl your spine, bringing your elbows towards your knees", "Keep your hips still: don't sit back"]
  }$$),
  ('pallof_press', $${
    "ca": ["De costat a la politja, amb les mans al pit", "Estira els braços endavant sense deixar-te girar", "Abdominals actius i torna a poc a poc"],
    "es": ["De lado a la polea, con las manos en el pecho", "Estira los brazos adelante sin dejarte girar", "Abdominales activos y vuelve despacio"],
    "en": ["Stand side-on to the cable, hands at your chest", "Press your arms forward without letting it twist you", "Abs tight, then return slowly"]
  }$$),

  -- HYROX stations
  ('ski_erg', $${
    "ca": ["Comença el moviment amb els braços alts i el cos estirat", "Tira amb tot el cos, doblegant el maluc, no només amb els braços", "Acaba amb les mans a prop de les cuixes i torna sense tensió"],
    "es": ["Empieza el movimiento con los brazos altos y el cuerpo estirado", "Tira con todo el cuerpo, doblando la cadera, no solo con los brazos", "Acaba con las manos cerca de los muslos y vuelve sin tensión"],
    "en": ["Start tall, with your arms high", "Pull with your whole body, hinging at the hips, not just your arms", "Finish with your hands by your thighs, then recover relaxed"]
  }$$),
  ('sled_push', $${
    "ca": ["Cos inclinat, formant una línia recta des del cap fins al peu de darrere", "Braços ferms i passes curtes i ràpides", "Empeny el terra amb la punta del peu"],
    "es": ["Cuerpo inclinado, en línea recta de la cabeza al pie de atrás", "Brazos firmes y pasos cortos y rápidos", "Empuja el suelo con la punta del pie"],
    "en": ["Lean in, in a straight line from your head to your back foot", "Firm arms, short quick steps", "Drive into the floor through the ball of your foot"]
  }$$),
  ('sled_pull', $${
    "ca": ["Porta el pes enrere, amb els genolls flexionats", "Tira amb les cames i l'esquena, no només amb els braços", "Recull la corda mà sobre mà a un ritme constant"],
    "es": ["Echa el peso atrás, con las rodillas flexionadas", "Tira con las piernas y la espalda, no solo con los brazos", "Recoge la cuerda mano sobre mano a ritmo constante"],
    "en": ["Sit your weight back with your knees bent", "Pull with your legs and back, not just your arms", "Bring the rope in hand over hand at a steady pace"]
  }$$),
  ('burpee_broad_jump', $${
    "ca": ["Baixa al terra amb el pit i torna amb els peus a prop de les mans", "Salta endavant empenyent amb tots dos peus", "Aterra suau i encadena la següent repetició"],
    "es": ["Baja al suelo con el pecho y vuelve con los pies cerca de las manos", "Salta adelante empujando con los dos pies", "Aterriza suave y encadena la siguiente repetición"],
    "en": ["Drop your chest to the floor and bring your feet back near your hands", "Jump forward off both feet", "Land softly and go straight into the next rep"]
  }$$),
  ('rowing', $${
    "ca": ["L'ordre és cames, tors i braços; en tornar, a l'inrevés", "Esquena recta, sense encorbar-te al davant", "La força ve de les cames: no tiris només amb els braços"],
    "es": ["El orden es piernas, torso y brazos; al volver, al revés", "Espalda recta, sin encorvarte delante", "La fuerza viene de las piernas: no tires solo con los brazos"],
    "en": ["The order is legs, body, arms; reverse it on the way back", "Back straight, no rounding at the front", "The power comes from your legs: don't just pull with your arms"]
  }$$),
  ('farmers_carry', $${
    "ca": ["Tors dret i espatlles avall i enrere", "Abdominals actius, sense inclinar-te a cap costat", "Passes curtes i ràpides"],
    "es": ["Torso erguido y hombros abajo y atrás", "Abdominales activos, sin inclinarte hacia ningún lado", "Pasos cortos y rápidos"],
    "en": ["Stand tall, shoulders down and back", "Abs tight, without leaning to either side", "Short, quick steps"]
  }$$),
  ('sandbag_lunge', $${
    "ca": ["Sac sobre les espatlles, ben agafat", "Tors dret i baixa recte", "El genoll de darrere toca a terra suaument"],
    "es": ["Saco sobre los hombros, bien agarrado", "Torso erguido y baja recto", "La rodilla de atrás toca el suelo con suavidad"],
    "en": ["Sandbag across your shoulders, held securely", "Torso upright, lower straight down", "Let your back knee touch the floor gently"]
  }$$),
  ('wall_ball', $${
    "ca": ["Baixa fent un esquat complet, amb la pilota al pit", "Llança amb l'impuls de les cames, no només amb els braços", "Rep la pilota i baixa de seguida a la següent"],
    "es": ["Baja en sentadilla completa, con el balón en el pecho", "Lanza con el impulso de las piernas, no solo con los brazos", "Recibe el balón y baja enseguida a la siguiente"],
    "en": ["Drop into a full squat with the ball at your chest", "Throw using the drive from your legs, not just your arms", "Catch the ball and go straight into the next rep"]
  }$$),

  -- Running and cardio
  ('run', $${
    "ca": ["Tors dret, una mica inclinat endavant", "Passes curtes i lleugeres, amb el peu a sota del cos", "Espatlles relaxades i braços acompanyant"],
    "es": ["Torso erguido, algo inclinado adelante", "Pasos cortos y ligeros, con el pie debajo del cuerpo", "Hombros relajados y brazos acompañando"],
    "en": ["Run tall, leaning slightly forward", "Short, light steps, with your foot landing under your body", "Shoulders relaxed, arms moving with you"]
  }$$),
  ('treadmill_run', $${
    "ca": ["Corre al centre de la cinta, mirant endavant", "Una inclinació de l'1% s'assembla més a córrer a fora", "Passes curtes i lleugeres, sense agafar-te a les barres"],
    "es": ["Corre en el centro de la cinta, mirando al frente", "Una inclinación del 1% se parece más a correr fuera", "Pasos cortos y ligeros, sin agarrarte a las barras"],
    "en": ["Run in the middle of the belt, looking ahead", "A 1% incline feels closer to running outdoors", "Short, light steps, without holding the rails"]
  }$$),
  ('incline_walk', $${
    "ca": ["No t'agafis a les barres: l'exercici perd efecte", "Tors dret, sense inclinar-te endavant", "Recolza tot el peu i empeny amb el taló i els glutis"],
    "es": ["No te agarres a las barras: el ejercicio pierde efecto", "Torso erguido, sin inclinarte adelante", "Apoya todo el pie y empuja con el talón y los glúteos"],
    "en": ["Don't hold the rails: the exercise loses its effect", "Stay upright, without leaning forward", "Plant your whole foot and push through your heel and glutes"]
  }$$),
  ('stairmaster', $${
    "ca": ["Tria un ritme que puguis mantenir sense recolzar-te a les barres", "Tors dret, sense encorbar-te", "Tot el peu a l'esglaó, empenyent amb glutis i cames"],
    "es": ["Elige un ritmo que puedas mantener sin apoyarte en las barras", "Torso erguido, sin encorvarte", "Todo el pie en el escalón, empujando con glúteos y piernas"],
    "en": ["Pick a pace you can hold without leaning on the rails", "Stay upright, without hunching", "Whole foot on the step, driving through your glutes and legs"]
  }$$),
  ('stationary_bike', $${
    "ca": ["Seient a l'altura del maluc, de peu al costat de la bici", "A baix, el genoll encara una mica flexionat", "Espatlles relaxades i pedaleig rodó"],
    "es": ["Sillín a la altura de la cadera, de pie al lado de la bici", "Abajo, la rodilla todavía algo flexionada", "Hombros relajados y pedaleo redondo"],
    "en": ["Set the seat at hip height when standing next to the bike", "Keep a slight bend in your knee at the bottom", "Shoulders relaxed, smooth pedalling"]
  }$$),
  ('assault_bike', $${
    "ca": ["Coordina braços i cames: empeny i tira alhora", "Seient a una altura que deixi el genoll una mica flexionat a baix", "Controla el ritme: a més força, el ventilador frena més"],
    "es": ["Coordina brazos y piernas: empuja y tira a la vez", "Sillín a una altura que deje la rodilla algo flexionada abajo", "Controla el ritmo: cuanta más fuerza, más frena el ventilador"],
    "en": ["Coordinate your arms and legs: push and pull at the same time", "Set the seat so your knee stays slightly bent at the bottom", "Pace yourself: the harder you go, the harder the fan resists"]
  }$$),
  ('elliptical', $${
    "ca": ["Tors dret i mirada endavant", "Tot el peu als pedals, sense aixecar els talons", "Empeny i tira amb els braços perquè treballi tot el cos"],
    "es": ["Torso erguido y mirada al frente", "Todo el pie en los pedales, sin levantar los talones", "Empuja y tira con los brazos para que trabaje todo el cuerpo"],
    "en": ["Stand tall, looking ahead", "Whole foot on the pedals, heels down", "Push and pull with your arms to work your whole body"]
  }$$)
) as library (slug, tips)
where exercise.slug = library.slug;
