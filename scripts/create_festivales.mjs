import fs from 'fs';

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==';
const BASE_URL = 'https://api.instantly.ai/api/v2';
const SENDER_EMAIL = 'victor@artiversemail.es';
const CONTACTS_FILE = 'C:/Users/Usuario/Downloads/contacts_festivales.json';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function apiCall(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${path} => ${res.status}: ${text}`);
  }
  return data;
}

// Step 1: Lead list already created in previous run
// Using existing list ID
const listId = '18c9a4aa-aa3b-4a99-b4f6-1a17a3383011';
console.log(`=== Step 1: Using existing lead list "Festivales 1": ${listId} ===`);

// Step 2: Create campaign with 3-step sequence
console.log('\n=== Step 2: Creating campaign "Festivales - Artiverse" ===');

const step1Body = `Hola {{firstName}},

Organizar la programación de un festival conlleva meses recibiendo dossieres por email, buscando propuestas por ferias del sector y tirando de contactos personales.

Hemos creado Artiverse para centralizar todo eso.

Una plataforma donde compañías de teatro, grupos de música, colectivos de danza y artistas de toda España tienen su perfil verificado. Puedes filtrar por disciplina, estilo, ciudad y presupuesto. Y contactar directamente dentro de la plataforma.

Más de 130 compañías y agencias ya tienen perfil. Cada semana entran más.

¿Le echas un vistazo? → artiverse.es

Víctor
Artiverse`;

const step2Body = `Hola,

Te escribí hace unos días. Por si no te llegó:

Artiverse es la primera plataforma del sector escénico español donde los programadores de festivales pueden buscar artistas directamente, sin intermediarios. Compañías, grupos, solistas y colectivos de toda España, con perfil verificado y contacto directo.

Es gratuito para festivales y programadores.

→ artiverse.es

Víctor`;

const step3Body = `Hola {{firstName}},

Este es mi último intento.

Si en algún momento necesitas propuestas artísticas para tu festival, aquí tienes acceso directo a más de 130 compañías verificadas del sector: artiverse.es

Es gratuito. Sin compromiso.

Mucho ánimo con el festival.

Víctor
Artiverse`;

const campaignPayload = {
  name: 'Festivales - Artiverse',
  email_accounts: [{ email: SENDER_EMAIL }],
  lead_list_ids: [listId],
  campaign_schedule: {
    schedules: [{
      name: 'Weekdays',
      timing: { from: '08:00', to: '18:00' },
      days: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
      timezone: 'Etc/GMT+12',
    }],
  },
  sequences: [{
    steps: [
      {
        type: 'email',
        delay: 0,
        variants: [{
          subject: 'Los mejores artistas de España, donde los puedas encontrar.',
          body: step1Body,
        }],
      },
      {
        type: 'email',
        delay: 5,
        variants: [{
          subject: '¿Tienes cubierta la programación para la próxima edición?',
          body: step2Body,
        }],
      },
      {
        type: 'email',
        delay: 4,
        variants: [{
          subject: 'Último mensaje — te dejo el acceso',
          body: step3Body,
        }],
      },
    ],
  }],
};

let campaignId;
try {
  const campRes = await apiCall('POST', '/campaigns', campaignPayload);
  console.log('Campaign response:', JSON.stringify(campRes));
  campaignId = campRes.id;
  console.log(`Campaign created: ${campaignId}`);
} catch (err) {
  console.error('Error creating campaign:', err.message);
  // Try to continue anyway if we got partial data
  process.exit(1);
}

// Step 3: Upload leads
console.log('\n=== Step 3: Uploading leads ===');

const contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
console.log(`Total contacts loaded: ${contacts.length}`);

let successCount = 0;
let failCount = 0;
const CONCURRENCY = 5;
const DELAY_MS = 200; // ~5 req/s per slot = 25 req/s total, safe under 10 req/s with 5 concurrent + 200ms delay

async function uploadLead(contact) {
  // Use only first email if multiple (split by \n)
  const email = contact.email ? contact.email.split('\n')[0].trim() : '';
  if (!email) {
    return { success: false, reason: 'no email' };
  }

  const firstName = contact.first_name || '';
  const companyName = contact.company_name || '';

  const body = {
    list_id: listId,
    email,
    ...(firstName && { first_name: firstName }),
    ...(companyName && { company_name: companyName }),
  };

  try {
    await apiCall('POST', '/leads', body);
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

async function runWithConcurrency(items, concurrency, fn, delayMs) {
  let index = 0;
  const results = [];

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const result = await fn(items[i]);
      results[i] = result;
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        if (failCount <= 10) {
          console.log(`  FAIL [${i}] ${items[i].email}: ${result.reason}`);
        }
      }
      if (i % 50 === 0) {
        console.log(`  Progress: ${i}/${items.length} (ok: ${successCount}, fail: ${failCount})`);
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

await runWithConcurrency(contacts, CONCURRENCY, uploadLead, DELAY_MS);

console.log('\n=== DONE ===');
console.log(`Campaign ID:  ${campaignId}`);
console.log(`List ID:      ${listId}`);
console.log(`Leads uploaded successfully: ${successCount} / ${contacts.length}`);
console.log(`Leads failed: ${failCount}`);
