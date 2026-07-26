// migrate-customers.js
// הרצה: node migrate-customers.js
// דרישות: npm install @supabase/supabase-js dotenv ws

'use strict';

require('dotenv').config();

// Node.js 20 אינו כולל WebSocket נייטיב — יש להזריק לפני טעינת supabase-js
const WebSocket = require('ws');
global.WebSocket = WebSocket;

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

// ─── 1. בדיקת משתני סביבה ───────────────────────────────────────────────────

const SUPABASE_URL            = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN                 = process.env.DRY_RUN !== 'false'; // ברירת מחדל: true

const MISSING = [];
if (!SUPABASE_URL)             MISSING.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) MISSING.push('SUPABASE_SERVICE_ROLE_KEY');

if (MISSING.length > 0) {
  console.error('\n❌  חסרים משתני סביבה נדרשים ב-.env:');
  MISSING.forEach(k => console.error(`    • ${k}`));
  console.error('\nהסקריפט עצר. עדכן את קובץ migration/.env והרץ שוב.\n');
  process.exit(1);
}

// ── אבחון משתני סביבה (ללא חשיפת מפתחות) ──
console.log('\n🔍 בדיקת משתני סביבה:');
console.log(`  SUPABASE_URL:             ${SUPABASE_URL ? SUPABASE_URL : '❌ חסר'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ קיים' : '❌ חסר'}`);
console.log(`  DRY_RUN:                  ${DRY_RUN}`);

// ─── 2. Supabase Admin Client ────────────────────────────────────────────────

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
});

// ─── 3. fetchEligibleCustomers ───────────────────────────────────────────────
// שולפת לקוחות שעומדות בכל התנאים:
//   • email תקין (LIKE '%@%.%')
//   • idValue קיים ולא ריק
//   • אין כפילות email (LOWER/TRIM)
//   • לא עברו מיגרציה כבר (לא קיימות ב-user_profiles)

async function fetchEligibleCustomers() {
  // שלב א: שלוף את כל הלקוחות עם email + idValue
  const { data: candidates, error } = await sb
    .from('customers')
    .select('id, firstName, lastName, email, idValue')
    .not('email',   'is', null)
    .not('idValue', 'is', null)
    .neq('email',   '')
    .neq('idValue', '');

  if (error) throw new Error(`שגיאה בשליפת לקוחות: ${error.message}`);

  // שלב ב: סנן email לא תקין (חייב להכיל @ ונקודה אחריו)
  const validEmail = candidates.filter(c =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())
  );

  // שלב ג: זהה כפילויות email (LOWER + TRIM)
  const emailCount = {};
  validEmail.forEach(c => {
    const key = c.email.toLowerCase().trim();
    emailCount[key] = (emailCount[key] || 0) + 1;
  });
  const noDuplicates = validEmail.filter(c =>
    emailCount[c.email.toLowerCase().trim()] === 1
  );

  // שלב ד: הוצא לקוחות שכבר עברו מיגרציה
  const { data: existingProfiles, error: profErr } = await sb
    .from('user_profiles')
    .select('linked_id')
    .eq('linked_table', 'customers');

  if (profErr) throw new Error(`שגיאה בשליפת user_profiles: ${profErr.message}`);

  const migratedIds = new Set((existingProfiles || []).map(p => p.linked_id));
  const eligible    = noDuplicates.filter(c => !migratedIds.has(c.id));

  return eligible;
}

// ─── 4. checkAlreadyMigrated ─────────────────────────────────────────────────
// שכבת הגנה שנייה — בדיקה ברמת הלקוחה הבודדת לפני כל פעולה

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

// ─── 5. createAuthUser ───────────────────────────────────────────────────────

