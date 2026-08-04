'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ חסרים משתני סביבה ב-.env');
  process.exit(1);
}

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      transport: WebSocket
    }
  }
);


// 12 לקוחות לעדכון
const CUSTOMER_IDS = [
  4,    // מורן אביעד
  7,    // נעמי בן משה
  10,   // לילך גמליאל
  22,   // מירי מיליס
  23,   // אדווה מקייטן
  30,   // שלי עטרי
  52,   // אילה נגר
  60,   // נטע עטרי
  117,  // הודיה הררי
  123,  // אודליה חדד
  145,  // שירן ישראל
  279   // אורנית חדד
];


async function run() {

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' FitBalance — Reset Selected Passwords ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');


  // שליפת לקוחות
  const { data: customers, error: custErr } = await sb
    .from('customers')
    .select('id, firstName, lastName, email, idValue')
    .in('id', CUSTOMER_IDS);


  if (custErr) {
    console.error('❌ שגיאה בשליפת customers:', custErr.message);
    process.exit(1);
  }


  // שליפת חיבור Auth
  const { data: profiles, error: profErr } = await sb
    .from('user_profiles')
    .select('auth_id, linked_id')
    .eq('linked_table', 'customers')
    .in('linked_id', CUSTOMER_IDS);


  if (profErr) {
    console.error('❌ שגיאה בשליפת user_profiles:', profErr.message);
    process.exit(1);
  }


  let success = 0;
  let failed = 0;


  for (const customer of customers) {

    const profile = profiles.find(
      p => p.linked_id === customer.id
    );


    if (!profile) {
      console.log(
        `❌ אין user_profile עבור ${customer.firstName} ${customer.lastName}`
      );
      failed++;
      continue;
    }


    const password = String(customer.idValue).trim();


    console.log(
      `🔄 מעדכן ${customer.firstName} ${customer.lastName} | ${customer.email} | password length=${password.length}`
    );


    const { error: updateErr } =
      await sb.auth.admin.updateUserById(
        profile.auth_id,
        {
          password: password
        }
      );


    if (updateErr) {

      console.log(
        `❌ נכשל ${customer.email}:`,
        updateErr.message
      );

      failed++;

    } else {

      console.log(
        `✅ הצליח ${customer.email}`
      );

      success++;

    }
  }


  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ SUCCESS: ${success}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

}


run().catch(err => {
  console.error('❌ שגיאה כללית:', err);
  process.exit(1);
});