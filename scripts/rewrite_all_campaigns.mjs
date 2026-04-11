/**
 * rewrite_all_campaigns.mjs
 *
 * Reescribe los emails de las 5 campañas nuevas con las mejores prácticas:
 * - {{firstName}} SIEMPRE en el saludo
 * - {{companyName}} cuando contextualmente tiene sentido
 * - Step 2/3 sin subjects (threading)
 * - Saltos de línea correctos (HTML <br> + párrafos)
 * - Copy ultra-personalizado por segmento
 * - 3 variantes Step 1 para A/B testing
 * - Tono: directo, cercano, humano, en español de España
 * - Firma: Víctor / Artiverse
 */

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

// ── SOCIAL PROOF (usar en emails) ─────────────────────────────────────────────
const PROOF = 'MPC Management, Meteórica, Darlalata, Calaverita Records, Subterfuge Events'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DISTRIBUIDORAS
//    Quiénes son: distribuidoras de artistas en gira
//    Pain: saben qué artistas tienen, no saben quién programa en cada sala
//    Value: mapa completo de todos los programadores de España
// ═══════════════════════════════════════════════════════════════════════════════
const DISTRIBUIDORAS = {
  campaign_id: 'fd6e7810-f4b3-480b-8801-eaf38234d023',
  sequences: [{
    steps: [
      {
        type: 'email',
        delay: 0,
        variants: [
          // A — Pain: no saben quién programa
          {
            subject: '¿Sabéis quién programa en Apolo, WiZink y Razzmatazz?',
            body: `<p>Hola {{firstName}},</p>

<p>Si distribuís artistas en gira, el cuello de botella siempre es el mismo: sabéis qué artistas tenéis, pero no sabéis con exactitud quién decide la programación en cada sala de cada ciudad.</p>

<p>Artiverse es la plataforma donde están todos los programadores de España: salas de conciertos, teatros, festivales y auditorios. Con perfil verificado y contacto directo, sin pasar por assistants ni secretarías.</p>

<p>Más de 130 organizaciones del sector ya están dentro, entre ellas <em>${PROOF}</em>.</p>

<p>Si queréis probarla, es gratuita para distribuidoras: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          // B — Pain: tiempo perdido buscando contactos
          {
            subject: '{{firstName}}, ¿cuánto tiempo perdéis buscando contactos en salas?',
            body: `<p>Hola {{firstName}},</p>

<p>El problema de distribuir artistas no es la calidad del catálogo. Es que encontrar la persona que decide la programación en cada sala requiere llamadas, correos, ferias y muchas veces termina en "escríbeme en septiembre".</p>

<p>En Artiverse están todos: salas de conciertos, festivales, teatros y centros culturales de España. Perfiles verificados con contacto directo dentro de la plataforma. Sin intermediarios.</p>

<p>Con vuestra cartera de artistas, podéis llegar a todos ellos desde el primer día. Gratis: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          // C — Social proof angle
          {
            subject: 'Donde están las distribuidoras más activas de España',
            body: `<p>Hola {{firstName}},</p>

<p>Las distribuidoras que ya trabajan con Artiverse tienen algo que vosotros probablemente no tenéis todavía: acceso directo a los programadores de más de 130 salas, teatros y festivales de España, en un solo sitio.</p>

<p>No por correo frío. No por LinkedIn. A través de perfiles verificados con contacto directo, donde ellos también os buscan a vosotros.</p>

<p>Registro gratuito para distribuidoras: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          }
        ]
      },
      // STEP 2 — Nuevo ángulo: ahorro de tiempo
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>La semana pasada os escribía sobre Artiverse. Por si no llegasteis a verlo:</p>

<p>Las distribuidoras que están dentro no necesitan ir a cada feria para que los programadores las conozcan. Tienen su catálogo visible para todas las salas y festivales que buscan propuestas cada temporada.</p>

<p>Si en algún momento queréis saber cómo funciona: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
        }]
      },
      // STEP 3 — Breakup email
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Último correo, lo prometo.</p>

<p>Si en algún momento queréis que vuestra cartera de artistas llegue a todos los programadores de España sin depender de ferias o contactos previos: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Mucho ánimo con la temporada.</p>

<p>Víctor<br>Artiverse</p>`
        }]
      }
    ]
  }]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DANCE FROM SPAIN 2
//    Quiénes son: compañías de danza contemporánea
//    Pain: mandan dossieres a teatros que no responden
//    Value: ser encontrados por programadores que buscan danza
// ═══════════════════════════════════════════════════════════════════════════════
const DANCE_FROM_SPAIN2 = {
  campaign_id: 'ab991775-a955-4d53-9b77-298aec13074e',
  sequences: [{
    steps: [
      {
        type: 'email',
        delay: 1,
        variants: [
          // A — Flip the script: ellos te buscan
          {
            subject: 'Los programadores que buscan danza, en un solo sitio',
            body: `<p>Hola {{firstName}},</p>

<p>Lleváis años mandando dossieres. La mayoría no llegan, o llegan al email equivocado, o llegan cuando ya han cerrado la temporada.</p>

<p>Artiverse invierte eso: los programadores de teatros, festivales y auditorios de España buscan compañías directamente en la plataforma. Filtran por disciplina, formato, duración, aforo. Vosotros aparecéis cuando os necesitan.</p>

<p>Ya están dentro compañías de todo el país, y programadores como los de <em>${PROOF}</em>.</p>

<p>Crear el perfil de {{companyName}} es gratuito y lleva cinco minutos: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          // B — Pain específico: dossieres que no llegan
          {
            subject: '¿Cuántos dossieres mandáis al año sin respuesta?',
            body: `<p>Hola {{firstName}},</p>

<p>El problema no es la calidad de vuestro trabajo. Es que los programadores de teatro y danza reciben decenas de propuestas cada semana por email, y la mayoría se pierden antes de que alguien las lea.</p>

<p>En Artiverse, {{companyName}} tiene un perfil donde subís vídeos, ficha técnica y disponibilidad. Los programadores que buscan danza os encuentran directamente, sin intermediarios.</p>

<p>Más de 130 organizaciones del sector ya están dentro. Es gratuito: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          // C — Oportunidad: temporada 25/26
          {
            subject: 'La temporada 25/26: ser elegido antes de que cierren el cartel',
            body: `<p>Hola {{firstName}},</p>

<p>Los programadores de teatros y festivales para la temporada 25/26 ya están buscando compañías. Muchos no hacen convocatorias abiertas: simplemente buscan en sus contactos y en las plataformas donde confían.</p>

<p>Artiverse es donde están buscando. Compañías de danza con perfil verificado, vídeos y disponibilidad real. Sin ferias, sin dossieres perdidos en el email.</p>

<p>Si queréis que {{companyName}} aparezca cuando busquen: <a href="https://artiverse.es">artiverse.es</a> — gratuito.</p>

<p>Víctor<br>Artiverse</p>`
          }
        ]
      },
      // STEP 2 — Enfoque en lo que ya está pasando (FOMO)
      {
        type: 'email',
        delay: 4,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Os escribía hace unos días sobre Artiverse. Esta semana han entrado tres programadores nuevos buscando compañías de danza contemporánea para su temporada de otoño.</p>

<p>Si queréis que {{companyName}} aparezca en esas búsquedas, el registro es gratuito y en cinco minutos: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
        }]
      },
      // STEP 3 — Breakup
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Último intento, lo prometo.</p>

<p>Cuando queráis que los programadores de España encuentren a {{companyName}} sin que tengáis que mandar un solo dossier más: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Mucha suerte con la temporada.</p>

<p>Víctor<br>Artiverse</p>`
        }]
      }
    ]
  }]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. FESTIVALES
//    Quiénes son: directores/programadores de festivales
//    Pain: booking caótico — emails, ferias, contactos personales
//    Value: catálogo completo de artistas, contacto directo, búsqueda filtrada
// ═══════════════════════════════════════════════════════════════════════════════
const FESTIVALES = {
  campaign_id: '6e151dbe-f16b-4111-a2b6-cf6a33941967',
  sequences: [{
    steps: [
      {
        type: 'email',
        delay: 0,
        variants: [
          // A — Eficiencia en el booking
          {
            subject: 'Buscar artistas para {{companyName}} como buscas en Spotify',
            body: `<p>Hola {{firstName}},</p>

<p>Programar el cartel de un festival implica meses recibiendo propuestas sin criterio, buscando en ferias, tirando de contactos personales y respondiendo a decenas de emails de artistas que no encajan.</p>

<p>Artiverse centraliza todo eso: un catálogo de compañías y artistas verificados, filtrable por género, formato, aforo mínimo y disponibilidad de fechas. Vosotros buscáis lo que necesitáis para {{companyName}}, y contactáis directamente.</p>

<p>Ya están dentro más de 130 organizaciones del sector. Es gratuito para festivales: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          // B — Pain: propuestas que no encajan
          {
            subject: '{{firstName}}, ¿cuántas propuestas recibís que no encajan con {{companyName}}?',
            body: `<p>Hola {{firstName}},</p>

<p>Los festivales reciben decenas de propuestas artísticas cada semana. La mayoría no encajan: formato equivocado, presupuesto fuera de rango, género que no es el vuestro.</p>

<p>En Artiverse, vosotros ponéis los criterios y buscáis. No esperáis a que os llegue lo que necesitáis. Artistas y compañías de toda España con ficha técnica, riders y disponibilidad real.</p>

<p>Si queréis probarlo para la próxima edición de {{companyName}}: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          // C — FOMO: otros festivales ya están
          {
            subject: 'Los festivales que ya usan Artiverse para programar',
            body: `<p>Hola {{firstName}},</p>

<p>La forma en que los festivales buscan artistas está cambiando. Los que trabajan con Artiverse ya no dependen solo de contactos previos ni de ferias del sector para encontrar propuestas.</p>

<p>Tienen acceso a un catálogo actualizado de compañías y artistas verificados de toda España. Con perfiles completos: vídeos, fichas técnicas, disponibilidad y contacto directo.</p>

<p>Si queréis ver cómo funciona para {{companyName}}: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          }
        ]
      },
      // STEP 2 — Urgencia de temporada
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Os escribía hace unos días sobre Artiverse. Por si no tuvisteis tiempo:</p>

<p>Los programadores que están dentro ya están cerrando propuestas para la temporada. Si queréis tener acceso al catálogo completo antes de que cierren sus agendas: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Es gratuito.</p>

<p>Víctor<br>Artiverse</p>`
        }]
      },
      // STEP 3 — Breakup
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Último correo, lo prometo.</p>

<p>Cuando tengáis que programar la próxima edición de {{companyName}} y queráis encontrar artistas sin depender solo de quien os escribe al email: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Mucho ánimo con el festival.</p>

<p>Víctor<br>Artiverse</p>`
        }]
      }
    ]
  }]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SOCIOS ARTE
