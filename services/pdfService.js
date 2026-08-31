// pdfService.js — יצירת PDF עם עברית תקינה דרך html2canvas
// הדפדפן מרנדר את ה-HTML (כולל RTL + עברית) ו-html2canvas מצלם אותו
// window.pdfService

window.pdfService = {

  async generate({ formName, formContent, fieldValues, signatureDataUrl, activityYear, signedAt }) {
    await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

    const dateStr = new Date(signedAt || Date.now())
      .toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const yearLabel = activityYear ? `${activityYear}-${activityYear + 1}` : '';

    // בניית HTML שיצולם
    const html = `
      <div style="
        width:794px; padding:40px; box-sizing:border-box;
        font-family:'Heebo',Arial,sans-serif; direction:rtl;
        color:#1f2937; background:white;
      ">
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,#1a1035,#3b1f7a);
          border-radius:12px; padding:20px 24px;
          display:flex; justify-content:space-between; align-items:center;
          margin-bottom:20px;
        ">
          <div>
            <div style="color:#f9a8d4;font-size:22px;font-weight:800">FitBalance</div>
            <div style="color:#c4b5fd;font-size:12px">מרכז כושר ובריאות</div>
          </div>
          <div style="text-align:left">
            <div style="color:white;font-size:15px;font-weight:700">${formName || 'טופס'}</div>
            ${yearLabel ? `<div style="color:#c4b5fd;font-size:12px">${yearLabel}</div>` : ''}
          </div>
        </div>

        <!-- פרטי חותם -->
        <div style="
          background:#f8f7ff; border:1px solid #ede9fe;
          border-radius:10px; padding:16px 20px; margin-bottom:20px;
          display:grid; grid-template-columns:1fr 1fr; gap:8px;
        ">
          <div><span style="color:#6b7280;font-size:12px">שם: </span><strong>${fieldValues.fullName || '—'}</strong></div>
          <div><span style="color:#6b7280;font-size:12px">תאריך: </span><strong>${dateStr}</strong></div>
          ${fieldValues.idNumber   ? `<div><span style="color:#6b7280;font-size:12px">ת.ז: </span><strong>${fieldValues.idNumber}</strong></div>` : ''}
          ${fieldValues.signerName ? `<div><span style="color:#6b7280;font-size:12px">הורה/אפוטרופוס: </span><strong>${fieldValues.signerName}</strong></div>` : ''}
        </div>

        <!-- תוכן הטופס -->
        <div style="margin-bottom:20px">
          <div style="font-weight:700;font-size:13px;color:#374151;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #ede9fe">
            תוכן הטופס
          </div>
          <div style="font-size:13px;line-height:1.9;color:#374151">
            ${formContent}
          </div>
        </div>

        <!-- חתימה -->
        <div style="border-top:1px solid #ede9fe;padding-top:16px">
          <div style="font-weight:700;font-size:13px;color:#374151;margin-bottom:10px">חתימה דיגיטלית</div>
          ${signatureDataUrl ? `
            <img src="${signatureDataUrl}"
              style="height:80px;border:1.5px solid #8b5cf6;border-radius:8px;background:#fafafa;display:block" />
            <div style="font-size:11px;color:#9ca3af;margin-top:6px">${fieldValues.fullName || ''} | ${dateStr}</div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="margin-top:24px;border-top:1px solid #ede9fe;padding-top:10px;text-align:center;font-size:10px;color:#9ca3af">
          FitBalance | מסמך זה נחתם דיגיטלית | ${dateStr}
        </div>
      </div>`;

    // הכנסת ה-HTML ל-DOM זמני (מחוץ למסך)
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1';
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    try {
      const canvas = await window.html2canvas(wrapper.firstElementChild, {
        scale      : 2,
        useCORS    : true,
        logging    : false,
        windowWidth: 874,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW    = 210;
      const pageH    = 297;
      const margin   = 10;
      const imgW     = pageW - margin * 2;
      const imgH     = (canvas.height / canvas.width) * imgW;
      const pageImgH = pageH - margin * 2;
      const totalPages = Math.ceil(imgH / pageImgH);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', margin, margin - i * pageImgH, imgW, imgH);
        // חיתוך — מסתיר את מה שמחוץ לעמוד
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageW, margin, 'F');
        doc.rect(0, pageH - margin, pageW, margin, 'F');
      }

      return doc.output('blob');
    } finally {
      document.body.removeChild(wrapper);
    }
  },

  download(blob, formName) {
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${formName || 'טופס'}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  print(blob) {
    const url    = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow.print();
      setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 3000);
    };
  },

  // למנהל — anon key (דורש RLS מתאים על הbucket)
  getSignedUrl(path) {
    const { data } = window._sb.storage.from('form-pdfs').getPublicUrl(path);
    return data?.publicUrl || null;
  },

  // ללקוחה מחוברת — דרך Edge Function עם service_role
  async getSignedUrlForCustomer(path) {
    const supabaseUrl = window._sb.supabaseUrl;
    const session = (await window._sb.auth.getSession()).data.session;
    if (!session) throw new Error('לא מחובר');
    const res = await fetch(`${supabaseUrl}/functions/v1/get-form-pdf-url`, {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ pdfPath: path }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.signedUrl;
  },
};

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
