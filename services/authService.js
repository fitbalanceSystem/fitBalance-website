window.authService = {
  async signIn(emailOrPrefix, idValue) {
    // תמיכה בתחילית מייל (לפני @)
    const emailInput = emailOrPrefix.trim().toLowerCase();
    const isPrefix   = !emailInput.includes('@');

    const normalizedId = String(idValue).replace(/^0+/, '') || '0';

    // שלב 1: שלוף לפי מייל מלא או תחילית
    let query = window._sb.from('customers')
      .select('id, firstName, lastName, email, status_code, idValue');

    if (isPrefix) {
      query = query.ilike('email', `${emailInput}@%`);
    } else {
      query = query.ilike('email', emailInput);
    }

    const { data: byEmailArr, error: e1 } = await query;
    if (e1) throw new Error('שגיאה בהתחברות, נסי שוב');

    // אם יש יותר מתוצאה אחת לתחילית — בדוק לפי ת.ז
    let customer = null;
    if (byEmailArr && byEmailArr.length === 1) {
      customer = byEmailArr[0];
    } else if (byEmailArr && byEmailArr.length > 1) {
      customer = byEmailArr.find(c =>
        c.idValue && String(c.idValue).replace(/^0+/, '') === normalizedId
      );
      if (!customer) throw new Error('נמצאו מספר חשבונות — נסי עם מייל מלא');
    }

    if (!customer) throw new Error('אימייל או ת.ז שגויים');

    // שלב 2: ודא ת.ז
    const customerNormalizedId = customer.idValue
      ? String(customer.idValue).replace(/^0+/, '')
      : null;

    if (!customerNormalizedId || customerNormalizedId !== normalizedId)
      throw new Error('ת.ז שגויה');

    if (!customer.email)
      throw new Error('הפרטים שלך אינם מעודכנים במערכת. צרי קשר עם המנהלת לעדכון פרטייך');

    return customer;
  },

  async signInEmployee(username, password) {
    const { data: instructor, error } = await window._sb
      .from('instructors')
      .select('*')
      .eq('user_name', username)
      .eq('password', password)
      .maybeSingle();
      console.log("instructor");
console.log(instructor);
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
