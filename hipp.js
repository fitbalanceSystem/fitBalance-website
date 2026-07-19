let _kidsNote = '';
function openModal(type, groupType) {
  const el = document.getElementById('modal-' + type);
  if (type === 'kids' && groupType) {
    document.getElementById('kidsModalTitle').textContent = 'הרשמה – קבוצת ' + groupType;
    const sel = document.getElementById('k_group');
    if (groupType === 'מתקדמות') { sel.value = 'קבוצה מתקדמת (מיון אישי)'; _kidsNote = 'מתקדמות'; }
    else _kidsNote = '';
  }
  el.classList.remove('hidden');
  el.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeModal(type) {
  const el = document.getElementById('modal-' + type);
  el.classList.add('hidden');
  el.classList.remove('flex');
  document.body.style.overflow = '';
}

['kids','women'].forEach(type => {
  document.getElementById('modal-' + type).addEventListener('click', function(e) {
    if (e.target === this) closeModal(type);
  });
});

function validatePhone(val) {
  return /^0[5][0-9]-?[0-9]{7}$/.test(val.replace(/\s/g,''));
}
function validateEmail(val) {
  return !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}
function setError(id, msg) {
  const el = document.getElementById(id);
  let err = el.parentElement.querySelector('._err');
  if (!err) { err = document.createElement('p'); err.className = '_err'; err.style.cssText = 'color:#ef4444;font-size:11px;margin-top:4px;'; el.parentElement.appendChild(err); }
  err.textContent = msg;
  el.style.borderColor = msg ? '#ef4444' : '';
}

function showSuccess(type) {
  closeModal(type);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:28px;padding:40px 32px;max-width:400px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.2);animation:popIn .35s cubic-bezier(.34,1.56,.64,1) both;">
      <div style="font-size:56px;margin-bottom:16px;">🎀</div>
      <h2 style="font-size:22px;font-weight:900;color:#1f2937;margin-bottom:10px;">נרשמת בהצלחה!</h2>
      <p style="color:#6b7280;font-size:15px;line-height:1.7;margin-bottom:24px;">תודה רבה 💗<br>ניצור איתך קשר בהקדם בע"ה</p>
      <button onclick="document.body.querySelector('div[data-success]').remove()" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border:none;padding:12px 32px;border-radius:999px;font-size:15px;font-weight:700;cursor:pointer;">סגירה</button>
    </div>`;
  overlay.setAttribute('data-success','');
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function submitLead(data, btnEl, formType) {
  btnEl.disabled = true;
  btnEl.textContent = 'שולח...';
  try {
    const { error } = await window._sb.from('inquiries').insert([data]);
    if (error) throw error;
    showSuccess(formType);
  } catch (err) {
    console.error(err);
    alert('אירעה שגיאה, נסי שוב.');
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = btnEl.dataset.label;
  }
}

// Kids form
const formKids = document.getElementById('formKids');
const btnKids = document.getElementById('btnKids');
btnKids.dataset.label = btnKids.textContent;
formKids.addEventListener('submit', async e => {
  e.preventDefault();
  const phone = document.getElementById('k_phone').value;
  const email = document.getElementById('k_email').value;
  let valid = true;
  if (!validatePhone(phone)) { setError('k_phone', 'נייד לא תקין (לדוגמה: 050-1234567)'); valid = false; } else setError('k_phone', '');
  if (!validateEmail(email)) { setError('k_email', 'מייל לא תקין'); valid = false; } else setError('k_email', '');
  if (!valid) return;
  const grade = document.getElementById('k_group').value;
  const kidsGrades  = ['כיתה ג׳','כיתה ד׳','כיתה ה׳','כיתה ו׳'];
  const program_code = kidsGrades.includes(grade) ? 1 : 2;
  await submitLead({
    child_name:   document.getElementById('k_child_name').value,
    last_name:    document.getElementById('k_last_name').value,
    mother_name:  document.getElementById('k_mother_name').value,
    phone, email,
    group_code:   2,
    program_code,
    grade,
    source:       1,
    note:         _kidsNote || null,
  }, btnKids, 'kids');
  formKids.reset();
});

// Women form
const formWomen = document.getElementById('formWomen');
const btnWomen = document.getElementById('btnWomen');
btnWomen.dataset.label = btnWomen.textContent;
formWomen.addEventListener('submit', async e => {
  e.preventDefault();
  const phone = document.getElementById('w_phone').value;
  const email = document.getElementById('w_email').value;
  let valid = true;
  if (!validatePhone(phone)) { setError('w_phone', 'נייד לא תקין (לדוגמה: 050-1234567)'); valid = false; } else setError('w_phone', '');
  if (!validateEmail(email)) { setError('w_email', 'מייל לא תקין'); valid = false; } else setError('w_email', '');
  if (!valid) return;
  await submitLead({
    child_name:   document.getElementById('w_child_name').value,
    last_name:    document.getElementById('w_last_name').value,
    phone, email,
    group_code:   1,
    program_code: 3,
    source:       1,
  }, btnWomen, 'women');
  formWomen.reset();
});

// animation
const style = document.createElement('style');
style.textContent = '@keyframes popIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}';
document.head.appendChild(style);
