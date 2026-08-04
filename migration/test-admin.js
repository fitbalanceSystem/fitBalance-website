'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  }
);

async function test() {
  const AUTH_ID = 'ea4bbfb3-58db-4696-8f76-aa37ea50ab82';
  const PASSWORD = '037097110';
  const url = `${process.env.SUPABASE_URL}/auth/v1/admin/users/${AUTH_ID}`;

  console.log('מנסה fetch ישיר ל:', url);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ password: PASSWORD }),
    });

    const text = await res.text();
    console.log('status:', res.status);
    console.log('response:', text);
  } catch (err) {
    console.error('❌ fetch נכשל:', err.message);
  }
}

test().catch(err => console.error('שגיאה:', err.message));
