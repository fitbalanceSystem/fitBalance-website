// sign.js — לוגיקת דף החתימה הציבורי
// תלויות: window._sb, window.formsService, window.pdfService

(async function () {

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

    // token לא קיים / פג תוקף
    if (!formRecord) {
      // בדוק אם הטופס קיים אבל כבר נחתם (token=null → RLS מחזיר null)
      // ננסה לשלוף לפי token ישירות ללא RLS filter — לא אפשרי מanon
      // לכן: אם token קיים אבל formRecord=null — ייתכן שנחתם
      // מציגים הודעה כללית שמכסה גם פג תוקף וגם נחתם
      showScreen('signed');
      return;
    }

    const fieldsJson = formRecord.digital_forms?.fields_json || [];

    // בנה את מסך הטופס — injected_html כבר מכיל נתונים מוכנים
    $('formTitle').textContent    = formRecord.digital_forms?.name || 'טופס';
    $('formDesc').textContent     = formRecord.digital_forms?.description || '';
    $('formContentBox').innerHTML = formRecord.injected_html || '';

    // בנה שדות מ-fields_json
    $('fieldsWrap').innerHTML = fieldsJson.map(f => {
      const isTextarea = f.type === 'textarea';
      const input = isTextarea
        ? `<textarea id="f_${f.id}" placeholder="${f.label}" rows="3" style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 14px;font-size:14px;font-family:inherit;resize:vertical"></textarea>`
        : `<input type="${f.type || 'text'}" id="f_${f.id}" placeholder="${f.label}" autocomplete="off" />`;
      return `<div class="field-group"><label for="f_${f.id}">${f.label}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}</label>${input}</div>`;
    }).join('');

    // ולידציה בזמן אמת — גם textarea
    $('fieldsWrap').querySelectorAll('input, textarea').forEach(el =>
      el.addEventListener('input', validateForm)
    );

    showScreen('form');
    initCanvas();
  }

  // ── Canvas חתימה ────────────────────────────────────────────────────────
  function initCanvas() {
    const canvas = $('sigCanvas');
    const ctx    = canvas.getContext('2d');
    const wrap   = $('sig-wrap');

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
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
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
    const fieldsJson = formRecord?.digital_forms?.fields_json || [];
    const allFilled  = fieldsJson
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
      const fieldsJson  = formRecord.digital_forms?.fields_json || [];

      // 1. איסוף ערכי שדות
      const fieldValues = {};
      fieldsJson.forEach(f => {
        fieldValues[f.id] = ($(`f_${f.id}`)?.value || '').trim() || null;
      });

      const canvas           = $('sigCanvas');
      const signatureDataUrl = canvas.toDataURL('image/png');

      // 2. timestamp אחד לכל התהליך — עקבי בין PDF ל-DB
      const signedAt    = new Date();
      const signedAtISO = signedAt.toISOString();

      // 3. בניית HTML סופי עם health_notes (לפני יצירת PDF)
      const healthNotes = (fieldValues.health_notes || '').trim();
      let finalHtml = (formRecord.injected_html || '')
        .replace('##HEALTH_NOTES##', healthNotes || '')
        .replace('{{health_notes}}', healthNotes || '');

      // 4. יצירת PDF מהHTML הסופי (כולל health_notes)
      let pdfUrl       = null;
      let signatureUrl = null;

      try {
        pdfBlob = await window.pdfService.generate({
          formName         : formRecord.digital_forms?.name,
          formContent      : finalHtml,
          fieldValues,
          signatureDataUrl,
          activityYear     : formRecord.activity_year,
          signedAt,
        });
      } catch (e) {
        console.warn('PDF generation failed:', e.message);
      }

      // 5. העלאת PDF + חתימה + health_notes דרך Edge Function
      //    health_notes נשמר בצד השרת בלבד — לא דרך anon INSERT ישיר
      //    customer_id נשלף מה-DB על ידי ה-Edge Function לפי ה-token
      if (!pdfBlob) throw new Error('היצירת ה-PDF נכשלה')
      const supabaseUrl = window._sb.supabaseUrl;
      const supabaseKey = window._sb.supabaseKey;
      const pdfBase64   = await _blobToBase64(pdfBlob);
      const efRes = await fetch(
        `${supabaseUrl}/functions/v1/save-form-pdf`,
        {
          method  : 'POST',
          headers : {
            'Content-Type'  : 'application/json',
            'Authorization' : `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            token,
            pdfBase64,
            signatureBase64 : signatureDataUrl,
            healthNotes     : healthNotes || null,
            signedAt        : signedAtISO,
          }),
        }
      );
      const efJson = await efRes.json();
      if (efJson.error) throw new Error('Edge Function: ' + efJson.error);
      if (efJson.pdfPath) pdfUrl       = efJson.pdfPath;
      if (efJson.sigPath) signatureUrl = efJson.sigPath;

      // 6. IP (best-effort — לא חוסם את התהליך)
      let ipAddress = null;
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        const j = await r.json();
        ipAddress = j.ip || null;
      } catch (_) {}

      // 7. עדכון injected_html עם health_notes (snapshot סופי)
      if (healthNotes) {
        const { error: htmlErr } = await window._sb
          .from('customer_forms')
          .update({ injected_html: finalHtml })
          .eq('id', formRecord.id);
        if (htmlErr) console.warn('injected_html update error:', htmlErr.message);
      }

      // 8. חתימה ב-DB — signed_at זהה לזה שנשלח ל-PDF ול-Edge Function
      await window.formsService.signForm(token, {
        fullName     : fieldValues.fullName   || null,
        idNumber     : fieldValues.idNumber   || null,
        signerName   : fieldValues.signerName || null,
        signatureUrl,
        pdfUrl,
        ipAddress,
        signedAt     : signedAtISO,
      });

      // 9. הצגת מסך הצלחה
      //    health_notes כבר נשמר ב-Edge Function — אין צורך בפעולה נוספת כאן
      $('successMsg').textContent = `תודה ${fieldValues.fullName || ''}! הטופס נחתם ונשמר בהצלחה.`;

      if (pdfBlob) {
        const dlBtn = $('downloadPdfBtn');
        dlBtn.style.display = 'inline-flex';
        dlBtn.addEventListener('click', () =>
          window.pdfService.download(pdfBlob, formRecord.digital_forms?.name)
        );
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
