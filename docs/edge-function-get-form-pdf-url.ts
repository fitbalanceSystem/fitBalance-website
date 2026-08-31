// Edge Function: get-form-pdf-url
// פרסי ב: Supabase Dashboard → Edge Functions → New Function → get-form-pdf-url
// מאמת שה-PDF שייך ללקוחה המחוברת ומחזיר signed URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('missing authorization')

    // אימות המשתמש המחובר
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
    if (authErr || !user) throw new Error('unauthorized')

    const { pdfPath } = await req.json()
    if (!pdfPath) throw new Error('missing pdfPath')

    // service_role לשליפה ויצירת signed URL
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // וידוא שה-PDF שייך ללקוחה המחוברת (לפי auth.uid → customers.user_id)
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!customer) throw new Error('customer not found')

    const { data: form } = await supabase
      .from('customer_forms')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('pdf_url', pdfPath)
      .maybeSingle()

    if (!form) throw new Error('access denied')

    // יצירת signed URL
    const { data, error } = await supabase.storage
      .from('form-pdfs')
      .createSignedUrl(pdfPath, 3600)
    if (error) throw error

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