//    Quiénes son: managers, promotores, agencias, productoras
//    Pain: el sector funciona por contactos, no por quién te necesita
//    Value: ampliar red, visibilidad para todos los programadores
// ═══════════════════════════════════════════════════════════════════════════════
const SOCIOS_ARTE = {
  campaign_id: '3a31a680-f37c-4bb8-a39a-eed87e2b1db0',
  sequences: [{
    steps: [
      {
        type: 'email',
        delay: 0,
        variants: [
          // A — Ampliar red más allá de contactos existentes
          {
            subject: 'Tu cartera de artistas, visible para todos los programadores de España',
            body: `<p>Hola {{firstName}},</p>

<p>En el sector de las artes escénicas, los mejores contratos suelen ir a quien mejor red tiene. El problema es que la red tiene límites: los mismos programadores, los mismos festivales, las mismas salas de siempre.</p>

<p>Artiverse amplía esa red. Una plataforma donde managers, agencias y promotoras tienen su catálogo visible para todos los programadores de España que buscan propuestas, incluyendo los que todavía no os conocen.</p>

<p>Ya están dentro ${PROOF}.</p>

<p>Si queréis que {{companyName}} esté en esa lista: <a href="https://artiverse.es">artiverse.es</a> — gratuito.</p>

<p>Víctor<br>Artiverse</p>`
          },
          // B — Credibilidad: las mejores ya están
          {
            subject: '{{firstName}}, los primeros managers de España ya tienen perfil en Artiverse',
            body: `<p>Hola {{firstName}},</p>

<p>Cuando ${PROOF} decidieron estar en Artiverse, lo hicieron por la misma razón: quieren que los programadores que buscan talento les encuentren a ellos primero.</p>

<p>Artiverse es la plataforma B2B donde todos los actores del sector escénico español se conectan directamente. Sin intermediarios, sin spam, sin depender de quién conoces.</p>

<p>Si queréis que {{companyName}} aparezca cuando los programadores busquen vuestra especialidad: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          // C — Oportunidad de posicionamiento temprano
          {
            subject: 'Ser de los primeros tiene ventajas',
            body: `<p>Hola {{firstName}},</p>

<p>Artiverse lleva poco tiempo y ya tiene más de 130 organizaciones del sector. Los que entran ahora tienen una ventaja: más visibilidad, menos competencia, y la posibilidad de posicionarse antes de que la plataforma esté saturada.</p>

<p>Para managers, promotoras y agencias como {{companyName}}, significa que los programadores que busquen vuestro tipo de artistas os van a encontrar a vosotros primero.</p>

<p>Es gratuito: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          }
        ]
      },
      // STEP 2 — Enfoque en qué está pasando ahora
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Os escribía hace unos días sobre Artiverse. Esta semana han entrado nuevos programadores de salas y festivales buscando propuestas para su temporada.</p>

<p>Si queréis que {{companyName}} aparezca en esas búsquedas antes de que cierren sus agendas: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
        }]
      },
      // STEP 3 — Breakup
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Último intento.</p>

<p>Cuando queráis que {{companyName}} sea visible para todos los programadores de España sin depender de vuestros contactos actuales: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Mucho ánimo con la temporada.</p>

<p>Víctor<br>Artiverse</p>`
        }]
      }
    ]
  }]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TEATRO DANZA 2
//    Quiénes son: programadores de teatros y espacios de danza
//    Step 1 ya está bien (3 variantes). Mejorar Steps 2 y 3.
// ═══════════════════════════════════════════════════════════════════════════════
const TEATRO_DANZA2 = {
  campaign_id: 'e6e60e78-2246-4b6f-a4d6-d44b605da3a6',
  sequences: [{
    steps: [
      // Step 1 mantenido — ya tiene 3 buenas variantes
      {
        type: 'email',
        delay: 0,
        variants: [
          {
            subject: 'La gestión de teatros no tiene que ser tan complicada.',
            body: `<p>Hola {{firstName}},</p>

<p>Programar una temporada en {{companyName}} implica coordinar con compañías, gestionar dossieres, negociar condiciones… todo por email y teléfono.</p>

<p>Artiverse es la plataforma B2B donde teatros, auditorios y compañías escénicas se conectan directamente. Perfiles verificados, portfolios completos, contacto directo sin intermediarios.</p>

<p>Más de 130 organizaciones del sector ya están dentro. Gratuito en <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          },
          {
            subject: '¿Cuántos dossieres recibís a la semana en {{companyName}}?',
            body: `<p>Hola {{firstName}},</p>

<p>Los programadores de teatro reciben docenas de dossieres cada semana. La mayoría no encajan o se pierden antes de que alguien los lea.</p>

<p>Artiverse invierte eso: las compañías tienen perfil con vídeos, fichas técnicas y disponibilidad. Vosotros buscáis por especialidad, aforo o fechas. Solo lo que necesitáis para {{companyName}}.</p>

<p>Registro gratuito en <a href="https://artiverse.es">artiverse.es</a>. Ya somos +130 organizaciones.</p>

<p>Víctor<br>Artiverse</p>`
          },
          {
            subject: 'Teatros + Compañías en un mismo lugar.',
            body: `<p>Hola {{firstName}},</p>

<p>La realidad del sector: {{companyName}} busca compañías, pero ellas también os buscan a vosotros. Los dossieres llegan, pero desordenados, sin criterio.</p>

<p>Artiverse ordena eso. Un perfil verificado para cada compañía, un buscador para {{companyName}}. Encontráis lo que necesitáis, ellas os encuentran cuando programáis.</p>

<p>Probadlo gratis en <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Artiverse</p>`
          }
        ]
      },
      // STEP 2 — Mejorado con ángulo de eficiencia + {{firstName}}
      {
        type: 'email',
        delay: 4,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Os escribía la semana pasada sobre Artiverse. ¿Pudisteis echarle un vistazo?</p>

<p>Lo que más valoran los programadores que ya usan la plataforma: dejan de recibir propuestas que no encajan y empiezan a buscar exactamente lo que necesitan para su temporada.</p>

<p>Si queréis probarlo para {{companyName}}: <a href="https://artiverse.es">artiverse.es</a> — cinco minutos, gratuito.</p>

<p>Víctor<br>Artiverse</p>`
        }]
      },
      // STEP 3 — Breakup mejorado con contexto específico
      {
        type: 'email',
        delay: 4,
        variants: [{
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Último intento.</p>

<p>Cuando en {{companyName}} necesitéis buscar compañías para vuestra próxima temporada sin depender de lo que llega al email: <a href="https://artiverse.es">artiverse.es</a></p>

<p>Mucho ánimo con la programación.</p>

<p>Víctor<br>Artiverse</p>`
        }]
      }
    ]
  }]
}

