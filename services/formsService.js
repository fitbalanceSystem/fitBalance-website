window.formsService = {

  // שליפת כל הטפסים הפעילים
  async getActiveForms() {
    const { data, error } = await window._sb
      .from('digital_forms')
      .select('id, name, form_key, description, content_html, fields_json')
      .eq('is_active', true)
      .order('id');
    if (error) throw error;
    return data || [];
  },

  // שליפת טופס בודד לפי form_key (כולל תוכן)
  async getFormByKey(formKey) {
    const { data, error } = await window._sb
      .from('digital_forms')
      .select('id, name, form_key, description, content_html, fields_json')
      .eq('form_key', formKey)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // השתלת פרמטרים דינמיים בתוכן הטופס
  injectParams(html, params = {}) {
    if (!html) return '';
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replaceAll('{{' + k + '}}', v ?? ''),
      html
    );
  },

  // בניית אובייקט פרמטרים מנתוני לקוחה + תוכניות
  async _buildParams(customerId, activityYear) {
    const sb = window._sb || window.supabase;
    const year = activityYear || (new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1);

    const { data: cust, error: custError } = await sb
      .from('customers')
      .select('firstName,lastName,birthDate,city,street,mobile,email,idValue')
      .eq('id', Number(customerId))
      .maybeSingle();
    console.log('[formsService] cust error:', custError?.message, 'cust:', JSON.stringify(cust));

    const { data: enrollments, error: enError } = await sb
      .from('program_enrollments')
      .select('programs!fk_enrollments_program(name,day,time,branch_code,price)')
      .eq('customer_id', Number(customerId))
      .gte('start_date', `${year}-09-01`)
      .lte('start_date', `${year + 1}-08-31`);
    console.log('[formsService] filter:', `${year}-09-01`, 'to', `${year + 1}-08-31`);
    console.log('[formsService] enrollments error:', enError?.message, 'raw:', JSON.stringify(enrollments));

    const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    const classes = (enrollments || []).map(e => ({
      ...e.programs,
      price: e.programs?.price ?? 0,
    })).filter(c => c?.name);
    const today = new Date().toLocaleDateString('he-IL');
    const DEFAULT_PRICE = 110;
    const monthlyTotal = classes.reduce((s, c) => s + (c?.price || DEFAULT_PRICE), 0);

    const classParams = {};
    [1,2,3,4].forEach(i => {
      const c = classes[i-1];
      const dayNum = parseInt(c?.day);
      const dayName = c && !isNaN(dayNum) ? DAY_NAMES[dayNum-1] : (c?.day || '');
      classParams[`class_${i}_name`]   = c?.name   || '';
      classParams[`class_${i}_day`]    = dayName;
      classParams[`class_${i}_time`]   = c?.time   ? c.time.slice(0,5) : '';
      classParams[`class_${i}_branch`] = c?.branch_code || '';
      classParams[`class_${i}_price`]  = c?.price != null ? String(c.price) : '';
    });

    // רשימת חוגים בפורמט נקי
    const classes_list = classes.map(c => {
      const dayNum = parseInt(c?.day);
      const day = !isNaN(dayNum) ? DAY_NAMES[dayNum-1] : (c?.day || '');
      const time = c?.time ? c.time.slice(0,5) : '';
      return `• ${c?.name} — יום ${day} ${time}`;
    }).join('<br>');

    // טבלת חוגים בפורמט HTML
    const classes_table = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:right;padding:4px 8px;border-bottom:1px solid #e5e7eb">חוג</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid #e5e7eb">יום</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid #e5e7eb">שעה</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid #e5e7eb">סניף</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid #e5e7eb">עלות</th></tr></thead><tbody>' +
      classes.map(c => {
        const dayNum = parseInt(c?.day);
        const day = !isNaN(dayNum) ? DAY_NAMES[dayNum-1] : (c?.day || '');
        const time = c?.time ? c.time.slice(0,5) : '';
        return `<tr><td style="padding:4px 8px">${c?.name||''}</td><td style="padding:4px 8px">${day}</td><td style="padding:4px 8px">${time}</td><td style="padding:4px 8px">${c?.branch_code||''}</td><td style="padding:4px 8px">${c?.price||''} ₪</td></tr>`;
      }).join('') + '</tbody></table>';

    return {
      firstName        : cust?.firstName   || '',
      lastName         : cust?.lastName    || '',
      birthDate        : cust?.birthDate   || '',
      city             : cust?.city        || '',
      street           : cust?.street      || '',
      mobile           : cust?.mobile      || '',
      email            : cust?.email       || '',
      activityYear     : `${year}-${year + 1}`,
      registration_date: today,
      customer_name    : `${cust?.firstName || ''} ${cust?.lastName || ''}`.trim(),
      customer_id      : cust?.idValue     || '',
      customer_phone   : cust?.mobile      || '',
      customer_email   : cust?.email       || '',
      customer_address : [cust?.street, cust?.city].filter(Boolean).join(', '),
      classes_count    : String(classes.length),
      monthly_total    : String(monthlyTotal),
      insured_classes  : classes.map(c => c?.name).filter(Boolean).join(', '),
      classes_list,
      classes_table,
      ...classParams,
    };
  },

  // שליפת בקשת חתימה לפי token (ציבורי — ללא login)
  async getFormByToken(token) {
    const { data, error } = await window._sb
      .from('customer_forms')
      .select(`
        id,
        status,
        token_expires,
        activity_year,
        full_name,
        customer_id,
        injected_html,
        digital_forms (
          id,
          name,
          form_key,
          description,
          fields_json
        )
      `)
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  // יצירת בקשת חתימה חדשה — משתיל פרמטרים ושומר injected_html
  async createFormRequest(customerId, formId, activityYear) {
    const sb = window._sb || window.supabase;
    const token        = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // שליפת תוכן הטופס
    const { data: form } = await sb
      .from('digital_forms')
      .select('content_html')
      .eq('id', formId)
      .maybeSingle();

    // בניית פרמטרים והשתלה
    const params = await this._buildParams(customerId, activityYear);
    const injected_html = this.injectParams(form?.content_html || '', params)
      .replace('{{health_notes}}', '##HEALTH_NOTES##');

    const { data, error } = await sb
      .from('customer_forms')
      .insert({
        customer_id   : customerId,
        form_id       : formId,
        token         : token,
        token_expires : tokenExpires,
        status        : 'pending',
        activity_year : activityYear,
        sent_at       : new Date().toISOString(),
        signed_at     : null,
        injected_html,
      })
      .select('id, token')
      .single();
    if (error) throw error;
    return data;
  },

  // עדכון חתימה — מבטל token אחרי חתימה (ציבורי — מוגן ע"י RLS)
  // signData.signedAt — timestamp שנוצר ב-sign.js לפני יצירת ה-PDF
  // כך ש-PDF ו-DB משתמשים באותו timestamp
  async signForm(token, signData) {
    const { error } = await window._sb
      .from('customer_forms')
      .update({
        status        : 'signed',
        signed_at     : signData.signedAt || new Date().toISOString(),
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

  // שליפת תבנית מייל לפי מפתח
  async getEmailTemplate(key) {
    const { data, error } = await window._sb
      .from('email_templates')
      .select('subject, body_html')
      .eq('template_key', key)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

};
