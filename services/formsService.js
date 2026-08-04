window.formsService = {

  // שליפת כל הטפסים הפעילים
  async getActiveForms() {
    const { data, error } = await window._sb
      .from('digital_forms')
      .select('id, name, form_key, description')
      .eq('is_active', true)
      .order('id');
    if (error) throw error;
    return data || [];
  },

  // שליפת בקשת חתימה לפי token (ציבורי — ללא login)
  // RLS מאפשר קריאה רק לשורות status=pending ו-token_expires > now()
  async getFormByToken(token) {
    const { data, error } = await window._sb
      .from('customer_forms')
      .select(`
        id,
        status,
        token_expires,
        activity_year,
        full_name,
        digital_forms (
          id,
          name,
          form_key,
          description
        )
      `)
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // יצירת בקשת חתימה חדשה (מנהל בלבד — authenticated)
  async createFormRequest(customerId, formId, activityYear) {
    const token        = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await window._sb
      .from('customer_forms')
      .insert({
        customer_id   : customerId,
        form_id       : formId,
        token         : token,
        token_expires : tokenExpires,
        status        : 'pending',
        activity_year : activityYear,
        sent_at       : new Date().toISOString(),
      })
      .select('id, token')
      .single();
    if (error) throw error;
    return data; // { id, token } — ה-token ישמש לבניית URL לשליחה במייל
  },

  // עדכון חתימה — מבטל token אחרי חתימה (ציבורי — מוגן ע"י RLS)
  async signForm(token, signData) {
    const { error } = await window._sb
      .from('customer_forms')
      .update({
        status        : 'signed',
        signed_at     : new Date().toISOString(),
        full_name     : signData.fullName     || null,
        id_number     : signData.idNumber     || null,
        signer_name   : signData.signerName   || null,
        signature_url : signData.signatureUrl || null,
        pdf_url       : signData.pdfUrl       || null,
        ip_address    : signData.ipAddress    || null,
        token         : null,
        token_expires : null,
      })
      .eq('token', token)
      .eq('status', 'pending');
    if (error) throw error;
  },

  // שליפת כל הטפסים של לקוח (מנהל — authenticated)
  async getCustomerForms(customerId) {
    const { data, error } = await window._sb
      .from('customer_forms')
      .select(`
        id,
        status,
        activity_year,
        sent_at,
        signed_at,
        full_name,
        pdf_url,
        token,
        token_expires,
        digital_forms ( name, form_key )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // עדכון pdf_url לאחר יצירת PDF (ציבורי — מוגן ע"י token)
  async updatePdfUrl(token, pdfUrl) {
    const { error } = await window._sb
      .from('customer_forms')
      .update({ pdf_url: pdfUrl })
      .eq('token', token);
    if (error) throw error;
  },

};
