'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ חסרים משתני סביבה ב-.env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// IDs מאושרים — batch 1
const CUSTOMER_IDS = [4, 7, 10, 22, 23, 30, 52, 60, 117, 123, 145, 279];

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FitBalance — Reset Passwords Batch 1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // שלוף לקוחות + auth_id
  const { data: profiles, error: profErr } = await sb
    .from('user_profiles')
    .select('auth_id, linked_id')
    .eq('linked_table', 'customers')
    .in('linked_id', CUSTOMER_IDS);

  if (profErr) { console.error('❌ שגיאה בשליפת profiles:', profErr.message); process.exit(1); }

  const { data: customers, error: custErr } = await sb
    .from('customers')
    .select('id, firstName, lastName, email, idValue')
    .in('id', CUSTOMER_IDS);

  if (custErr) { console.error('❌ שגיאה בשליפת customers:', custErr.message); process.exit(1); }

  let success = 0, error = 0;

  for (const profile of profiles) {
    const customer = customers.find(c => c.id === profile.linked_id);
    if (!customer) {
      console.log(`❌ לא נמצאה לקוחה עבור linked_id=${profile.linked_id}`);
      error++;
      continue;
    }

    const password = String(customer.idValue).trim();

    const { error: updateErr } = await sb.auth.admin.updateUserById(
      profile.auth_id,
      { password }
    );

    if (updateErr) {
      console.log(`❌ [${customer.id}] ${customer.firstName} ${customer.lastName || ''} — ${JSON.stringify(updateErr)}`);
      error++;
    } else {
      console.log(`✅ [${customer.id}] ${customer.firstName} ${customer.lastName || ''} — ${customer.email}`);
      success++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ SUCCESS: ${success}`);
  console.log(`  ❌ ERROR:   ${error}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(err => {
  console.error('❌ שגיאה לא צפויה:', err.message);
  process.exit(1);
});
