const form        = document.getElementById('register-form');
const errorBox    = document.getElementById('error-msg');
const successBox  = document.getElementById('success-msg');
const submitBtn   = document.getElementById('submit-btn');
const btnText     = document.getElementById('btn-text');
const btnSpinner  = document.getElementById('btn-spinner');
const toggleBtns  = document.querySelectorAll('.toggle-password');

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
  });
});

function showError(msg) {
  errorBox.querySelector('span').textContent = msg;
  errorBox.classList.remove('hidden');
  errorBox.classList.add('shake');
  setTimeout(() => errorBox.classList.remove('shake'), 500);
}

function setLoading(on) {
  submitBtn.disabled = on;
  btnText.textContent = on ? 'רושמת...' : 'הרשמה';
  btnSpinner.classList.toggle('hidden', !on);
}

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

form.addEventListener('input', () => errorBox.classList.add('hidden'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName  = document.getElementById('lastName').value.trim();
  const idNumber  = document.getElementById('idNumber').value.trim();
  const email     = document.getElementById('email').value.trim();
  const phone     = document.getElementById('phone').value.trim();
  const password  = document.getElementById('password').value;
  const confirm   = document.getElementById('confirm').value;

  if (!firstName || !lastName || !idNumber || !email || !phone || !password || !confirm) {
    showError('נא למלא את כל השדות'); return;
  }
  if (!isValidIsraeliId(idNumber)) {
    showError('מספר תעודת זהות לא תקין'); return;
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    showError('כתובת אימייל לא תקינה'); return;
  }
  if (!/^0(5[0-9]|7[2-9])[0-9]{7}$/.test(phone.replace(/[-\s]/g, ''))) {
    showError('מספר נייד לא תקין'); return;
  }
  if (password.length < 6) {
    showError('סיסמה חייבת להכיל לפחות 6 תווים'); return;
  }
  if (password !== confirm) {
    showError('הסיסמאות אינן תואמות'); return;
  }

  setLoading(true);
  try {
    await window.authService.register({ firstName, lastName, idNumber, email, phone, password });
    form.classList.add('hidden');
    successBox.classList.remove('hidden');
  } catch (err) {
    showError(err.message ?? 'שגיאה בהרשמה, נסי שוב');
  } finally {
    setLoading(false);
  }
});
