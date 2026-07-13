window.authService = {
  async signIn(email, idValue) {
    const { data: customer, error } = await window._sb
      .from('customers')
      .select('id, firstName, lastName, email, status_code, idValue')
      .eq('email', email)
      .eq('idValue', idValue)
      .maybeSingle();

    if (error) throw new Error('שגיאה בהתחברות, נסי שוב');
    if (!customer) throw new Error('אימייל או ת.ז שגויים');

    return customer;
  },

  async signInEmployee(username, password) {
    const { data: instructor, error } = await window._sb
      .from('instructors')
      .select('*')
      .eq('user_name', username)
      .eq('password', password)
      .maybeSingle();

    if (error) throw new Error('שגיאה בהתחברות, נסה שוב');
    if (!instructor) throw new Error('שם משתמש או סיסמא שגויים');

    return instructor;
  },

  signOut() {
    window.storageUtil.clear();
    window.location.href = window.ROUTES.LOGIN;
  },

  async sendResetRequest(value, role) {
    const isCustomer = role === 'customer';
    const field = isCustomer ? 'phone' : 'email';
    const normalized = isCustomer ? value.replace(/[-\s]/g, '') : value;
    const table = isCustomer ? 'customers' : 'instructors';

    const { data, error } = await window._sb
      .from(table)
      .select('id')
      .eq(field, normalized)
      .maybeSingle();

    if (error) throw new Error('שגיאה, נסי שוב');
    if (!data) throw new Error(isCustomer ? 'מספר נייד זה אינו רשום במערכת' : 'כתובת אימייל זו אינה רשומה במערכת');

    await window._sb.from('password_reset_requests').insert({
      [field]: normalized,
      role,
      requested_at: new Date().toISOString(),
      status: 'pending',
    });
    return true;
  },

  async sendResetEmail(email, role) {
    const table = role === 'customer' ? 'customers' : 'instructors';
    const { data, error } = await window._sb
      .from(table)
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (error) throw new Error('שגיאה, נסי שוב');
    if (!data) throw new Error('לא נמצאה כתובת אימייל זו במערכת');

    // שמור בקשת איפוס בטבלה למעקב
    await window._sb.from('password_reset_requests').insert({
      email,
      role,
      requested_at: new Date().toISOString(),
      status: 'pending',
    });

    // אין שליחת אימייל אוטומטית כי המשתמשים אינם ב-Supabase Auth
    // המנהלת תקבל התראה בלוח הניהול ותיצור קשר ידנית
    return true;
  },
};
