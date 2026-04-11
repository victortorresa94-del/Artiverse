import { readFileSync } from 'fs';

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==';
const LIST_ID = '252a990b-2802-47f5-bc55-61b15fd897c4';
const BASE_URL = 'https://api.instantly.ai/api/v2';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// Step 1: Fetch all existing leads from the list (paginated)
async function fetchExistingEmails() {
  const existingEmails = new Set();
  let startingAfter = null;
  let page = 1;

  console.log('Fetching existing leads from Instantly list...');

  while (true) {
    const body = {
      limit: 100,
      list_id: LIST_ID,
    };
    if (startingAfter) {
      body.starting_after = startingAfter;
    }

    const res = await fetch(`${BASE_URL}/leads/list`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch leads (page ${page}): ${res.status} ${text}`);
    }

    const data = await res.json();
    const items = data.items || data.leads || data.data || [];

    if (items.length === 0) break;

    for (const lead of items) {
      if (lead.email) existingEmails.add(lead.email.toLowerCase().trim());
    }

    console.log(`  Page ${page}: fetched ${items.length} leads (total so far: ${existingEmails.size})`);

    // Check if there are more pages
    if (data.next_starting_after) {
      startingAfter = data.next_starting_after;
    } else if (items.length === 100) {
      // Try using the last item's id or email as cursor
      const lastItem = items[items.length - 1];
      startingAfter = lastItem.id || lastItem.email;
    } else {
      break;
    }

    page++;
    if (page > 50) {
      console.log('  Reached page limit (50), stopping pagination.');
      break;
    }
  }

  console.log(`Total existing emails in list: ${existingEmails.size}`);
  return existingEmails;
}

// Step 2: Read contacts from JSON and filter missing ones
function loadAndFilterContacts(existingEmails) {
  const raw = JSON.parse(readFileSync('C:/Users/Usuario/Downloads/contacts_teatro.json', 'utf8'));

  const toUpload = [];
  let skipped = 0;
  const seenEmails = new Set();

  for (const contact of raw) {
    let email = contact.email || '';
    // Take only the first email if multiple separated by \n or ;
    if (email.includes('\n')) {
      email = email.split('\n')[0].trim();
    } else if (email.includes(';')) {
      email = email.split(';')[0].trim();
    }
    email = email.trim();

    if (!email) {
      skipped++;
      continue;
    }

    const emailLower = email.toLowerCase();

    if (existingEmails.has(emailLower) || seenEmails.has(emailLower)) {
      skipped++;
      continue;
    }

    seenEmails.add(emailLower);
    toUpload.push({
      email,
      company_name: contact.company_name || '',
      city: contact.city || '',
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
    });
  }

  console.log(`Contacts in file: ${raw.length}`);
  console.log(`Already in list (skipped): ${skipped}`);
  console.log(`To upload: ${toUpload.length}`);

  return toUpload;
}

// Step 3: Upload leads in batches with concurrency 5 and 150ms delay
async function uploadLead(contact) {
  const body = {
    list_id: LIST_ID,
    email: contact.email,
    company_name: contact.company_name,
    city: contact.city,
  };
  if (contact.first_name) body.first_name = contact.first_name;
  if (contact.last_name) body.last_name = contact.last_name;

  const res = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, email: contact.email, status: res.status, error: text };
  }

  return { success: true, email: contact.email };
}

async function uploadAll(contacts) {
  const CONCURRENCY = 5;
  const DELAY_MS = 150;

  let uploaded = 0;
  let failed = 0;
  const failures = [];

  // Process in batches of CONCURRENCY
  for (let i = 0; i < contacts.length; i += CONCURRENCY) {
    const batch = contacts.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(c => uploadLead(c)));

    for (const result of results) {
      if (result.success) {
        uploaded++;
      } else {
        failed++;
        failures.push(result);
        // Log duplicate/common errors briefly
        if (result.status !== 409 && result.status !== 422) {
          console.log(`  FAIL [${result.status}] ${result.email}: ${result.error.substring(0, 100)}`);
        }
      }
    }

    const done = Math.min(i + CONCURRENCY, contacts.length);
    process.stdout.write(`\r  Uploading... ${done}/${contacts.length} (ok: ${uploaded}, fail: ${failed})`);

    if (i + CONCURRENCY < contacts.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(''); // newline after progress

  return { uploaded, failed, failures };
}

// Main
async function main() {
  console.log('=== add_teatro_missing.mjs ===\n');

  const existingEmails = await fetchExistingEmails();
  console.log('');

  const toUpload = loadAndFilterContacts(existingEmails);
  console.log('');

  if (toUpload.length === 0) {
    console.log('Nothing to upload. All contacts are already in the list.');
    return;
  }

  console.log(`Starting upload of ${toUpload.length} contacts (concurrency=5, delay=150ms)...`);
  const { uploaded, failed, failures } = await uploadAll(toUpload);

  console.log('\n=== REPORT ===');
  console.log(`Already in list (skipped): ${502 - toUpload.length}`);
  console.log(`Uploaded successfully:      ${uploaded}`);
  console.log(`Failed:                     ${failed}`);

  if (failures.length > 0) {
    const duplicates = failures.filter(f => f.status === 409 || f.status === 422).length;
    const others = failures.filter(f => f.status !== 409 && f.status !== 422);
    if (duplicates > 0) console.log(`  - Duplicate/already exists: ${duplicates}`);
    if (others.length > 0) {
      console.log(`  - Other errors:`);
      for (const f of others.slice(0, 10)) {
        console.log(`    [${f.status}] ${f.email}: ${f.error.substring(0, 120)}`);
      }
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
