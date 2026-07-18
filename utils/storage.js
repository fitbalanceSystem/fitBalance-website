window.storageUtil = {
  save(user) { sessionStorage.setItem('fb_user', JSON.stringify(user)); },
  load() { try { return JSON.parse(sessionStorage.getItem('fb_user')); } catch { return null; } },
  clear() { sessionStorage.removeItem('fb_user'); },
};
