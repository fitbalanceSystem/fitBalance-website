// migrate-family-batch1.js
// מיגרציה ממוקדת — 12 לקוחות מקבוצת המשפחות (batch 1)
// הרצה: node migrate-family-batch1.js
// דרישות: npm install @supabase/supabase-js dotenv ws

'use strict';

require('dotenv').config();

const WebSocket = require('ws');
global.WebSocket = WebSocket;

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

// ─── 1. בדיקת משתני סביבה ───────────────────────────────────────────────────

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN                  = process.env.DRY_RUN !== 'false'; // ברירת מחדל: true

const MISSING = [];
if (!SUPABASE_URL)              MISSING.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) MISSING.push('SUPABASE_SERVICE_ROLE_KEY');

if (MISSING.length > 0) {
  console.error('\n❌  חסרים משתני סביבה נדרשים ב-.env:');
  MISSING.forEach(k => console.error(`    • ${k}`));
  console.error('\nהסקריפט עצר. עדכן את קובץ migration/.env והרץ שוב.\n');
  process.exit(1);
}

console.log('\n🔍 בדיקת משתני סביבה:');
console.log(`  SUPABASE_URL:              ${SUPABASE_URL}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ קיים' : '❌ חסר'}`);
console.log(`  DRY_RUN:                   ${DRY_RUN}`);

// ─── 2. רשימת IDs מאושרת ידנית ──────────────────────────────────────────────
// אושרה לאחר בדיקת כפילויות, idValue ו-user_profiles
// כל שינוי ברשימה דורש אישור מחדש

const APPROVED_IDS = [4, 7, 10, 22, 23, 30, 52, 60, 117, 123, 145, 279];

// ─── 3. Supabase Admin Client ────────────────────────────────────────────────

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
});

// ─── 4. fetchApprovedCustomers ───────────────────────────────────────────────
// שולפת רק את הלקוחות מהרשימה המאושרת
// מוודאת שוב שאין user_profile קיים (שכבת הגנה)

async function fetchApprovedCustomers() {
  const { data: customers, error } = await sb
    .from('customers')
    .select('id, firstName, lastName, email, idValue')
    .in('id', APPROVED_IDS);

  if (error) throw new Error(`שגיאה בשליפת לקוחות: ${error.message}`);

  // שלוף user_profiles קיימים
  const { data: existingProfiles, error: profErr } = await sb
    .from('user_profiles')
    .select('linked_id')
    .eq('linked_table', 'customers')
    .in('linked_id', APPROVED_IDS);

  if (profErr) throw new Error(`שגיאה בשליפת user_profiles: ${profErr.message}`);

  const migratedIds = new Set((existingProfiles || []).map(p => p.linked_id));

  // סנן לקוחות שכבר עברו מיגרציה
  return customers.filter(c => !migratedIds.has(c.id));
}

// ─── 5. checkAlreadyMigrated ─────────────────────────────────────────────────
// שכבת הגנה שנייה — בדיקה ברמת הלקוחה הבודדת

async function checkAlreadyMigrated(customerId) {
  const { data, error } = await sb
    .from('user_profiles')
    .select('id')
    .eq('linked_table', 'customers')
    .eq('linked_id', customerId)
    .maybeSingle();

  if (error) throw new Error(`שגיאה בבדיקת מיגרציה קיימת: ${error.message}`);
  return data !== null;
}

// ─── 6. createAuthUser ───────────────────────────────────────────────────────
// סיסמה = idValue (כמו בסקריפט המקורי)

async function createAuthUser(email, idValue) {
  const password = String(idValue).trim();

  if (password.length < 6) {
    return {
      auth_id: null,
      error:   `idValue קצר מדי (${password.length} תווים) — נדרש מינימום 6`,
    };
  }

  const { data, error } = await sb.auth.admin.createUser({
    email:         email.toLowerCase().trim(),
    password,
    email_confirm: true,
  });

  if (error) {
    if (
      error.message?.toLowerCase().includes('already registered') ||
      error.message?.toLowerCase().includes('already exists') ||
      error.code === 'email_exists'
    ) {
      return { auth_id: null, error: null, alreadyExists: true };
    }
    return { auth_id: null, error: error.message };
  }

  return { auth_id: data.user.id, error: null };
}

// ─── 7. createUserProfile ────────────────────────────────────────────────────

