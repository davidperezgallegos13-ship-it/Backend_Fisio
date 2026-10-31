// Contenido educativo de la guía del cuerpo. Textos originales de FisioNova.
// Es información general para orientar: no diagnostica ni indica tratamientos (RES-14).

export type RegionId =
  | 'cabeza'
  | 'cuello'
  | 'hombro'
  | 'codo'
  | 'mano'
  | 'dorsal'
  | 'lumbar'
  | 'cadera'
  | 'rodilla'
  | 'pie';

export interface Afeccion {
  nombre: string;
  texto: string;
}

export interface Region {
  id: RegionId;
  nombre: string;
  /** Punto que la cámara enfoca (x, y, z) en el modelo 3D. */
  foco: [number, number, number];
  /** Desde dónde se mira la zona. */
  vista: 'frente' | 'espalda';
  /** Distancia de la cámara al enfocar la zona. */
  distancia: number;
  resumen: string;
  afecciones: Afeccion[];
  consultar: string[];
  urgencia: string;
}

export const REGIONES: Region[] = [
  {
    id: 'cabeza',
    nombre: 'Cabeza y mandíbula',
    foco: [0, 1.64, 0],
    vista: 'frente',
    distancia: 2.6,
    resumen:
      'Aquí se unen el cráneo, la articulación de la mandíbula y los músculos que masticamos y con los que gesticulamos. Muchos dolores de cabeza se relacionan con la tensión del cuello y los hombros.',
    afecciones: [
      { nombre: 'Cefalea tensional', texto: 'Dolor opresivo en ambos lados, a menudo ligado al estrés y a posturas mantenidas.' },
      { nombre: 'Cefalea de origen cervical', texto: 'Dolor que nace en la nuca y se extiende hacia la frente o detrás del ojo.' },
      { nombre: 'Disfunción de la articulación temporomandibular', texto: 'Dolor o chasquidos al abrir la boca, masticar o apretar los dientes.' },
      { nombre: 'Mareo de origen cervical o vestibular', texto: 'Sensación de inestabilidad relacionada con el cuello o con el oído interno.' },
    ],
    consultar: [
      'Dolores de cabeza que se repiten semana tras semana.',
      'Dolor o ruido al abrir y cerrar la boca.',
      'Mareos al girar la cabeza o al cambiar de posición.',
    ],
    urgencia:
      'Dolor de cabeza repentino y muy intenso, con fiebre, rigidez de nuca, confusión, debilidad o dificultad para hablar.',
  },
  {
    id: 'cuello',
    nombre: 'Cuello',
    foco: [0, 1.54, 0],
    vista: 'frente',
    distancia: 2.4,
    resumen:
      'Siete vértebras cervicales sostienen la cabeza y protegen los nervios que van a los brazos. Es una zona muy móvil, por eso reacciona rápido a las posturas y al estrés.',
    afecciones: [
      { nombre: 'Cervicalgia', texto: 'Dolor y rigidez en el cuello, frecuente en personas que pasan horas frente a una pantalla.' },
      { nombre: 'Tortícolis', texto: 'Contractura que inclina el cuello hacia un lado y limita el giro.' },
      { nombre: 'Latigazo cervical', texto: 'Lesión de partes blandas tras un movimiento brusco, como un choque.' },
      { nombre: 'Hernia discal cervical', texto: 'Disco que presiona un nervio y puede dar dolor, hormigueo o debilidad en el brazo.' },
    ],
    consultar: [
      'Rigidez que dura más de unos días.',
      'Dolor que baja hacia el hombro o el brazo.',
      'Hormigueo en la mano al mantener ciertas posturas.',
    ],
    urgencia:
      'Dolor de cuello tras un golpe fuerte o una caída, pérdida de fuerza en brazos o piernas, o dolor de cuello con fiebre alta.',
  },
  {
    id: 'hombro',
    nombre: 'Hombro y brazo',
    foco: [0, 1.4, 0],
    vista: 'frente',
    distancia: 3.0,
    resumen:
      'El hombro es la articulación más móvil del cuerpo. Esa libertad la sostiene un grupo de músculos y tendones (el manguito rotador) que se pueden sobrecargar con gestos repetidos o cargas por encima de la cabeza.',
    afecciones: [
      { nombre: 'Tendinopatía del manguito rotador', texto: 'Dolor al elevar el brazo o al dormir sobre el lado afectado.' },
      { nombre: 'Pinzamiento subacromial', texto: 'Dolor al levantar el brazo a cierta altura, por falta de espacio entre estructuras.' },
      { nombre: 'Capsulitis adhesiva (hombro congelado)', texto: 'Rigidez progresiva y pérdida de movimiento en todas las direcciones.' },
      { nombre: 'Inestabilidad o luxación', texto: 'Sensación de que el hombro se sale, sobre todo en deportes de lanzamiento.' },
    ],
    consultar: [
      'Dolor que te despierta por la noche.',
      'Dificultad para peinarte, vestirte o alcanzar un estante.',
      'Pérdida de fuerza al levantar el brazo.',
    ],
    urgencia:
      'Deformidad evidente o imposibilidad de mover el brazo tras una caída. También dolor en el brazo izquierdo con opresión en el pecho, falta de aire o sudor frío.',
  },
  {
    id: 'codo',
    nombre: 'Codo y antebrazo',
    foco: [0, 1.1, 0],
    vista: 'frente',
    distancia: 3.0,
    resumen:
      'En el codo se insertan los tendones de los músculos que mueven la muñeca y los dedos. Por eso se irrita con tareas repetitivas de agarre, como teclear, cargar o usar herramientas.',
    afecciones: [
      { nombre: 'Epicondilitis (codo de tenista)', texto: 'Dolor en la parte externa del codo al agarrar o levantar objetos.' },
      { nombre: 'Epitrocleítis (codo de golfista)', texto: 'Dolor en la parte interna del codo, al flexionar la muñeca o cerrar la mano.' },
      { nombre: 'Bursitis olecraniana', texto: 'Hinchazón en la punta del codo, a menudo por apoyarlo con frecuencia.' },
      { nombre: 'Atrapamiento del nervio cubital', texto: 'Hormigueo en el dedo meñique y el anular al doblar el codo.' },
    ],
    consultar: [
      'Dolor al agarrar, girar el antebrazo o cargar bolsas.',
      'Hormigueo en los dedos al apoyar el codo.',
      'Hinchazón sin golpe previo.',
    ],
    urgencia: 'Deformidad, hinchazón rápida o imposibilidad de doblar el codo tras una caída o un golpe.',
  },
  {
    id: 'mano',
    nombre: 'Muñeca y mano',
    foco: [0, 0.9, 0],
    vista: 'frente',
    distancia: 2.9,
    resumen:
      'La mano combina precisión y fuerza gracias a muchos huesos pequeños, tendones y nervios que pasan por un espacio estrecho en la muñeca.',
    afecciones: [
      { nombre: 'Síndrome del túnel carpiano', texto: 'Hormigueo o adormecimiento en el pulgar, el índice y el dedo medio, sobre todo de noche.' },
      { nombre: 'Tendinitis de De Quervain', texto: 'Dolor en la base del pulgar al agarrar o girar la muñeca.' },
      { nombre: 'Esguince de muñeca', texto: 'Dolor e hinchazón tras una caída apoyando la mano.' },
      { nombre: 'Dedo en gatillo', texto: 'Un dedo que se traba al doblarlo y salta al estirarlo.' },
    ],
    consultar: [
      'Hormigueo que despierta o que aparece al conducir.',
      'Torpeza para abotonar o sostener objetos pequeños.',
      'Dolor persistente tras una caída leve.',
    ],
    urgencia: 'Deformidad, dedos fríos, pálidos o azulados, o pérdida rápida de sensibilidad en la mano.',
  },
  {
    id: 'dorsal',
    nombre: 'Espalda alta y tórax',
    foco: [0, 1.34, 0],
    vista: 'espalda',
    distancia: 3.0,
    resumen:
      'Las doce vértebras dorsales se unen a las costillas y forman la caja torácica, que protege el corazón y los pulmones. Es una zona más rígida que el cuello y la zona lumbar, pero se contractura con las posturas sostenidas.',
    afecciones: [
      { nombre: 'Dorsalgia mecánica', texto: 'Dolor entre los omóplatos, a menudo por sentarse muchas horas.' },
      { nombre: 'Contracturas musculares', texto: 'Zonas tensas y dolorosas al tacto, que limitan girar el tronco.' },
      { nombre: 'Dolor costal o intercostal', texto: 'Dolor punzante al respirar profundo, toser o girar.' },
      { nombre: 'Actitud cifótica', texto: 'Espalda encorvada por hábito, que a veces se acompaña de dolor.' },
    ],
    consultar: [
      'Dolor que aparece o empeora al final de la jornada.',
      'Rigidez al girar el tronco o al respirar hondo.',
      'Cansancio constante en la espalda al estar de pie o sentado.',
    ],
    urgencia:
      'Dolor opresivo en el pecho que dura más de unos minutos, con falta de aire, sudor frío o náuseas. También dolor de espalda tras un golpe fuerte.',
  },
  {
    id: 'lumbar',
    nombre: 'Zona lumbar',
    foco: [0, 1.02, 0],
    vista: 'espalda',
    distancia: 3.0,
    resumen:
      'Las cinco vértebras lumbares soportan buena parte del peso del cuerpo y conectan la espalda con la pelvis. Es la zona donde más consultas de dolor de espalda se originan.',
    afecciones: [
      { nombre: 'Lumbalgia inespecífica', texto: 'Dolor en la parte baja de la espalda sin una causa estructural clara; es la más frecuente.' },
      { nombre: 'Hernia discal', texto: 'Disco que se desplaza y puede irritar un nervio, con dolor que baja a la pierna.' },
      { nombre: 'Ciática', texto: 'Dolor, ardor u hormigueo que baja por la nalga y la parte de atrás de la pierna.' },
      { nombre: 'Estenosis de canal', texto: 'Estrechamiento por donde pasan los nervios; da molestias al caminar o estar de pie.' },
    ],
    consultar: [
      'Dolor que no mejora en una o dos semanas.',
      'Dolor que baja por la pierna.',
      'Dificultad para agacharte, ponerte los zapatos o levantarte de la cama.',
    ],
    urgencia:
      'Pérdida del control de la orina o las heces, adormecimiento en la zona genital o entre las piernas, debilidad que avanza en las piernas, fiebre o dolor tras un golpe fuerte.',
  },
  {
    id: 'cadera',
    nombre: 'Cadera y muslo',
    foco: [0, 0.8, 0],
    vista: 'frente',
    distancia: 3.2,
    resumen:
      'La cadera une la pelvis con el fémur y soporta el peso al caminar, subir escaleras o correr. Alrededor hay músculos grandes, como los glúteos y los flexores, que trabajan constantemente.',
    afecciones: [
      { nombre: 'Bursitis trocantérea', texto: 'Dolor en el lado externo de la cadera, que molesta al acostarse sobre ese lado.' },
      { nombre: 'Síndrome del piriforme', texto: 'Dolor profundo en el glúteo, a veces con molestia que baja por la pierna.' },
      { nombre: 'Pinzamiento femoroacetabular', texto: 'Dolor en la ingle al flexionar la cadera, por un roce entre los huesos.' },
      { nombre: 'Artrosis de cadera', texto: 'Desgaste de la articulación, con rigidez matutina y dolor al caminar.' },
    ],
    consultar: [
      'Cojera o dolor al empezar a caminar.',
      'Dolor en la ingle o el glúteo al subir escaleras.',
      'Dolor al dormir de lado.',
    ],
    urgencia: 'Caída con dolor intenso en la cadera, imposibilidad de apoyar la pierna o pierna rotada o más corta.',
  },
  {
    id: 'rodilla',
    nombre: 'Rodilla y pierna',
    foco: [0, 0.4, 0],
    vista: 'frente',
    distancia: 3.0,
    resumen:
      'La rodilla es una articulación grande y muy expuesta: soporta el peso del cuerpo y depende de ligamentos, meniscos y músculos para mantenerse estable.',
    afecciones: [
      { nombre: 'Síndrome femoropatelar', texto: 'Dolor alrededor o detrás de la rótula al subir escaleras, correr o estar sentado mucho tiempo.' },
      { nombre: 'Lesión de menisco', texto: 'Dolor, bloqueo o chasquidos tras un giro con el pie apoyado.' },
      { nombre: 'Lesión de ligamentos', texto: 'Sensación de que la rodilla "se va", frecuente en deportes con giros.' },
      { nombre: 'Tendinopatía rotuliana', texto: 'Dolor justo debajo de la rótula, típico de deportes con saltos.' },
    ],
    consultar: [
      'Dolor que aumenta al subir o bajar escaleras.',
      'Hinchazón leve que va y viene.',
      'Sensación de inestabilidad al caminar o al cambiar de dirección.',
    ],
    urgencia:
      'Hinchazón rápida tras un golpe, bloqueo que impide estirar la rodilla, o rodilla roja, caliente y dolorosa con fiebre.',
  },
  {
    id: 'pie',
    nombre: 'Tobillo y pie',
    foco: [0, 0.1, 0],
    vista: 'frente',
    distancia: 2.7,
    resumen:
      'El pie tiene más de veinte huesos y funciona como base y amortiguador. De su apoyo depende cómo se reparten las cargas hacia el tobillo, la rodilla y la espalda.',
    afecciones: [
      { nombre: 'Esguince de tobillo', texto: 'Lesión de ligamentos por una torcedura; es una de las lesiones deportivas más frecuentes.' },
      { nombre: 'Fascitis plantar', texto: 'Dolor en el talón o en la planta, más intenso con los primeros pasos de la mañana.' },
      { nombre: 'Tendinopatía de Aquiles', texto: 'Dolor y rigidez en la parte de atrás del tobillo, sobre todo al iniciar la actividad.' },
      { nombre: 'Metatarsalgia', texto: 'Dolor en la parte delantera de la planta, debajo de los dedos.' },
    ],
    consultar: [
      'Dolor en el talón con los primeros pasos del día.',
      'Tobillo que se tuerce con facilidad.',
      'Molestia al correr o caminar distancias que antes tolerabas.',
    ],
    urgencia:
      'Imposibilidad de apoyar el pie tras una torcedura, deformidad, o dolor en la pantorrilla con hinchazón, calor y enrojecimiento en una sola pierna.',
  },
];