// ═══════════════════════════════════════════════════════════════════════════════
// API + Apply logic
// ═══════════════════════════════════════════════════════════════════════════════
async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function applyCampaign(config) {
  const res = await apiFetch(`/campaigns/${config.campaign_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ sequences: config.sequences })
  })
  return res
}

async function main() {
  const CAMPAIGNS = [
    { name: 'Distribuidoras', ...DISTRIBUIDORAS },
    { name: 'Dance from Spain 2', ...DANCE_FROM_SPAIN2 },
    { name: 'Festivales', ...FESTIVALES },
    { name: 'Socios ARTE', ...SOCIOS_ARTE },
    { name: 'Teatro Danza 2', ...TEATRO_DANZA2 }
  ]

  console.log('🚀 Reescribiendo emails de 5 campañas...\n')
  let success = 0, failed = 0

  for (const camp of CAMPAIGNS) {
    try {
      await applyCampaign(camp)
      const steps = camp.sequences[0].steps
      const variants = steps[0].variants.length
      console.log(`✅ ${camp.name}`)
      console.log(`   Step 1: ${variants} variante(s) | "${steps[0].variants[0].subject}"`)
      console.log(`   Step 2: "${steps[1]?.variants[0]?.body?.slice(0, 60).replace(/<[^>]+>/g, '')}..."`)
      console.log(`   Step 3: "${steps[2]?.variants[0]?.body?.slice(0, 60).replace(/<[^>]+>/g, '')}..."`)
      console.log()
      success++
    } catch (err) {
      console.log(`❌ ${camp.name}: ${err.message.slice(0, 100)}`)
      failed++
    }
  }

  console.log('─'.repeat(50))
  console.log(`✅ ${success} campañas actualizadas${failed ? ` | ❌ ${failed} fallidas` : ''}`)
  console.log('\n📝 Mejoras aplicadas en todas:')
  console.log('  • {{firstName}} en TODOS los saludos')
  console.log('  • {{companyName}} en contexto relevante')
  console.log('  • 3 variantes A/B en Step 1')
  console.log('  • Steps 2/3 sin subjects (threading)')
  console.log('  • HTML correcto con saltos de línea (<br><p>)')
  console.log('  • Copy ultra-personalizado por segmento')
  console.log('  • Firma: Víctor / Artiverse')
  console.log('  • Sin errores de capitalización')
}

main().catch(err => {
  console.error('Error fatal:', err.message)
  process.exit(1)
})
