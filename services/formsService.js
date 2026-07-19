window.formsService = {

  // שליפת טופס לפי form_key
  async getForm(formKey) {
    const { data, error } = await window._sb
      .from('digital_forms')
      .select('id, name, content')
      .eq('form_key', formKey)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // שמירת חתימה
  async signForm(customerId, formId, fullName) {
    const { error } = await window._sb
      .from('customer_forms')
      .upsert({ customer_id: customerId, form_id: formId, full_name: fullName },
               { onConflict: 'customer_id,form_id' });
    if (error) throw error;
  },

  // בדיקה אם לקוחה חתמה על טופס
  async hasSigned(customerId, formId) {
    const { data } = await window._sb
      .from('customer_forms')
      .select('id')
      .eq('customer_id', customerId)
      .eq('form_id', formId)
      .maybeSingle();
    return !!data;
  },

  // שליפת כל הטפסים שלקוחה חתמה עליהם
  async getCustomerForms(customerId) {
    const { data, error } = await window._sb
      .from('customer_forms')
      .select('signed_at, full_name, digital_forms(name, form_key)')
      .eq('customer_id', customerId)
      .order('signed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // פתיחת מודאל קריאה + אישור
  // onConfirm(formId) — callback אחרי אישור
  async openFormModal(formKey, onConfirm) {
    const form = await this.getForm(formKey);
    if (!form) { alert('הטופס לא נמצא'); return; }

    const overlay = document.createElement('div');
    overlay.id = `form-modal-${formKey}`;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
      <div style="background:white;border-radius:24px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.25);">
        <div style="background:linear-gradient(135deg,#ec4899,#8b5cf6);padding:20px 24px;border-radius:24px 24px 0 0;color:white;display:flex;justify-content:space-between;align-items:center;">
          <h2 style="font-size:18px;font-weight:800;">${form.name}</h2>
          <button onclick="document.getElementById('form-modal-${formKey}').remove()" style="background:rgba(255,255,255,.2);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">✕</button>
        </div>
        <div style="overflow-y:auto;flex:1;padding:24px;font-size:14px;line-height:1.8;color:#374151;" id="form-content-${formKey}">
          ${form.content}
        </div>
        <div style="padding:16px 24px;border-top:1px solid #f3f4f6;background:#fafafa;border-radius:0 0 24px 24px;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:14px;">
            <input type="checkbox" id="form-agree-${formKey}" style="width:18px;height:18px;accent-color:#ec4899;">
            <span style="font-size:14px;font-weight:600;color:#374151;">קראתי ואני מאשרת את ${form.name}</span>
          </label>
          <button id="form-confirm-${formKey}" onclick="window._confirmForm('${formKey}', ${form.id})"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;opacity:.5;" disabled>
            אישור וחתימה ✓
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // הפעלת כפתור רק אחרי סימון צ'קבוקס
    document.getElementById(`form-agree-${formKey}`).addEventListener('change', function() {
      const btn = document.getElementById(`form-confirm-${formKey}`);
      btn.disabled = !this.checked;
      btn.style.opacity = this.checked ? '1' : '.5';
    });

    // שמירת callback
    window._formCallbacks = window._formCallbacks || {};
    window._formCallbacks[formKey] = onConfirm;
  },
};

// handler גלובלי לאישור טופס
window._confirmForm = function(formKey, formId) {
  const overlay = document.getElementById(`form-modal-${formKey}`);
  if (overlay) overlay.remove();
  const cb = window._formCallbacks?.[formKey];
  if (cb) cb(formId);
};
