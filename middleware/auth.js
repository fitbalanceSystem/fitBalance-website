window.authMiddleware = {
  // בדיקת הרשאה — עובדים: מאומתים דרך Supabase Auth session.
  // לקוחות: מאומתים דרך storageUtil (מנגנון קיים, ללא Supabase Auth).
  // שני המסלולים מחזירים את אובייקט המשתמש מ-storageUtil.
  async requireAuth() {
    const user = window.storageUtil.load();
    if (!user) { window.location.href = window.ROUTES.LOGIN; return null; }

    // עובדים בלבד — ודא שה-Supabase Auth session עדיין פעיל
    if (user.role !== 'customer') {
      const { data: { session } } = await window._sb.auth.getSession();
      if (!session) {
        window.storageUtil.clear();
        window.location.href = window.ROUTES.LOGIN;
        return null;
      }
    }

    return user;
  },

  logout() {
    if (window._sb) window._sb.auth.signOut();
    window.storageUtil.clear();
    window.location.href = window.ROUTES.LOGIN;
  },
};
