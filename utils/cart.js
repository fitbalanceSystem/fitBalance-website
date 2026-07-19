window.cartService = {
  _key(userId) { return `fb_cart_${userId}`; },

  load(userId) {
    try { return JSON.parse(localStorage.getItem(this._key(userId))) ?? {}; }
    catch { return {}; }
  },

  save(userId, cart) {
    localStorage.setItem(this._key(userId), JSON.stringify(cart));
    this._notify(cart);
  },

  clear(userId) {
    localStorage.removeItem(this._key(userId));
    this._notify({});
  },

  count(userId) {
    const cart = this.load(userId);
    return Object.values(cart).reduce((s, i) => s + i.qty, 0);
  },

  // מעדכן badge בכל דף
  _notify(cart) {
    const count = Object.values(cart).reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('._cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  init(userId) {
    this._notify(this.load(userId));
  },
};
