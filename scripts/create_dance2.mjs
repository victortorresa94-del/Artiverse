import fs from 'fs';

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==';
const BASE_URL = 'https://api.instantly.ai/api/v2';
const SENDER_EMAIL = 'victor@artiversemail.es';
const CONTACTS_FILE = 'C:/Users/Usuario/Downloads/contacts_dance.json';

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
const listId = 'b487fd4c-a45a-41b5-96c6-54b452744646';
console.log(`=== Step 1: Using existing lead list "Dance from Spain 2": ${listId} ===`);

// Step 2: Create campaign with 3-step sequence
console.log('\n=== Step 2: Creating campaign "Dance from Spain 2 - Artiverse" ===');

const step1Body = `Hola {{firstName}},

Supongo que lleváis años enviando dossieres a teatros y festivales que no responden, perdiendo contratos porque el programador no os conocía, y consiguiendo bolos solo a través de quien os conoce de antes.

El problema no sois vosotros.

Es que nunca ha existido un sitio donde los programadores de danza de este país puedan encontrar compañías como la vuestra cuando están montando su temporada.

Hemos creado ARTIVERSE, la primera plataforma que conecta a todos los profesionales de la danza y las artes escénicas en un solo lugar.

En Artiverse encontrarás:
• Perfil profesional visible para programadores de toda España
• Licitaciones públicas centralizadas
• Buscador de compañías por disciplina y estilo
• Contacto directo con teatros, festivales y auditorios

Crear el perfil de {{companyName}} es gratuito y lleva cinco minutos.

¡Nos vemos dentro! → artiverse.es

Víctor
Artiverse`;

const step2Body = `Hola,

Te contacté hace algunos días, contándote sobre Artiverse.

Artiverse es la primera plataforma que reúne a todos los profesionales de la danza y las artes escénicas de España en un solo lugar: compañías, coreógrafos, programadores, teatros y festivales.

Ya tenemos más de 130 perfiles activos. Y cada semana entran más programadores buscando compañías de danza para su temporada.

Crear el perfil de tu compañía es gratuito. → artiverse.es

Víctor`;

const step3Body = `Hola {{firstName}},

Este es mi último intento de contacto.

Las mejores compañías de danza de España ya están en Artiverse, y los programadores de teatro y festivales vienen a buscar aquí.

Crear vuestro perfil es gratuito y lleva cinco minutos. Si en algún momento queréis estar dentro: artiverse.es

Suerte con la temporada.

Víctor`;

const campaignPayload = {
  name: 'Dance from Spain 2 - Artiverse',
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
        delay: 1,
        variants: [{
          subject: 'Lleváis años mandando dossieres. Hay una forma mejor.',
          body: step1Body,
        }],
      },
      {
        type: 'email',
        delay: 4,
        variants: [{
          subject: 'Únete a la plataforma de danza de España.',
          body: step2Body,
        }],
      },
      {
        type: 'email',
        delay: 3,
        variants: [{
          subject: 'Última oportunidad para formar parte de Artiverse',
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
  process.exit(1);
}

// Step 3: Upload leads
console.log('\n=== Step 3: Uploading leads ===');

const contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
console.log(`Total contacts loaded: ${contacts.length}`);

let successCount = 0;
let failCount = 0;
const CONCURRENCY = 5;
const DELAY_MS = 150;

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