export interface Termino {
  nombre: string;
  texto: string;
}

export const GLOSARIO: Termino[] = [
  { nombre: 'Hueso', texto: 'Estructura rígida que da forma al cuerpo, protege órganos y sirve de palanca para el movimiento.' },
  { nombre: 'Articulación', texto: 'Punto donde se unen dos o más huesos y que permite el movimiento, como la rodilla o el hombro.' },
  { nombre: 'Músculo', texto: 'Tejido que se contrae para producir movimiento, mantener la postura y generar fuerza.' },
  { nombre: 'Tendón', texto: 'Cordón resistente que une el músculo con el hueso y transmite la fuerza del músculo.' },
  { nombre: 'Ligamento', texto: 'Banda que une un hueso con otro y da estabilidad a la articulación.' },
  { nombre: 'Nervio', texto: 'Vía que lleva órdenes del cerebro a los músculos y devuelve sensaciones como el tacto o el dolor.' },
];

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

export const PREGUNTAS: Pregunta[] = [
  {
    pregunta: '¿Qué pasa en la primera cita?',
    respuesta:
      'El fisioterapeuta conversa contigo sobre tu molestia y tus antecedentes, evalúa cómo te mueves y acuerda contigo los objetivos. Con eso define el plan de trabajo.',
  },
  {
    pregunta: '¿Duele la fisioterapia?',
    respuesta:
      'Algunas técnicas pueden causar una molestia pasajera. Cuéntale a tu fisioterapeuta lo que sientes durante la sesión para que ajuste lo que haga.',
  },
  {
    pregunta: '¿Cuántas sesiones voy a necesitar?',
    respuesta:
      'Depende de cada persona y de lo que encuentre la valoración. Si necesitas varias sesiones, puedes comprar un paquete en recepción y ver tu saldo en tu cuenta.',
  },
  {
    pregunta: '¿Puedo cancelar o cambiar mi cita?',
    respuesta:
      'Sí, desde tu cuenta, hasta 12 horas antes de la cita. Si faltan menos de 12 horas, llama a recepción.',
  },
  {
    pregunta: '¿Esta información reemplaza a una consulta?',
    respuesta:
      'No. Es una guía general para que entiendas mejor tu cuerpo. No sirve para diagnosticarte ni para decidir un tratamiento: eso lo hace un profesional tras valorarte.',
  },
];
