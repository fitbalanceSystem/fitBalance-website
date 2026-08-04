// Edge Function: save-form-pdf
// פרסי ב: Supabase Dashboard → Edge Functions → New Function → save-form-pdf
// משתמש ב-service_role כדי לעקוף RLS ב-Storage

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { token, pdfBase64, signatureBase64 } = await req.json()
    if (!token || !pdfBase64) throw new Error('missing token or pdf')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // וידוא שה-token קיים ו-pending
    const { data: row, error: fetchErr } = await supabase
      .from('customer_forms')
      .select('id, status')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()
    if (fetchErr) throw fetchErr
    if (!row) throw new Error('token invalid or already used')

    // שמירת PDF ב-Storage (private bucket)
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    const pdfPath  = `pdfs/${token}.pdf`
    const { error: pdfErr } = await supabase.storage
      .from('form-pdfs')
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (pdfErr) throw pdfErr

    // שמירת חתימה ב-Storage (private bucket)
    let sigPath = null
    if (signatureBase64) {
      const b64      = signatureBase64.replace(/^data:image\/png;base64,/, '')
      const sigBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      sigPath        = `signatures/${token}.png`
      const { error: sigErr } = await supabase.storage
        .from('form-signatures')
        .upload(sigPath, sigBytes, { contentType: 'image/png', upsert: true })
      if (sigErr) console.warn('sig upload warn:', sigErr.message)
    }

    // עדכון pdf_url + signature_url בטבלה (token נמחק ב-signForm מה-client)
    const { error: updateErr } = await supabase
      .from('customer_forms')
      .update({ pdf_url: pdfPath, signature_url: sigPath })
      .eq('token', token)
    if (updateErr) throw updateErr

    return new Response(JSON.stringify({ pdfPath, sigPath }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
