// set-customer-categories.js
// מגדיר category_code לפי גיל:
//   גיל < 16  → '2' (ילדות/נערות)
//   גיל >= 16 → '1' (נשים)
//   אין birthDate → נשאר ללא קבוצה
//
// הרצה (DRY RUN):  node set-customer-categories.js
// הרצה (LIVE):     DRY_RUN=false node set-customer-categories.js

'use strict';

require('dotenv').config();

const WebSocket = require('ws');
global.WebSocket = WebSocket;

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN                  = process.env.DRY_RUN !== 'false';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ חסרים SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY ב-.env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AGE_CUTOFF = 16;
const TODAY = new Date();

function calcAge(birthDate) {
  const bd = new Date(birthDate);
  let age = TODAY.getFullYear() - bd.getFullYear();
  const m = TODAY.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && TODAY.getDate() < bd.getDate())) age--;
  return age;
}

async function run() {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  FitBalance — Set Customer Categories`);
  console.log(`  מצב: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const { data: customers, error } = await sb
    .from('customers')
    .select('id, firstName, lastName, birthDate')
    .is('category_code', null);

  if (error) { console.error('❌ שגיאה בשליפה:', error.message); process.exit(1); }

  console.log(`  נמצאו ${customers.length} לקוחות ללא קטגוריה\n`);

  let women = 0, youth = 0, skipped = 0;

  const toUpdate = [];
  customers.forEach(c => {
    if (!c.birthDate) { skipped++; return; }
    const age = calcAge(c.birthDate);
    const category_code = age < AGE_CUTOFF ? '2' : '1';
    toUpdate.push({ id: c.id, category_code });
    if (category_code === '1') women++;
    else youth++;
    if (DRY_RUN) {
      console.log(`  [DRY] ${c.firstName} ${c.lastName} | גיל ${age} → קטגוריה ${category_code}`);
    }
  });

  if (!DRY_RUN && toUpdate.length > 0) {
    // עדכון בבאצ'ים של 100
    const BATCH = 100;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      const { error: upErr } = await sb.from('customers').upsert(batch, { onConflict: 'id' });
      if (upErr) { console.error(`❌ שגיאה בעדכון batch ${i}:`, upErr.message); process.exit(1); }
      console.log(`  ✅ עודכנו ${Math.min(i + BATCH, toUpdate.length)}/${toUpdate.length}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  נשים (1):          ${women}`);
  console.log(`  ילדות/נערות (2):   ${youth}`);
  console.log(`  ללא תאריך לידה:    ${skipped}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  if (DRY_RUN) console.log('  ⚠️  DRY RUN — לא בוצעו שינויים. הרץ עם DRY_RUN=false להחיל.\n');
}

run().catch(err => { console.error('❌ שגיאה:', err.message); process.exit(1); });