async function createUserProfile(authId, customerId) {
  const { error } = await sb
    .from('user_profiles')
    .insert({
      auth_id:      authId,
      role:         'customer',
      linked_table: 'customers',
      linked_id:    customerId,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

// ─── 8. migrateOne ───────────────────────────────────────────────────────────

async function migrateOne(customer) {
  const base = {
    customer_id: customer.id,
    name:        `${customer.firstName} ${customer.lastName || ''}`.trim(),
    email:       customer.email,
    auth_id:     null,
    timestamp:   new Date().toISOString(),
  };

  // שכבת הגנה שנייה
  const alreadyDone = await checkAlreadyMigrated(customer.id);
  if (alreadyDone) {
    return { ...base, status: 'SKIPPED', reason: 'user_profiles כבר קיים' };
  }

  // ── DRY RUN ──
  if (DRY_RUN) {
    const password = String(customer.idValue).trim();
    if (password.length < 6) {
      return {
        ...base,
        status: 'ERROR',
        reason: `[DRY RUN] idValue קצר מדי (${password.length} תווים)`,
      };
    }
    return {
      ...base,
      status: 'DRY_RUN',
      reason: 'DRY_RUN=true — לא בוצעה פעולה אמיתית',
    };
  }

  // ── יצירת Auth user ──
  const { auth_id, error: authErr, alreadyExists } = await createAuthUser(
    customer.email,
    customer.idValue
  );

  // מקרה PARTIAL — auth קיים אבל user_profiles חסר
  if (alreadyExists) {
    const { data: listData, error: listErr } = await sb.auth.admin.listUsers();
    if (listErr) {
      return { ...base, status: 'ERROR', reason: `Auth קיים אך שליפת auth_id נכשלה: ${listErr.message}` };
    }
    const existingAuthUser = listData.users.find(
      u => u.email?.toLowerCase() === customer.email.toLowerCase().trim()
    );
    if (!existingAuthUser) {
      return { ...base, status: 'ERROR', reason: 'Auth קיים אך לא נמצא ברשימה — דורש טיפול ידני' };
    }
    const { ok, error: profErr } = await createUserProfile(existingAuthUser.id, customer.id);
    if (!ok) {
      return {
        ...base,
        auth_id: existingAuthUser.id,
        status:  'PARTIAL',
        reason:  `Auth קיים אך user_profiles נכשל: ${profErr}`,
      };
    }
    return {
      ...base,
      auth_id: existingAuthUser.id,
      status:  'SUCCESS',
      reason:  'Auth היה קיים — user_profiles הושלם',
    };
  }

  if (authErr) {
    return { ...base, status: 'ERROR', reason: `יצירת Auth נכשלה: ${authErr}` };
  }

  // ── יצירת user_profiles ──
  const { ok, error: profErr } = await createUserProfile(auth_id, customer.id);

  if (!ok) {
    return {
      ...base,
      auth_id,
      status: 'PARTIAL',
      reason: `Auth נוצר אך user_profiles נכשל: ${profErr}`,
    };
  }

  return { ...base, auth_id, status: 'SUCCESS', reason: null };
}

// ─── 9. saveReport ───────────────────────────────────────────────────────────

function saveReport(results, startedAt) {
  const summary = {
    total:   results.length,
    success: results.filter(r => r.status === 'SUCCESS').length,
    dry_run: results.filter(r => r.status === 'DRY_RUN').length,
    skipped: results.filter(r => r.status === 'SKIPPED').length,
    partial: results.filter(r => r.status === 'PARTIAL').length,
    error:   results.filter(r => r.status === 'ERROR').length,
  };

  const report = { runAt: startedAt, dryRun: DRY_RUN, summary, results };

  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

  const ts       = startedAt.replace(/[:.]/g, '-').slice(0, 16);
  const filename = `migration-family-batch1-${ts}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');

  const partials = results.filter(r => r.status === 'PARTIAL');
  const errors   = results.filter(r => r.status === 'ERROR');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FitBalance — Family Batch 1 Migration');
  if (DRY_RUN) console.log('  ⚠️  מצב DRY RUN — לא בוצעו שינויים');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (DRY_RUN) {
    console.log(`  🔍 DRY RUN:  ${summary.dry_run}`);
  } else {
    console.log(`  ✅ SUCCESS:  ${summary.success}`);
  }
  console.log(`  ⏭️  SKIPPED:  ${summary.skipped}`);
  if (!DRY_RUN) {
    console.log(`  ⚠️  PARTIAL:  ${summary.partial}${summary.partial > 0 ? '  ← דורש טיפול ידני' : ''}`);
  }
  console.log(`  ❌ ERROR:    ${summary.error}`);
  console.log('  ──────────────────────────────────────');
  console.log(`     TOTAL:   ${summary.total}`);

  if (partials.length > 0) {
    console.log('\n  ⚠️  PARTIAL — דורשים טיפול ידני:');
    partials.forEach(r =>
      console.log(`    • customer_id=${r.customer_id} | ${r.name} | auth_id=${r.auth_id} | ${r.reason}`)
    );
  }

  if (errors.length > 0) {
    console.log('\n  ❌ שגיאות:');
    errors.forEach(r =>
      console.log(`    • customer_id=${r.customer_id} | ${r.name} | ${r.email} | ${r.reason}`)
    );
  }

  console.log(`\n  📄 Report: reports/${filename}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ─── 10. runMigration ────────────────────────────────────────────────────────

async function runMigration() {
  const startedAt = new Date().toISOString();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FitBalance — Family Batch 1 Migration');
  console.log(`  מצב: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`);
  console.log(`  IDs מאושרים: ${APPROVED_IDS.join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n  שולף לקוחות...');
  const customers = await fetchApprovedCustomers();
  console.log(`  נמצאו ${customers.length} לקוחות לטיפול\n`);

  if (customers.length === 0) {
    console.log('  אין לקוחות לטיפול. יוצא.\n');
    return;
  }

  // הצג את הרשימה לפני הרצה
  console.log('  לקוחות שיטופלו:');
  customers.forEach(c =>
    console.log(`    • [${c.id}] ${c.firstName} ${c.lastName || ''} — ${c.email}`)
  );
  console.log('');

  const results = [];
  try {
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      process.stdout.write(`  [${i + 1}/${customers.length}] ${c.email} ... `);

      const result = await migrateOne(c);
      results.push(result);

      const icon = { SUCCESS: '✅', SKIPPED: '⏭️', PARTIAL: '⚠️', ERROR: '❌', DRY_RUN: '🔍' };
      console.log(icon[result.status] || result.status);
    }
  } finally {
    if (results.length > 0) saveReport(results, startedAt);
  }
}

// ─── הרצה ────────────────────────────────────────────────────────────────────

runMigration().catch(err => {
  console.error('\n❌  שגיאה לא צפויה:', err.message);
  process.exit(1);
});
