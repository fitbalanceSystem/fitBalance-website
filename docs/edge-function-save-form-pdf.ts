// Edge Function: save-form-pdf
// פרסי ב: Supabase Dashboard → Edge Functions → New Function → save-form-pdf
// משתמש ב-service_role כדי לעקוף RLS ב-Storage וב-customer_notes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { token, pdfBase64, signatureBase64, healthNotes, signedAt } = await req.json()
    if (!token || !pdfBase64) throw new Error('missing token or pdf')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. אימות token — שולף customer_id מה-DB, לא מה-client
    const { data: row, error: fetchErr } = await supabase
      .from('customer_forms')
      .select('id, status, customer_id, token_expires')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()
    if (fetchErr) throw fetchErr
    if (!row) throw new Error('token invalid or already used')

    // 2. בדיקת תוקף token (הגנה כפולה — RLS כבר בודק, אבל service_role עוקף RLS)
    if (row.token_expires && new Date(row.token_expires) < new Date()) {
      throw new Error('token expired')
    }

    // 3. שמירת PDF ב-Storage (private bucket)
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    const pdfPath  = `pdfs/${token}.pdf`
    const { error: pdfErr } = await supabase.storage
      .from('form-pdfs')
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (pdfErr) throw pdfErr

    // 4. שמירת חתימה ב-Storage (private bucket)
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

    // 5. עדכון pdf_url + signature_url בטבלה
    const { error: updateErr } = await supabase
      .from('customer_forms')
      .update({ pdf_url: pdfPath, signature_url: sigPath })
      .eq('token', token)
    if (updateErr) throw updateErr

    // 6. שמירת הערת בריאות ב-customer_notes
    //    customer_id נשלף מה-DB בלבד — לא מה-client
    const notes = typeof healthNotes === 'string' ? healthNotes.trim() : ''
    if (notes && row.customer_id) {
      const noteDate = signedAt
        ? new Date(signedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      const { error: noteErr } = await supabase
        .from('customer_notes')
        .insert({
          customer_code : row.customer_id,
          dateNote      : noteDate,
          noteText      : 'הצהרת בריאות: ' + notes,
        })
      // זורק שגיאה כדי שה-client יידע שה-health_notes לא נשמר
      if (noteErr) throw new Error('health note insert failed: ' + noteErr.message)
    }

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
