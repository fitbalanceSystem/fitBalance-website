window.authMiddleware = {
  requireAuth() {
    const user = window.storageUtil.load();
    if (!user) { window.location.href = window.ROUTES.LOGIN; return null; }
    return user;
  },

  logout() {
    window.storageUtil.clear();
    window.location.href = window.ROUTES.LOGIN;
  },
};
