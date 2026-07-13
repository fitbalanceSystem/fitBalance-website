const form       = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passInput  = document.getElementById('password');
const toggleBtn  = document.getElementById('toggle-password');
const errorBox   = document.getElementById('error-msg');
const submitBtn  = document.getElementById('submit-btn');
const btnText    = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');

let role = 'customer';

document.getElementById('role-customer').addEventListener('click', () => setRole('customer'));
document.getElementById('role-employee').addEventListener('click', () => setRole('employee'));

function setRole(r) {
  role = r;
  const isEmp = r === 'employee';
  document.getElementById('role-customer').classList.toggle('active', !isEmp);
  document.getElementById('role-employee').classList.toggle('active', isEmp);
  document.getElementById('label-email').textContent = isEmp ? 'שם משתמש' : 'כתובת אימייל';
  document.getElementById('icon-email').className    = isEmp ? 'fas fa-user' : 'fas fa-envelope';
  document.getElementById('label-pass').textContent  = isEmp ? 'סיסמה' : 'תעודת זהות';
  document.getElementById('icon-pass').className     = isEmp ? 'fas fa-lock' : 'fas fa-id-card';
  emailInput.placeholder = isEmp ? 'שם משתמש' : 'your@email.com';
  passInput.placeholder  = isEmp ? '••••••••' : 'מספר ת.ז';
  // איפוס
  emailInput.value = '';
  passInput.value  = '';
  passInput.type   = 'password';
  document.getElementById('toggle-password').innerHTML = '<i class="fas fa-eye"></i>';
  errorBox.classList.add('hidden');
  forgotPanel.classList.add('hidden');
  forgotEmail.value = '';
  forgotErr.classList.add('hidden');
  forgotOk.classList.add('hidden');
  forgotSubmit.disabled = false;
  forgotSubmit.textContent = 'שלחי לי הוראות';
}

toggleBtn.addEventListener('click', () => {
  const isText = passInput.type === 'text';
  passInput.type = isText ? 'password' : 'text';
  toggleBtn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
});

function setLoading(on) {
  submitBtn.disabled = on;
  btnText.textContent = on ? 'מתחבר...' : 'כניסה';
  btnSpinner.classList.toggle('hidden', !on);
}

function showError(msg) {
  errorBox.querySelector('span').textContent = msg;
  errorBox.classList.remove('hidden');
  errorBox.classList.add('shake');
  setTimeout(() => errorBox.classList.remove('shake'), 500);
}

[emailInput, passInput].forEach(el => el.addEventListener('input', () => errorBox.classList.add('hidden')));

// forgot password
const forgotBtn    = document.getElementById('forgot-btn');
const forgotPanel  = document.getElementById('forgot-panel');
const forgotEmail  = document.getElementById('forgot-email');
const forgotSubmit = document.getElementById('forgot-submit');
const forgotErr    = document.getElementById('forgot-error');
const forgotOk     = document.getElementById('forgot-success');
const forgotDesc   = document.getElementById('forgot-desc');

forgotBtn.addEventListener('click', () => {
  forgotPanel.classList.toggle('hidden');
  forgotDesc.textContent = role === 'customer'
    ? 'הכניסי את כתובת האימייל שלך ונשלח לך הוראות לאיפוס ת.ז'
    : 'הכניסי את כתובת האימייל שלך ונשלח לך קישור לאיפוס סיסמא';
  forgotEmail.value = emailInput.value;
  forgotErr.classList.add('hidden');
  forgotOk.classList.add('hidden');
});

forgotSubmit.addEventListener('click', async () => {
  const email = forgotEmail.value.trim();
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    forgotErr.textContent = 'נא הכניסי כתובת אימייל תקינה';
    forgotErr.classList.remove('hidden');
    return;
  }
  forgotErr.classList.add('hidden');
  forgotSubmit.disabled = true;
  forgotSubmit.textContent = 'שולחת...';
  try {
    await window.authService.sendResetEmail(email, role);
    forgotOk.innerHTML = `
      הבקשה נקלטה! המנהלת תיצור איתך קשר בהקדם ✅<br/>
      <a href="https://wa.me/972527173841?text=${encodeURIComponent('שלום, שכחתי סיסמא/ת.ז לאתר FitBalance. האימייל שלי: ' + email)}" 
         target="_blank" class="inline-flex items-center gap-1 mt-2 text-green-600 font-semibold underline">
        <i class="fab fa-whatsapp"></i> או שלחי וואצאפ למנהלת
      </a>`;
    forgotOk.classList.remove('hidden');
    forgotSubmit.textContent = 'נשלח ✓';
  } catch (err) {
    forgotErr.textContent = err.message || 'שגיאה בשליחה, נסי שוב';
    forgotErr.classList.remove('hidden');
    forgotSubmit.disabled = false;
    forgotSubmit.textContent = 'שלחי לי הוראות';
  }
});

function isValidIsraeliId(id) {
  const s = String(id).padStart(9, '0');
  if (!/^\d{9}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = +s[i] * (i % 2 === 0 ? 1 : 2);
    sum += n > 9 ? n - 9 : n;
  }
  return sum % 10 === 0;
}

function isValidPhone(phone) {
  return /^0(5[0-9]|7[2-9])[0-9]{7}$/.test(phone.replace(/[-\s]/g, ''));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const field1 = emailInput.value.trim();
  const field2 = passInput.value.trim();
  if (!field1 || !field2) { showError('נא למלא את כל השדות'); return; }

  if (role === 'customer') {
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(field1)) { showError('כתובת אימייל לא תקינה'); return; }
    if (!isValidIsraeliId(field2)) { showError('מספר ת.ז אינו תקין'); return; }
  }

  setLoading(true);
  try {
    if (role === 'customer') {
      const customer = await window.authService.signIn(field1, field2);
      window.storageUtil.save({
        ...customer,
        role: 'customer',
        full_name: `${customer.firstName} ${customer.lastName}`,
      });
      window.location.href = window.ROUTES.CUSTOMER_HOME;
    } else {
      const employee = await window.authService.signInEmployee(field1, field2);
      window.storageUtil.save({
        ...employee,
        role: employee.user_name === 'admin' ? 'admin' : 'employee',
        full_name: employee.full_name ?? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
      });
      window.location.href = employee.user_name === 'admin' ? window.ROUTES.ADMIN_HOME : window.ROUTES.EMPLOYEE_HOME;
    }
  } catch (err) {
    showError(err.message ?? 'שגיאה בהתחברות, נסה שוב');
  } finally {
    setLoading(false);
  }
});