async function createAuthUser(email, idValue) {
  const password = String(idValue).trim();

  // בדיקת אורך סיסמה — Supabase דורש מינימום 6 תווים
  if (password.length < 6) {
    return {
      auth_id: null,
      error:   `idValue קצר מדי (${password.length} תווים) — נדרש מינימום 6`,
    };
  }

  const { data, error } = await sb.auth.admin.createUser({
    email:            email.toLowerCase().trim(),
    password,
    email_confirm:    true, // ללא צורך באימות מייל
  });

  if (error) {
    // משתמש קיים — לא שגיאה, אלא SKIPPED
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

// ─── 6. createUserProfile ────────────────────────────────────────────────────

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

// ─── 7. migrateOne ───────────────────────────────────────────────────────────

async function migrateOne(customer) {
  const base = {
    customer_id: customer.id,
    email:       customer.email,
    auth_id:     null,
    timestamp:   new Date().toISOString(),
  };

  // שכבת הגנה שנייה
  const alreadyDone = await checkAlreadyMigrated(customer.id);
  if (alreadyDone) {
    return { ...base, status: 'SKIPPED', reason: 'user_profiles כבר קיים עבור לקוחה זו' };
  }

  // ── DRY RUN ──
  if (DRY_RUN) {
    const password = String(customer.idValue).trim();
    if (password.length < 6) {
      return {
        ...base,
        status: 'ERROR',
        reason: `[DRY RUN] idValue קצר מדי (${password.length} תווים) — נדרש מינימום 6`,
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

  if (alreadyExists) {
    // מקרה PARTIAL מהרצה קודמת — auth קיים אבל user_profiles חסר.
    // שולפים את ה-auth_id הקיים ומשלימים את יצירת user_profiles.
    const { data: listData, error: listErr } = await sb.auth.admin.listUsers();
    if (listErr) {
      return { ...base, status: 'ERROR', reason: `Auth קיים אך שליפת auth_id נכשלה: ${listErr.message}` };
    }
    const existingAuthUser = listData.users.find(
      u => u.email?.toLowerCase() === customer.email.toLowerCase().trim()
    );
    if (!existingAuthUser) {
      return { ...base, status: 'ERROR', reason: 'Auth קיים לפי Supabase אך לא נמצא ברשימה — דורש טיפול ידני' };
    }
    const { ok, error: profErr } = await createUserProfile(existingAuthUser.id, customer.id);
    if (!ok) {
      return {
        ...base,
        auth_id: existingAuthUser.id,
        status:  'PARTIAL',
        reason:  `Auth קיים אך user_profiles נכשל שוב: ${profErr}`,
      };
    }
    return {
      ...base,
      auth_id: existingAuthUser.id,
      status:  'SUCCESS',
      reason:  'Auth היה קיים — user_profiles הושלם בהרצה זו',
    };
  }

  if (authErr) {
    return { ...base, status: 'ERROR', reason: `יצירת Auth נכשלה: ${authErr}` };
  }

  // ── יצירת user_profiles ──
  const { ok, error: profErr } = await createUserProfile(auth_id, customer.id);

  if (!ok) {
    // PARTIAL — auth נוצר אבל profile נכשל
    return {
      ...base,
      auth_id,
      status: 'PARTIAL',
      reason: `Auth נוצר אך user_profiles נכשל: ${profErr}`,
    };
  }

  return { ...base, auth_id, status: 'SUCCESS', reason: null };
}

// ─── 8. saveReport ───────────────────────────────────────────────────────────

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
  const filename = `migration-${ts}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');

  // ── הדפסת סיכום ──
  const partials = results.filter(r => r.status === 'PARTIAL');
  const errors   = results.filter(r => r.status === 'ERROR');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FitBalance — Customer Migration');
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
      console.log(`    • customer_id=${r.customer_id} | auth_id=${r.auth_id} | ${r.reason}`)
    );
  }

  if (errors.length > 0) {
    console.log('\n  ❌ שגיאות:');
    errors.forEach(r =>
      console.log(`    • customer_id=${r.customer_id} | ${r.email} | ${r.reason}`)
    );
  }

  console.log(`\n  📄 Report: reports/${filename}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ─── 9. runMigration — לולאה ראשית ──────────────────────────────────────────

async function runMigration() {
  const startedAt = new Date().toISOString();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FitBalance — Customer Migration');
  console.log(`  מצב: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n  שולף לקוחות מוכנות למיגרציה...');
  const customers = await fetchEligibleCustomers();
  console.log(`  נמצאו ${customers.length} לקוחות מוכנות\n`);

  if (customers.length === 0) {
    console.log('  אין לקוחות למיגרציה. יוצא.\n');
    return;
  }

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
    // נשמר תמיד — גם במקרה של exception באמצע הלולאה
    if (results.length > 0) saveReport(results, startedAt);
  }
}

// ─── הרצה ───────────────────────────────────────────────────────────────────

runMigration().catch(err => {
  console.error('\n❌  שגיאה לא צפויה:', err.message);
  process.exit(1);
});
