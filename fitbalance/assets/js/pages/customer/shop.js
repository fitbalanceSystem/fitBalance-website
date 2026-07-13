(async () => {
  const authUser = await window.authMiddleware.requireAuth();
  if (!authUser) return;
  window.renderLayout('shop');

  const user = window.storageUtil.load();
  let cart = {}, products = [];

  const [prods, orders] = await Promise.all([
    window.customerService.getProducts(),
    window.customerService.getOrders(user.id),
  ]);
  products = prods;
  renderCategories(prods);
  renderProducts(prods);
  renderOrders(orders);

  function renderCategories(prods) {
    const cats = ['הכל', ...new Set(prods.map(p => p.category).filter(Boolean))];
    const bar  = document.getElementById('cat-filters');
    bar.innerHTML = cats.map((c, i) => `
      <button class="cat-btn ${i === 0 ? 'active' : ''} whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border-2 border-transparent bg-gray-100 text-gray-700 transition-all"
        data-cat="${c}">${c}</button>`).join('');
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
      <div class="product-card card p-4 flex flex-col">
        <div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl h-32 flex items-center justify-center text-5xl mb-3">${p.emoji ?? '📦'}</div>
        <div class="flex-1">
          <h3 class="font-bold text-gray-800 text-sm mb-1">${p.name}</h3>
          <p class="text-xs text-gray-400 mb-2">${p.description ?? ''}</p>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="font-bold gradient-text">${window.fmt.currency(p.price)}</span>
          <button class="add-btn btn-primary text-xs px-3 py-1.5" data-id="${p.id}">+ הוסף</button>
        </div>
      </div>`).join('')
      : '<p class="text-gray-400 text-sm text-center py-10 col-span-4">אין מוצרים זמינים</p>';
    grid.querySelectorAll('.add-btn').forEach(btn =>
      btn.addEventListener('click', () => addToCart(btn.dataset.id))
    );
  }

  function addToCart(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    cart[id] = cart[id] ? { ...cart[id], qty: cart[id].qty + 1 } : { ...p, qty: 1 };
    updateCartUI();
    window.popup.toast(`${p.name} נוסף לעגלה`);
  }

  function updateCartUI() {
    const items = Object.values(cart);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const countEl = document.getElementById('cart-count');
    countEl.textContent = count;
    countEl.classList.toggle('hidden', count === 0);
    document.getElementById('cart-total').textContent = window.fmt.currency(total);

    document.getElementById('cart-items').innerHTML = items.length
      ? items.map(i => `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span class="text-2xl">${i.emoji ?? '📦'}</span>
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
        updateCartUI();
      })
    );
  }

  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  document.getElementById('cart-btn').addEventListener('click', () => {
    drawer.classList.add('open'); overlay.classList.remove('hidden');
  });
  document.getElementById('close-cart').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  function closeCart() { drawer.classList.remove('open'); overlay.classList.add('hidden'); }

  document.getElementById('checkout-btn').addEventListener('click', async () => {
    const items = Object.values(cart);
    if (!items.length) { window.popup.toast('העגלה ריקה', 'warning'); return; }
    const ok = await window.popup.confirm('לאשר את ההזמנה?');
    if (!ok) return;
    try {
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      await window.customerService.createOrder(user.id, items, total);
      cart = {};
      updateCartUI();
      closeCart();
      window.popup.toast('ההזמנה נשלחה בהצלחה! 🎉');
      renderOrders(await window.customerService.getOrders(user.id));
    } catch {
      window.popup.toast('שגיאה בשליחת ההזמנה', 'error');
    }
  });

  function renderOrders(orders) {
    const list = document.getElementById('orders-list');
    list.innerHTML = orders.length
      ? orders.map(o => `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <i class="fas fa-receipt text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-800 text-sm">${o.order_items?.length ?? 0} פריטים</div>
              <div class="text-xs text-gray-400">${window.fmt.date(o.created_at)}</div>
            </div>
            <div class="text-left">
              <div class="font-bold text-gray-800 text-sm">${window.fmt.currency(o.total)}</div>
              <span class="badge ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} text-xs">
                ${o.status === 'completed' ? 'הושלם' : 'בטיפול'}
              </span>
            </div>
          </div>`).join('')
      : '<p class="text-gray-400 text-sm text-center py-6">אין הזמנות קודמות</p>';
  }
})();
