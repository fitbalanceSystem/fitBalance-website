// sign.js — לוגיקת דף החתימה הציבורי
// תלויות: window._sb, window.formsService, window.pdfService

(async function () {

  // ── תוכן הטפסים — נטען מ-window.formTemplates (services/formTemplates.js) ──

  // ── משתנים גלובליים לדף ─────────────────────────────────────────────────
  const token      = new URLSearchParams(location.search).get('token');
  let   formRecord = null;
  let   hasSig     = false;
  let   pdfBlob    = null;

  // ── אלמנטים ─────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const screens = {
    loading : $('loadingScreen'),
    invalid : $('invalidScreen'),
    signed  : $('signedScreen'),
    form    : $('formScreen'),
    success : $('successScreen'),
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.style.display = 'none');
    screens[name].style.display = 'block';
  }

  // ── טעינת הטופס ─────────────────────────────────────────────────────────
  async function init() {
    if (!token) { showScreen('invalid'); return; }

    try {
      formRecord = await window.formsService.getFormByToken(token);
    } catch (e) {
      console.error('getFormByToken error:', e);
      showScreen('invalid');
      return;
    }

    // token לא קיים / פג תוקף / כבר נחתם
    if (!formRecord) {
      // בדוק אם קיים אבל כבר signed (RLS מחזיר null לשניהם — נבדוק ישירות)
      showScreen('invalid');
      return;
    }

    const formKey = formRecord.digital_forms?.form_key;

    // בנה את מסך הטופס
    $('formTitle').textContent = formRecord.digital_forms?.name || 'טופס';
    $('formDesc').textContent  = formRecord.digital_forms?.description || '';
    $('formContentBox').innerHTML = window.formTemplates.toHTML(formKey);

    // בנה שדות
    const fields = (window.formTemplates[formKey]?.fields) || window.formTemplates.health_declaration.fields;
    $('fieldsWrap').innerHTML = fields.map(f => `
      <div class="field-group">
        <label for="f_${f.id}">${f.label}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}</label>
        <input type="${f.type}" id="f_${f.id}" placeholder="${f.label}" autocomplete="off" />
      </div>`).join('');

    // האזנה לשינויים בשדות לצורך ולידציה
    $('fieldsWrap').querySelectorAll('input').forEach(inp =>
      inp.addEventListener('input', validateForm)
    );

    showScreen('form');
    initCanvas();
  }

  // ── Canvas חתימה ────────────────────────────────────────────────────────
  function initCanvas() {
    const canvas = $('sigCanvas');
    const ctx    = canvas.getContext('2d');
    const wrap   = $('sig-wrap');

    // התאמת רזולוציה
    function resizeCanvas() {
      const rect = wrap.getBoundingClientRect();
      canvas.width  = rect.width  * window.devicePixelRatio;
      canvas.height = 160         * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    }
    resizeCanvas();

    let drawing = false;
    let lastX = 0, lastY = 0;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left),
        y: (src.clientY - rect.top),
      };
    }

    function startDraw(e) {
      e.preventDefault();
      drawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
    }

    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;

      if (!hasSig) {
        hasSig = true;
        wrap.classList.add('has-sig');
        $('sig-placeholder').style.display = 'none';
        validateForm();
      }
    }

    function endDraw() { drawing = false; }

    canvas.addEventListener('mousedown',  startDraw);
    canvas.addEventListener('mousemove',  draw);
    canvas.addEventListener('mouseup',    endDraw);
    canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove',  draw,      { passive: false });
    canvas.addEventListener('touchend',   endDraw);

    $('clearSigBtn').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSig = false;
      wrap.classList.remove('has-sig');
      $('sig-placeholder').style.display = 'flex';
      validateForm();
    });
  }

  // ── ולידציה ─────────────────────────────────────────────────────────────
  function validateForm() {
    const formKey = formRecord?.digital_forms?.form_key;
    const fields  = (window.formTemplates[formKey]?.fields) || window.formTemplates.health_declaration.fields;
    const allFilled = fields
      .filter(f => f.required)
      .every(f => ($(`f_${f.id}`)?.value || '').trim() !== '');
    $('submitBtn').disabled = !(allFilled && hasSig);
  }

  // ── שליחה ───────────────────────────────────────────────────────────────
  $('submitBtn').addEventListener('click', async () => {
    const btn = $('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> שומר...';

    try {
      const formKey = formRecord.digital_forms?.form_key;
      const fields  = (window.formTemplates[formKey]?.fields) || window.formTemplates.health_declaration.fields;

      // איסוף ערכי שדות
      const fieldValues = {};
      fields.forEach(f => {
        fieldValues[f.id] = ($(`f_${f.id}`)?.value || '').trim() || null;
      });

      const canvas = $('sigCanvas');
      const signatureDataUrl = canvas.toDataURL('image/png');
      let signatureUrl = null;
      let pdfUrl = null;

      // יצירת PDF
      try {
        pdfBlob = await window.pdfService.generate({
          formName         : formRecord.digital_forms?.name,
          formKey          : formKey,
          formContent      : window.formTemplates.toHTML(formKey),
          fieldValues,
          signatureDataUrl,
          activityYear     : formRecord.activity_year,
          signedAt         : new Date(),
        });
      } catch (e) {
        console.warn('PDF generation failed:', e.message);
      }

      // העלאה דרך Edge Function
      if (pdfBlob) {
        try {
          const supabaseUrl = window._sb.supabaseUrl;
          const supabaseKey = window._sb.supabaseKey;
          const pdfBase64 = await _blobToBase64(pdfBlob);
          const res = await fetch(
            `${supabaseUrl}/functions/v1/save-form-pdf`,
            {
              method  : 'POST',
              headers : {
                'Content-Type'  : 'application/json',
                'Authorization' : `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ token, pdfBase64, signatureBase64: signatureDataUrl }),
            }
          );
          const json = await res.json();
          if (json.pdfPath)  pdfUrl       = json.pdfPath;
          if (json.sigPath)  signatureUrl = json.sigPath;
        } catch (e) {
          console.warn('Edge Function upload failed:', e.message);
        }
      }

      // IP (best-effort)
      let ipAddress = null;
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        const j = await r.json();
        ipAddress = j.ip || null;
      } catch (_) {}

      // חתימה ב-DB
      await window.formsService.signForm(token, {
        fullName     : fieldValues.fullName   || null,
        idNumber     : fieldValues.idNumber   || null,
        signerName   : fieldValues.signerName || null,
        signatureUrl,
        pdfUrl,
        ipAddress,
      });

      // הצגת מסך הצלחה
      $('successMsg').textContent = `תודה ${fieldValues.fullName || ''}! הטופס נחתם ונשמר בהצלחה.`;

      if (pdfBlob) {
        const dlBtn = $('downloadPdfBtn');
        dlBtn.style.display = 'inline-flex';
        dlBtn.addEventListener('click', () => window.pdfService.download(pdfBlob, formRecord.digital_forms?.name));
        $('printBtn').style.display = 'inline-flex';
        $('printBtn').addEventListener('click', () => window.pdfService.print(pdfBlob));
      }

      showScreen('success');

    } catch (err) {
      console.error('submit error:', err);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> אני מאשר/ת ושולח/ת';
      alert('אירעה שגיאה בשמירת הטופס: ' + (err.message || 'נסה שוב'));
    }
  });

  // ── עזר: Blob ל-base64 ──────────────────────────────────────────────────
  function _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ── הפעלה ───────────────────────────────────────────────────────────────
  init();

})();
