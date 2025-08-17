import { selectFromTable } from '../utilities/dbservice.js';

// התחברות
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value.trim()
  const errorMessage = document.getElementById('error-message')
  errorMessage.textContent = ''

  if (!email || !password) {
    errorMessage.textContent = 'יש למלא את כל השדות'
    return
  }

  const idValue = password;
  try {
    const users = await selectFromTable('customers', { email, idValue })

    if (users.length === 0) {
      errorMessage.textContent = 'אימייל או סיסמה שגויים'
      return
    }

    const user = users[0]

    localStorage.setItem('user', JSON.stringify({
        id: user.id,
        idValue: user.idValue,
        full_name: user.firstName + ' ' + user.lastName,
        email: user.email
      }));

    // הפניה לעמוד הראשי לאחר התחברות מוצלחת
    window.location.href = 'dashboard.html'

  } catch (error) {
    console.error(error)
    errorMessage.textContent = 'אירעה שגיאה בעת התחברות'
  }
})
  
