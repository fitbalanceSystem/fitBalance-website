(async () => {
  let user   = window.storageUtil?.load() || null;
  let userId = user?.id ? String(user.id) : 'guest';

  // אם הגיע מ-login עם עגלה שמורה — העבר עגלת guest ל-userId
  if (user?.id) {
    const guestCart = window.cartService.load('guest');
    if (Object.keys(guestCart).length) {
      const existing = window.cartService.load(userId);
      Object.entries(guestCart).forEach(([k, v]) => {
        existing[k] = existing[k] ? { ...existing[k], qty: existing[k].qty + v.qty } : v;
      });
      window.cartService.save(userId, existing);
      window.cartService.clear('guest');
    }
  }

  // layout: אם יש renderLayout (אזור אישי) — השתמש בו, אחרת public
  if (typeof window.renderLayout === 'function' && user) {
    window.renderLayout('shop');
  } else {
    window.renderPublicShopLayout?.();
  }

  let products    = [];
  let cart        = window.cartService.load(userId);
  let activeCoupon = null;
  const COUPONS = {
    'FIT10':  { type: 'percent', value: 10,  label: '10% הנחה' },
    'FIT20':  { type: 'percent', value: 20,  label: '20% הנחה' },
    'SAVE30': { type: 'fixed',   value: 30,  label: '₪30 הנחה' },
  };

  const [prods, orders] = await Promise.all([
    window.customerService.getProducts(),
    userId !== 'guest' ? window.customerService.getOrders(userId) : Promise.resolve([]),
  ]);
  products = prods;
  renderCategories(prods);
  renderProducts(prods);
  renderOrders(orders);
  updateCartUI();

  function renderCategories(prods) {
    const cats = ['הכל', ...new Set(prods.map(p => p.category).filter(Boolean))];
    const bar  = document.getElementById('cat-filters');
    bar.innerHTML = cats.map((c, i) => `
      <button class="cat-btn ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
    bar.querySelectorAll('.cat-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        renderProducts(cat === 'הכל' ? products : products.filter(p => p.category === cat));
      })
    );
  }

  function renderProducts(prods) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = prods.length ? prods.map(p => `
      <div class="product-card" data-id="${p.id}">
        <div class="p-img">
          ${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy" />`
            : `<span class="p-emoji">${p.emoji ?? '📦'}</span>`}
        </div>
        <div class="p-body">
          <div class="p-name">${p.name}</div>
          <div class="p-desc">${p.description ?? ''}</div>
          <div class="p-footer">
            <span class="p-price">${window.fmt.currency(p.price)}</span>
            <button class="p-add add-btn" data-id="${p.id}" onclick="event.stopPropagation()">הוסף +</button>
          </div>
        </div>
      </div>`).join('')
      : '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0;grid-column:1/-1;">אין מוצרים זמינים</p>';
    grid.querySelectorAll('.add-btn').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); addToCart(btn.dataset.id); })
    );
    grid.querySelectorAll('.product-card').forEach(card =>
      card.addEventListener('click', () => openProductModal(card.dataset.id))
    );
  }

  function openProductModal(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    let qty = 1;
    document.getElementById('pm-media').innerHTML = p.image_url
      ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:220px;object-fit:cover;border-radius:16px;margin-bottom:16px;" />`
      : `<div style="font-size:72px;height:220px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#fdf2f8,#f5f3ff);border-radius:16px;margin-bottom:16px;">${p.emoji ?? '📦'}</div>`;
    document.getElementById('pm-name').textContent     = p.name;
    document.getElementById('pm-category').textContent = p.category ?? '';
    document.getElementById('pm-desc').textContent     = p.description ?? '';
    document.getElementById('pm-price').textContent    = window.fmt.currency(p.price);
    document.getElementById('pm-stock').textContent    = p.stock != null ? `מלאי: ${p.stock}` : '';
    document.getElementById('pm-qty').textContent      = qty;
    const setQty = n => { qty = Math.max(1, n); document.getElementById('pm-qty').textContent = qty; };
    document.getElementById('pm-minus').onclick = () => setQty(qty - 1);
    document.getElementById('pm-plus').onclick  = () => setQty(qty + 1);
    document.getElementById('pm-add-btn').onclick = () => {
      for (let i = 0; i < qty; i++) addToCart(String(p.id));
      document.getElementById('product-modal').classList.remove('open');
    };
    document.getElementById('product-modal').classList.add('open');
  }

  function addToCart(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    const key = String(p.id);
    cart[key] = cart[key] ? { ...cart[key], qty: cart[key].qty + 1 } : { ...p, qty: 1 };
    window.cartService.save(userId, cart);
    updateCartUI();
    window.popup.toast(`${p.name} נוסף לעגלה`);
  }

  function updateCartUI() {
    const items    = Object.values(cart);
    const count    = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const total    = calcTotal(subtotal);
    const discount = subtotal - total;

    const countEl = document.getElementById('cart-count');
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'flex' : 'none';
    document.getElementById('cart-total').textContent = window.fmt.currency(total);

    const discRow = document.getElementById('discount-row');
    if (activeCoupon && discount > 0) {
      discRow.style.display = 'flex';
      document.getElementById('discount-label').textContent  = `הנחה (${activeCoupon.label})`;
      document.getElementById('discount-amount').textContent = `−${window.fmt.currency(discount)}`;
    } else {
      discRow.style.display = 'none';
    }

    document.getElementById('cart-items').innerHTML = items.length
      ? items.map(i => `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;background:#f3f0ff;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
              ${i.image_url
                ? `<img src="${i.image_url}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
                : `<span style="font-size:20px;">${i.emoji ?? '📦'}</span>`}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-800 text-sm truncate">${i.name}</div>
              <div class="text-xs text-gray-400">${window.fmt.currency(i.price)}</div>
            </div>
            <div class="flex items-center gap-1">
              <button class="qty-btn" data-id="${i.id}" data-op="-">−</button>
              <span class="w-6 text-center text-sm font-bold">${i.qty}</span>
              <button class="qty-btn" data-id="${i.id}" data-op="+">+</button>
            </div>
          </div>`).join('')
      : '<p class="text-gray-400 text-sm text-center py-10">העגלה ריקה</p>';

    document.querySelectorAll('.qty-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!cart[id]) return;
        cart[id].qty += btn.dataset.op === '+' ? 1 : -1;
        if (cart[id].qty <= 0) delete cart[id];
        window.cartService.save(userId, cart);
        updateCartUI();
      })
    );
  }

  document.getElementById('coupon-btn').addEventListener('click', () => {
    const code = document.getElementById('coupon-input').value.trim().toUpperCase();
    const msg  = document.getElementById('coupon-msg');
    msg.style.display = 'block';
    if (COUPONS[code]) {
      activeCoupon = { code, ...COUPONS[code] };
      msg.style.color = '#059669';
      msg.textContent = `✅ קופון "${code}" הופעל — ${COUPONS[code].label}`;
    } else {
      activeCoupon = null;
      msg.style.color = '#dc2626';
      msg.textContent = '❌ קוד קופון לא תקין';
    }
    updateCartUI();
  });

  function calcTotal(subtotal) {
    if (!activeCoupon) return subtotal;
    if (activeCoupon.type === 'percent') return subtotal * (1 - activeCoupon.value / 100);
    return Math.max(0, subtotal - activeCoupon.value);
  }

  const drawerEl  = document.getElementById('cart-drawer');
  const overlayEl = document.getElementById('cart-overlay');
  document.getElementById('cart-btn').addEventListener('click', () => {
    drawerEl.classList.add('open'); overlayEl.classList.remove('hidden');
  });
  document.getElementById('close-cart').addEventListener('click', closeCart);
  overlayEl.addEventListener('click', closeCart);
  function closeCart() { drawerEl.classList.remove('open'); overlayEl.classList.add('hidden'); }

  // ---- קופה ----
  document.getElementById('checkout-btn').addEventListener('click', async () => {
    const items = Object.values(cart);
    if (!items.length) { window.popup.toast('העגלה ריקה', 'warning'); return; }

    if (userId !== 'guest') {
      // משתמש מחובר — שלח ישירות
      await submitOrder(userId, items, null);
    } else {
      // אורח — הצג מודאל פרטים
      showGuestCheckoutModal(items);
    }
  });

  function showGuestCheckoutModal(items) {
    const total = calcTotal(items.reduce((s, i) => s + i.price * i.qty, 0));
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,10,40,.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
    modal.innerHTML = `
      <div style="background:white;border-radius:24px;padding:28px;max-width:400px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="font-size:18px;font-weight:800;color:#1f2937;">פרטי ההזמנה</h3>
          <button id="_guest-close" style="background:#f3f0ff;border:none;color:#7c3aed;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <input id="_g-name"    type="text"  placeholder="שם מלא *"   style="${_inputStyle()}" />
          <input id="_g-phone"   type="tel"   placeholder="טלפון *"     style="${_inputStyle()}" />
          <input id="_g-email"   type="email" placeholder="אימייל"      style="${_inputStyle()}" />
          <input id="_g-address" type="text"  placeholder="כתובת"       style="${_inputStyle()}" />
          <textarea id="_g-notes" placeholder="הערות" rows="2" style="${_inputStyle()}resize:vertical;"></textarea>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#9ca3af;text-align:center;">
          יש לך חשבון? <a href="../../login.html" style="color:#ec4899;font-weight:600;">התחברי כאן</a>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid #f3f0ff;">
          <span style="font-size:15px;font-weight:700;color:#1f2937;">סה"כ: ${window.fmt.currency(total)}</span>
          <button id="_guest-submit" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border:none;padding:11px 24px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">שלח הזמנה</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#_guest-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#_guest-submit').addEventListener('click', async () => {
      const name  = modal.querySelector('#_g-name').value.trim();
      const phone = modal.querySelector('#_g-phone').value.trim();
      if (!name || !phone) { window.popup.toast('שם וטלפון הם שדות חובה', 'warning'); return; }
      const guestInfo = {
        name,
        phone,
        email:   modal.querySelector('#_g-email').value.trim(),
        address: modal.querySelector('#_g-address').value.trim(),
        notes:   modal.querySelector('#_g-notes').value.trim(),
      };
      modal.remove();
      await submitOrder(null, items, guestInfo);
    });
  }

  function _inputStyle() {
    return 'width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px 12px;font-size:14px;outline:none;font-family:inherit;';
  }

  async function submitOrder(customerId, items, guestInfo) {
    try {
      const total = calcTotal(items.reduce((s, i) => s + i.price * i.qty, 0));
      await window.customerService.createOrder(customerId, items, total, guestInfo);
      cart = {};
      window.cartService.clear(userId);
      updateCartUI();
      closeCart();
      showConfirmModal();
      if (customerId) renderOrders(await window.customerService.getOrders(customerId));
    } catch {
      window.popup.toast('שגיאה בשליחת ההזמנה', 'error');
    }
  }

  function showConfirmModal() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:rgba(15,10,40,.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
    el.innerHTML = `
      <div style="background:white;border-radius:24px;padding:32px 28px;max-width:360px;width:100%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.25);">
        <div style="font-size:52px;margin-bottom:12px;">🛒</div>
        <h3 style="font-size:20px;font-weight:800;color:#1f2937;margin-bottom:8px;">ההזמנה התקבלה!</h3>
        <p style="color:#6b7280;font-size:14px;margin-bottom:6px;">צוות FitBalance יצור איתך קשר בהקדם</p>
        <p style="color:#9ca3af;font-size:13px;margin-bottom:24px;">לתיאום פרטי המשלוח ואיסוף ההזמנה שלך 😊</p>
        <button onclick="this.closest('div').parentElement.remove()" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:700;cursor:pointer;">תודה!</button>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  }

  function renderOrders(orders) {
    const list = document.getElementById('orders-list');
    list.innerHTML = orders.length
      ? orders.map(o => `
          <div style="flex-shrink:0;background:#f9fafb;border:1px solid #f3f0ff;border-radius:12px;padding:10px 14px;min-width:160px;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">${window.fmt.date(o.created_at)}</div>
            <div style="font-weight:700;font-size:13px;color:#1f2937;">${window.fmt.currency(o.total)}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">${o.order_items?.length ?? 0} פריטים • <span style="color:${o.status==='completed'?'#059669':'#d97706'}">${o.status==='completed'?'הושלם':'בטיפול'}</span></div>
          </div>`).join('')
      : '<p style="font-size:12px;color:#9ca3af;padding:4px 0;">אין הזמנות קודמות</p>';
  }
})();
