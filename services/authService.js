window.authService = {
  async signIn(email, password) {
    // שלב 1: התחברות דרך Supabase Auth
    const { data: authData, error: authError } = await window._sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError) throw new Error('אימייל או סיסמה שגויים');

    const authId = authData.user.id;

    // שלב 2: שלוף user_profiles לפי auth_id
    const { data: profile, error: profileError } = await window._sb
      .from('user_profiles')
      .select('role, linked_id')
      .eq('auth_id', authId)
      .maybeSingle();

    if (profileError || !profile) throw new Error('לא נמצא פרופיל משתמש במערכת');
    if (profile.role !== 'customer') throw new Error('משתמש זה אינו לקוחה');

    // שלב 3: שלוף פרטי לקוחה מ-customers לפי linked_id
    const { data: customer, error: custError } = await window._sb
      .from('customers')
      .select('id, firstName, lastName, email, status_code')
      .eq('id', profile.linked_id)
      .maybeSingle();

    if (custError || !customer) throw new Error('לא נמצאו פרטי לקוחה במערכת');

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
    if (role === 'customer') {
      // לקוחות — איפוס דרך Supabase Auth
      const { error: resetError } = await window._sb.auth.resetPasswordForEmail(
        email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/pages/customer/reset-password.html`,
        }
      );
      if (resetError) {
        if (resetError.status === 429) throw new Error('שלחנו כבר בקשה לאחרונה. יש להמתין 60 שניות ולנסות שוב');
        throw new Error('שגיאה בשליחת מייל איפוס, נסי שוב');
      }

      await window._sb.from('password_reset_requests').insert({
        email: email.trim().toLowerCase(), role,
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

    if (resetError) {
      if (resetError.status === 429) throw new Error('שלחנו כבר בקשה לאחרונה. יש להמתין 60 שניות ולנסות שוב');
      throw new Error('שגיאה בשליחת מייל איפוס, נסי שוב');
    }

    await window._sb.from('password_reset_requests').insert({
      email, role,
      requested_at: new Date().toISOString(),
      status: 'pending',
    });

    return true;
  },
};
