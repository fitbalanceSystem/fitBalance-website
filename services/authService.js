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

  async signInEmployee(email, password) {
    // שלב 1: התחברות דרך Supabase Auth
    const { data: authData, error: authError } = await window._sb.auth.signInWithPassword({ email, password });
    if (authError) throw new Error('שם משתמש או סיסמא שגויים');

    const authId = authData.user.id;

    // שלב 2: קריאת role מ-user_profiles
    const { data: profile, error: profileError } = await window._sb
      .from('user_profiles')
      .select('role, linked_id')
      .eq('auth_id', authId)
      .maybeSingle();

    if (profileError || !profile) throw new Error('לא נמצא פרופיל משתמש במערכת');

    // שלב 3: קריאת פרטי המדריך
    const { data: instructor, error: instError } = await window._sb
      .from('instructors')
      .select('id, firstName, lastName, email')
      .eq('id', profile.linked_id)
      .maybeSingle();

    if (instError || !instructor) throw new Error('לא נמצאו פרטי עובד במערכת');

    return {
      ...instructor,
      role: profile.role,
      full_name: `${instructor.firstName ?? ''} ${instructor.lastName ?? ''}`.trim(),
    };
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
    console.log("RESET REDIRECT:", `${window.location.origin}/pages/employee/reset-password.html`);

    if (role === 'customer') {
      // לקוחות אינם ב-Supabase Auth — לוג בלבד, המנהלת מטפלת ידנית
      const { data, error } = await window._sb
        .from('customers')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (error) throw new Error('שגיאה, נסי שוב');
      if (!data) throw new Error('לא נמצאה כתובת אימייל זו במערכת');

      await window._sb.from('password_reset_requests').insert({
        email, role,
        requested_at: new Date().toISOString(),
        status: 'pending',
      });
      return true;
    }

    // עובדים — איפוס דרך Supabase Auth
    // הערה: יש להוסיף את כל הכתובות הבאות ב-Supabase Dashboard:
    // Authentication → URL Configuration → Redirect URLs
    //   http://localhost:5500/pages/employee/reset-password.html  (פיתוח)
    //   http://localhost:3000/pages/employee/reset-password.html  (פיתוח חלופי)
    //   https://fitbalance.co.il/pages/employee/reset-password.html  (production)
    const { error: resetError } = await window._sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/pages/employee/reset-password.html`,
    });

    if (resetError) throw new Error('שגיאה בשליחת מייל איפוס, נסי שוב');

    // לוג לצורך מעקב (הטבלה נשמרת, לא נמחקת)
    await window._sb.from('password_reset_requests').insert({
      email, role,
      requested_at: new Date().toISOString(),
      status: 'sent',
    });

    return true;
  },
};
