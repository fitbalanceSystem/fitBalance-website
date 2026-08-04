(async () => {
  let user   = window.storageUtil?.load() || null;
  let userId = user?.id ? String(user.id) : 'guest';

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

  if (typeof window.renderLayout === 'function' && user) {
    window.renderLayout('shop');
  } else {
    window.renderPublicShopLayout?.();
  }

  let products     = [];
  let filteredProds = [];
  let shopCats = { tree: [], flat: [] };
  let activeCatPath = [];
  let selectedLeaf  = null;
  let cart         = window.cartService.load(userId);
  let activeCoupon = null;
  let activeCategory    = 'הכל';
  let activeSubcategory = 'הכל';
  let activeSort   = 'default';
  let searchQuery  = '';
  let favorites    = new Set();
  let dbCoupons    = {};

  const COUPONS = {}; // replaced by dbCoupons

  const today = new Date().toISOString().split('T')[0];
  const [prods, orders, catsRows, couponsRows, promosRows, favsRows] = await Promise.all([
    window.customerService.getProducts(),
    userId !== 'guest' ? window.customerService.getOrders(userId) : Promise.resolve([]),
    window._sb.from('shop_categories').select('*').eq('is_visible', true).order('sort_order').then(r => r.data || []).catch(() => []),
    window._sb.from('coupons').select('*').eq('is_active', true).then(r => r.data || []).catch(() => []),
    window._sb.from('promotions').select('*').eq('is_active', true).then(r => r.data || []).catch(() => []),
    userId !== 'guest' ? window._sb.from('favorites').select('product_id').eq('customer_id', userId).then(r => r.data || []).catch(() => []) : Promise.resolve([]),
  ]);
  products = prods;
  dbCoupons = Object.fromEntries(couponsRows.map(c => [c.code, { type: c.type, value: c.value, label: c.description || `${c.type === 'percent' ? c.value + '%' : '₪' + c.value} הנחה` }]));
  favorites = new Set(favsRows.map(f => f.product_id));

  // Apply active product/category promotions to products
  const activePromos = promosRows.filter(p =>
    (!p.start_date || p.start_date <= today) &&
    (!p.end_date   || p.end_date   >= today) &&
    (p.type === 'product' || p.type === 'category')
  );
  if (activePromos.length) {
    products = products.map(p => {
      let best = null;
      for (const promo of activePromos) {
        if (promo.type === 'product'  && promo.product_id  === p.id)          best = promo;
        if (promo.type === 'category' && promo.category_id === p.category_id) best = best || promo;
      }
      if (!best) return p;
      const discounted = best.type === 'percent'
        ? p.price * (1 - best.value / 100)
        : Math.max(0, p.price - best.value);
      return { ...p, sale_price: p.sale_price ?? discounted, _promo: best.name };
    });
  }

  function buildTree(nodes, parentId = null) {
    return nodes
      .filter(n => (n.parent_id ?? null) === parentId)
      .sort((a,b) => a.sort_order - b.sort_order)
      .map(n => ({ ...n, children: buildTree(nodes, n.id) }));
  }
  shopCats = { tree: buildTree(catsRows), flat: catsRows };

  // ---- Sort + Search ----
  document.getElementById('sort-select').addEventListener('change', e => {
    activeSort = e.target.value;
    applyFilters();
  });
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim().toLowerCase();
    applyFilters();
  });

  function collectIds(node) { return [node.id, ...node.children.flatMap(collectIds)]; }

  function applyFilters() {
    const activeCat = selectedLeaf || (activeCatPath.length ? activeCatPath[activeCatPath.length - 1] : null);
    let list;
    if (!activeCat) {
      list = [...products];
    } else if (activeCat.id !== null) {
      const ids = new Set(collectIds(activeCat));
      list = products.filter(p => ids.has(p.category_id));
    } else {
      list = products.filter(p => p.category === activeCat.name);
    }
    if (searchQuery) {
      list = list.filter(p =>
        p.name?.toLowerCase().includes(searchQuery) ||
        p.description?.toLowerCase().includes(searchQuery)
      );
    }
    switch (activeSort) {
      case 'price-asc':  list.sort((a,b) => a.price - b.price); break;
      case 'price-desc': list.sort((a,b) => b.price - a.price); break;
      case 'name-asc':   list.sort((a,b) => a.name.localeCompare(b.name, 'he')); break;
      case 'name-desc':  list.sort((a,b) => b.name.localeCompare(a.name, 'he')); break;
      case 'newest':     list.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0)); break;
      case 'featured':   list.sort((a,b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)); break;
    }
    filteredProds = list;
    renderProducts(list);
  }

  function renderCategories() {
    // אם יש עץ מה-DB — שימוש בשורשים. אחרת — fallback לקטגוריות המוצרים
    const roots = shopCats.tree.length
      ? shopCats.tree
      : [...new Set(products.map(p => p.category).filter(Boolean))]
          .map(c => ({ id: null, name: c, children: [] }));
    const bar = document.getElementById('cat-filters');
    bar.innerHTML = `<button class="cat-btn active" data-idx="-1">הכל</button>` +
      roots.map((n, i) => `<button class="cat-btn" data-idx="${i}">${n.name}</button>`).join('');
    bar.querySelectorAll('.cat-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const idx = +btn.dataset.idx;
        activeCatPath = idx === -1 ? [] : [roots[idx]];
        selectedLeaf = null;
        renderSubcategories();
        renderBreadcrumb();
        applyFilters();
      })
    );
  }

  function renderBreadcrumb() {
    const bc = document.getElementById('cat-breadcrumb');
    if (!bc) return;
    const path = selectedLeaf ? [...activeCatPath, selectedLeaf] : activeCatPath;
    if (!path.length) { bc.style.display = 'none'; return; }
    bc.style.display = 'flex';
    bc.innerHTML = `<span class="bc-item bc-link" data-level="-1">הכל</span>` +
      path.map((n, i) =>
        i < path.length - 1
          ? `<span class="bc-sep">/</span><span class="bc-item bc-link" data-level="${i}">${n.name}</span>`
          : `<span class="bc-sep">/</span><span class="bc-item bc-current">${n.name}</span>`
      ).join('');
    bc.querySelectorAll('.bc-link').forEach(el =>
      el.addEventListener('click', () => {
        const lvl = +el.dataset.level;
        if (lvl === -1) {
          activeCatPath = []; selectedLeaf = null;
          renderCategories();
        } else {
          activeCatPath = activeCatPath.slice(0, lvl + 1);
          selectedLeaf = null;
          renderSubcategories();
        }
        renderBreadcrumb();
        applyFilters();
      })
    );
  }

  function renderSubcategories() {
    const row = document.getElementById('subcat-row');
    const bar = document.getElementById('subcat-filters');
    const current = activeCatPath.length ? activeCatPath[activeCatPath.length - 1] : null;
    const children = current?.children || [];
    if (!children.length) { row.style.display = 'none'; return; }
    row.style.display = '';
    const breadcrumb = activeCatPath.length > 1
      ? `<button class="cat-btn" data-back="1">← חזרה</button>` : '';
    bar.innerHTML = breadcrumb +
      `<button class="cat-btn${!selectedLeaf ? ' active' : ''}" data-sub="-1">הכל</button>` +
      children.map((n, i) =>
        `<button class="cat-btn${selectedLeaf?.id === n.id ? ' active' : ''}" data-sub="${i}">${n.name}</button>`
      ).join('');
    bar.querySelectorAll('[data-back]').forEach(btn =>
      btn.addEventListener('click', () => {
        activeCatPath.pop();
        selectedLeaf = null;
        renderSubcategories();
        renderBreadcrumb();
        applyFilters();
      })
    );
    bar.querySelectorAll('[data-sub]').forEach(btn =>
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.sub;
        if (idx === -1) {
          selectedLeaf = null;
          renderSubcategories();
          renderBreadcrumb();
          applyFilters();
          return;
        }
        const child = children[idx];
        if (child.children?.length) {
          activeCatPath.push(child);
          selectedLeaf = null;
          renderSubcategories();
          renderBreadcrumb();
        } else {
          selectedLeaf = child;
          renderSubcategories();
          renderBreadcrumb();
        }
        applyFilters();
      })
    );
  }

  function renderProducts(prods) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = prods.length ? prods.map(p => {
      const saleActive = p.sale_price && p.sale_price < p.price &&
        (!p.sale_start || p.sale_start <= today) &&
        (!p.sale_end   || p.sale_end   >= today);
      const displayPrice = saleActive ? p.sale_price : p.price;
      const badge = p.badge_text
        ? `<span class="p-badge custom">${p.badge_text}</span>`
        : saleActive ? `<span class="p-badge sale">מבצע</span>`
        : p.is_new ? `<span class="p-badge new">חדש</span>`
        : p.is_bestseller ? `<span class="p-badge bestseller">בסטסלר</span>` : '';
      const origPrice = saleActive
        ? `<span class="p-orig-price">${window.fmt.currency(p.price)}</span>` : '';
      const isFav = favorites.has(p.id);
      const stars = p.avg_rating ? '★'.repeat(Math.round(p.avg_rating)) + '☆'.repeat(5 - Math.round(p.avg_rating)) : '';
      return `
      <div class="product-card" data-id="${p.id}">
        ${badge}
        ${userId !== 'guest' ? `<button class="p-fav${isFav ? ' active' : ''}" data-fav="${p.id}" onclick="event.stopPropagation()">${isFav ? '❤️' : '🤍'}</button>` : ''}
        <div class="p-img">
          ${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy" />`
            : `<span class="p-emoji">${p.emoji ?? '📦'}</span>`}
        </div>
        <div class="p-body">
          ${stars ? `<div class="p-stars">${stars}</div>` : ''}
          <div class="p-name">${p.name}</div>
          <div class="p-desc">${p.description ?? ''}</div>
          <div class="p-footer">
            <div style="display:flex;align-items:baseline;gap:2px;flex-wrap:wrap;">
              <span class="p-price">${window.fmt.currency(displayPrice)}</span>
              ${origPrice}
            </div>
            <button class="p-add add-btn" data-id="${p.id}" onclick="event.stopPropagation()">הוסף +</button>
          </div>
        </div>
      </div>`;
    }).join('')
      : '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0;grid-column:1/-1;">אין מוצרים זמינים</p>';
    grid.querySelectorAll('.add-btn').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); addToCart(btn.dataset.id); })
    );
    grid.querySelectorAll('.product-card').forEach(card =>
      card.addEventListener('click', () => openProductModal(card.dataset.id))
    );
    grid.querySelectorAll('.p-fav').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(+btn.dataset.fav, btn); })
    );
  }

  async function toggleFavorite(productId, btn) {
    const isFav = favorites.has(productId);
    if (isFav) {
      favorites.delete(productId);
      btn.textContent = '🤍'; btn.classList.remove('active');
      await window._sb.from('favorites').delete().eq('customer_id', userId).eq('product_id', productId).catch(() => {});
    } else {
      favorites.add(productId);
      btn.textContent = '❤️'; btn.classList.add('active');
      await window._sb.from('favorites').insert({ customer_id: userId, product_id: productId }).catch(() => {});
    }
  }

  let galleryMedia = [];
  let galleryIndex  = 0;

  function buildGallery(p) {
    // image_url תמיד ראשון, אחריו images[], אחריו videos[]
    const mainImg = p.image_url ? [p.image_url] : [];
    const extraImgs = Array.isArray(p.images) ? p.images.filter(u => u && u !== p.image_url) : [];
    const vids = Array.isArray(p.videos) ? p.videos.filter(Boolean) : [];
    galleryMedia = [
      ...mainImg.map(src => ({ kind: 'img', src })),
      ...extraImgs.map(src => ({ kind: 'img', src })),
      ...vids.map(src => ({ kind: isYT(src) ? 'embed' : 'video', src })),
    ];
    galleryIndex = 0;

    if (!galleryMedia.length) {
      document.getElementById('pm-main').innerHTML =
        `<div class="pm-emoji-big">${p.emoji ?? '\uD83D\uDCE6'}</div>`;
      document.getElementById('pm-zoom-btn').style.display = 'none';
      document.getElementById('pm-thumbs').innerHTML = '';
      return;
    }

    renderThumbs();
    showMedia(0);
  }

  function stopAllMedia() {
    const main = document.getElementById('pm-main');
    main.querySelectorAll('video').forEach(v => { v.pause(); v.currentTime = 0; });
    main.querySelectorAll('iframe').forEach(f => { f.src = f.src; }); // reset YT
  }

  window.showMedia = function(i) {
    stopAllMedia();
    galleryIndex = i;
    const m = galleryMedia[i];
    const main = document.getElementById('pm-main');
    const zoomBtn = document.getElementById('pm-zoom-btn');

    if (m.kind === 'img') {
      main.innerHTML = `<img src="${m.src}" alt="" style="cursor:zoom-in" onclick="zoomCurrent()" />`;
      zoomBtn.style.display = 'block';
    } else if (m.kind === 'embed') {
      main.innerHTML = `<iframe src="${ytEmbed(m.src)}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      zoomBtn.style.display = 'none';
    } else {
      main.innerHTML = `<video src="${m.src}" controls autoplay></video>`;
      zoomBtn.style.display = 'none';
    }

    // עדכון thumb פעיל
    document.querySelectorAll('.pm-thumb').forEach((t, idx) =>
      t.classList.toggle('active', idx === i)
    );
  }

  function renderThumbs() {
    const bar = document.getElementById('pm-thumbs');
    bar.innerHTML = galleryMedia.map((m, i) => {
      const inner = m.kind === 'img'
        ? `<img src="${m.src}" />`
        : m.kind === 'embed'
          ? `<div style="width:100%;height:100%;background:#1a1a2e;display:flex;align-items:center;justify-content:center"><i class="fab fa-youtube" style="color:#f00;font-size:22px"></i></div>`
          : `<video src="${m.src}" muted></video>`;
      const play = m.kind !== 'img' ? `<div class="pm-thumb-play">&#9654;</div>` : '';
      return `<div class="pm-thumb ${i===0?'active':''}" onclick="showMedia(${i})">${inner}${play}</div>`;
    }).join('');
  }

  window.zoomCurrent = function() {
    const m = galleryMedia[galleryIndex];
    if (!m || m.kind !== 'img') return;
    document.getElementById('zoom-img').src = m.src;
    document.getElementById('zoom-overlay').classList.add('open');
  }

  function isYT(url) { return url && (url.includes('youtube') || url.includes('youtu.be')); }
  function ytEmbed(url) {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([-\w]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }

  function openProductModal(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    let qty = 1;
    let selectedVariant = null;

    const saleActive = p.sale_price && p.sale_price < p.price &&
      (!p.sale_start || p.sale_start <= today) &&
      (!p.sale_end   || p.sale_end   >= today);
    const basePrice = saleActive ? p.sale_price : p.price;

    buildGallery(p);
    document.getElementById('pm-name').textContent     = p.name;
    document.getElementById('pm-category').textContent = p.category ?? '';
    document.getElementById('pm-desc').textContent     = p.full_desc || p.description || '';
    document.getElementById('pm-stock').textContent    = p.stock != null ? `מלאי: ${p.stock}` : '';
    document.getElementById('pm-qty').textContent      = qty;
    document.getElementById('pm-price').textContent    = window.fmt.currency(basePrice);
    const origEl = document.getElementById('pm-orig-price');
    if (saleActive) { origEl.textContent = window.fmt.currency(p.price); origEl.style.display = 'inline'; }
    else { origEl.style.display = 'none'; }

    // וריאנטים
    const variants = (p.product_variants || []).filter(v => v.is_active !== false);
    const variantsEl = document.getElementById('pm-variants');
    const selectedByGroup = {};
    if (variants.length) {
      // קבץ לפי option_type
      const groups = {};
      variants.forEach(v => { (groups[v.option_type] = groups[v.option_type] || []).push(v); });
      variantsEl.innerHTML = Object.entries(groups).map(([type, opts]) => {
        const label = { size: 'מידה', color: 'צבע', pack: 'כמות', custom: 'בחירה' }[type] || type;
        return `<div class="pm-variant-group" data-type="${type}">
          <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:6px;">${label}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${opts.sort((a,b) => a.sort_order - b.sort_order).map(v => {
              const outOfStock = v.stock === 0;
              if (type === 'color') {
                const hex = v.color_hex || '#cccccc';
                const isLight = hex === '#ffffff' || hex === '#fff';
                return `<button class="variant-btn color-btn${outOfStock ? ' out' : ''}" data-vid="${v.id}" title="${v.option_value}" style="background:${hex};border-color:${isLight ? '#d1d5db' : hex};" ${outOfStock ? 'disabled' : ''}></button>`;
              }
              return `<button class="variant-btn${outOfStock ? ' out' : ''}" data-vid="${v.id}" ${outOfStock ? 'disabled' : ''}>${v.option_value}</button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('');
      variantsEl.style.display = 'block';

    // סמן אוטומטית את הוריאנט הראשון בכל קבוצה
      Object.entries(groups).forEach(([type, opts]) => {
        const first = opts.sort((a,b) => a.sort_order - b.sort_order).find(v => v.stock !== 0);
        if (!first) return;
        const btn = variantsEl.querySelector(`[data-vid="${first.id}"]`);
        if (!btn) return;
        btn.classList.add('active');
        selectedVariant = first;
        selectedByGroup[type] = first;
        if (first.image_url) {
          galleryMedia[0] = { kind: 'img', src: first.image_url };
          showMedia(0);
        }
        const finalPrice = first.price_modifier > 0 ? first.price_modifier : basePrice;
        document.getElementById('pm-price').textContent = window.fmt.currency(finalPrice);
      });

      variantsEl.querySelectorAll('.variant-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.closest('.pm-variant-group').dataset.type;
          btn.closest('.pm-variant-group').querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedVariant = variants.find(v => v.id === +btn.dataset.vid);
          selectedByGroup[type] = selectedVariant;
          // החלף תמונה ראשית אם לוריאנט יש תמונה
          if (selectedVariant?.image_url) {
            const main = document.getElementById('pm-main');
            main.innerHTML = `<img src="${selectedVariant.image_url}" alt="" style="cursor:zoom-in" onclick="zoomCurrent()" />`;
            document.getElementById('pm-zoom-btn').style.display = 'block';
            galleryMedia[0] = { kind: 'img', src: selectedVariant.image_url };
            galleryIndex = 0;
            document.querySelectorAll('.pm-thumb').forEach((t, idx) => t.classList.toggle('active', idx === 0));
          }
          const finalPrice = selectedVariant?.price_modifier > 0 ? selectedVariant.price_modifier : basePrice;
          document.getElementById('pm-price').textContent = window.fmt.currency(finalPrice);
          const vStock = selectedVariant?.stock;
          document.getElementById('pm-stock').textContent = vStock != null ? `מלאי: ${vStock}` : (p.stock != null ? `מלאי: ${p.stock}` : '');
        });
      });
    } else {
      variantsEl.innerHTML = '';
      variantsEl.style.display = 'none';
    }

    const setQty = n => { qty = Math.max(1, n); document.getElementById('pm-qty').textContent = qty; };
    document.getElementById('pm-minus').onclick = () => setQty(qty - 1);
    document.getElementById('pm-plus').onclick  = () => setQty(qty + 1);
    document.getElementById('pm-add-btn').onclick = () => {
      // בדוק קבוצות חובה
      const groups = {};
      variants.forEach(v => { groups[v.option_type] = groups[v.option_type] || v; });
      const requiredGroups = Object.keys(groups).filter(type => variants.find(v => v.option_type === type && v.is_required));
      const missingRequired = requiredGroups.filter(type => !selectedByGroup[type]);
      if (p.variant_required && variants.length && !selectedVariant) {
        missingRequired.push('_any');
      }
      if (missingRequired.length) {
        document.getElementById('pm-variants').style.outline = '2px solid #ec4899';
        document.getElementById('pm-variants').style.borderRadius = '10px';
        window.popup.toast('נא לבחור וריאנט לפני ההוספה', 'warning');
        return;
      }
      document.getElementById('pm-variants').style.outline = '';
      for (let i = 0; i < qty; i++) addToCart(String(p.id), selectedVariant, selectedByGroup);
      document.getElementById('product-modal').classList.remove('open');
    };
    document.getElementById('product-modal').classList.add('open');
  }

  document.getElementById('product-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('product-modal')) {
      stopAllMedia();
      document.getElementById('product-modal').classList.remove('open');
    }
  });

  document.querySelector('#product-modal button[onclick]').addEventListener('click', stopAllMedia);

  function addToCart(id, variant = null, selectionMap = {}) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    // בנה תווית מכל הבחירות
    const labelParts = Object.values(selectionMap).map(v => v.option_value).filter(Boolean);
    if (variant && !labelParts.includes(variant.option_value)) labelParts.push(variant.option_value);
    const label = labelParts.length ? labelParts.join(' / ') : null;
    const key = variant ? `${p.id}_v${variant.id}_${Object.keys(selectionMap).sort().map(k => selectionMap[k].id).join('_')}` : String(p.id);
    const saleActive = p.sale_price && p.sale_price < p.price &&
      (!p.sale_start || p.sale_start <= today) &&
      (!p.sale_end   || p.sale_end   >= today);
    const basePrice = saleActive ? p.sale_price : p.price;
    const price = variant?.price_modifier > 0 ? variant.price_modifier : basePrice;
    if (cart[key]) {
      cart[key].qty += 1;
    } else {
      cart[key] = { ...p, qty: 1, price, variantId: variant?.id || null, variantLabel: label, cartKey: key };
    }
    window.cartService.save(userId, cart);
    updateCartUI();
    window.popup.toast(`${p.name}${label ? ` (${label})` : ''} נוסף לעגלה`);
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
              <div class="font-medium text-gray-800 text-sm truncate">${i.name}${i.variantLabel ? ` <span style="color:#8b5cf6;font-size:11px;font-weight:600;">(${i.variantLabel})</span>` : ''}</div>
              <div class="text-xs text-gray-400">${window.fmt.currency(i.price)}</div>
            </div>
            <div class="flex items-center gap-1">
              <button class="qty-btn" data-key="${i.cartKey || i.id}" data-op="-">−</button>
              <span class="w-6 text-center text-sm font-bold">${i.qty}</span>
              <button class="qty-btn" data-key="${i.cartKey || i.id}" data-op="+">+</button>
              <button class="cart-del" data-key="${i.cartKey || i.id}">🗑</button>
            </div>
          </div>`).join('')
      : '<p class="text-gray-400 text-sm text-center py-10">העגלה ריקה</p>';

    document.querySelectorAll('.qty-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (!cart[key]) return;
        cart[key].qty += btn.dataset.op === '+' ? 1 : -1;
        if (cart[key].qty <= 0) delete cart[key];
        window.cartService.save(userId, cart);
        updateCartUI();
      })
    );
    document.querySelectorAll('.cart-del').forEach(btn =>
      btn.addEventListener('click', () => {
        delete cart[btn.dataset.key];
        window.cartService.save(userId, cart);
        updateCartUI();
      })
    );
  }

  document.getElementById('coupon-btn').addEventListener('click', () => {
    const code = document.getElementById('coupon-input').value.trim().toUpperCase();
    const msg  = document.getElementById('coupon-msg');
    msg.style.display = 'block';
    const coupon = dbCoupons[code];
    if (coupon) {
      activeCoupon = { code, ...coupon };
      msg.style.color = '#059669';
      msg.textContent = `✅ קופון "${code}" הופעל — ${coupon.label}`;
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
      showRegisteredCheckoutModal(items);
    } else {
      showGuestCheckoutModal(items);
    }
  });

  function showRegisteredCheckoutModal(items) {
    const total = calcTotal(items.reduce((s, i) => s + i.price * i.qty, 0));
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,10,40,.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
    modal.innerHTML = `
      <div style="background:white;border-radius:24px;padding:28px;max-width:400px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="font-size:18px;font-weight:800;color:#1f2937;">אישור הזמנה</h3>
          <button id="_rc-close" style="background:#f3f0ff;border:none;color:#7c3aed;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
        </div>
        <textarea id="_rc-notes" placeholder="הערות להזמנה (אופציונלי)" rows="3" style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px 12px;font-size:14px;outline:none;font-family:inherit;resize:vertical;margin-bottom:16px;"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid #f3f0ff;">
          <span style="font-size:15px;font-weight:700;color:#1f2937;">סה"כ: ${window.fmt.currency(total)}</span>
          <button id="_rc-submit" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border:none;padding:11px 24px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">שלח הזמנה</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#_rc-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#_rc-submit').addEventListener('click', async () => {
      const notes = modal.querySelector('#_rc-notes').value.trim() || null;
      modal.remove();
      await submitOrder(userId, items, notes ? { notes } : null);
    });
  }

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
      const email = modal.querySelector('#_g-email').value.trim();
      if (!name)  { window.popup.toast('שם מלא הוא שדה חובה', 'warning'); return; }
      if (!phone) { window.popup.toast('טלפון הוא שדה חובה', 'warning'); return; }
      if (!/^0[0-9]{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
        window.popup.toast('מספר טלפון לא תקין', 'warning'); return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window.popup.toast('כתובת מייל לא תקינה', 'warning'); return;
      }
      const guestInfo = {
        name,
        phone: phone.replace(/[-\s]/g, ''),
        email:   email || null,
        address: modal.querySelector('#_g-address').value.trim() || null,
        notes:   modal.querySelector('#_g-notes').value.trim()   || null,
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
      await window.customerService.createOrder(customerId, items, total, guestInfo, activeCoupon?.code || null);
      cart = {};
      window.cartService.clear(userId);
      updateCartUI();
      closeCart();
      showConfirmModal();
      if (customerId) renderOrders(await window.customerService.getOrders(customerId));
    } catch (err) {
      console.error('submitOrder error:', err?.message, err?.code, err?.details, err);
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

  const STATUS_MAP = {
    new:        { label: 'חדש',    color: '#7c3aed', bg: '#ede9fe', icon: '🆕', step: 0 },
    pending:    { label: 'ממתין',   color: '#d97706', bg: '#fef3c7', icon: '⏳', step: 0 },
    processing: { label: 'בטיפול',  color: '#2563eb', bg: '#dbeafe', icon: '⚙️', step: 1 },
    packed:     { label: 'ארוז',    color: '#7c3aed', bg: '#ede9fe', icon: '📦', step: 2 },
    shipped:    { label: 'נשלח',    color: '#0891b2', bg: '#cffafe', icon: '🚚', step: 3 },
    completed:  { label: 'הושלם',  color: '#059669', bg: '#d1fae5', icon: '✅', step: 4 },
    cancelled:  { label: 'בוטל',   color: '#dc2626', bg: '#fee2e2', icon: '❌', step: -1 },
  };

  const TIMELINE_STEPS = ['pending','processing','packed','shipped','completed'];

  function renderOrderTimeline(status) {
    const currentStep = STATUS_MAP[status]?.step ?? 0;
    if (status === 'cancelled') return `<div style="text-align:center;color:#dc2626;font-size:13px;font-weight:700;padding:8px 0;">❌ ההזמנה בוטלה</div>`;
    return `<div style="display:flex;align-items:flex-start;margin:4px 0 12px;">
      ${TIMELINE_STEPS.map((s, i) => {
        const st = STATUS_MAP[s];
        const done = i < currentStep;
        const curr = i === currentStep;
        const lineColor = done || curr ? 'linear-gradient(90deg,#ec4899,#8b5cf6)' : '#e5e7eb';
        return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;">
          ${i < TIMELINE_STEPS.length - 1 ? `<div style="position:absolute;top:13px;right:-50%;width:100%;height:2px;background:${done ? lineColor : '#e5e7eb'};z-index:0;"></div>` : ''}
          <div style="width:28px;height:28px;border-radius:50%;border:2px solid ${curr ? '#8b5cf6' : done ? 'transparent' : '#e5e7eb'};background:${done ? 'linear-gradient(135deg,#ec4899,#8b5cf6)' : 'white'};display:flex;align-items:center;justify-content:center;font-size:11px;z-index:1;position:relative;${curr ? 'box-shadow:0 0 0 3px rgba(139,92,246,.2);' : ''}">${done ? '✓' : st.icon}</div>
          <div style="font-size:9px;margin-top:3px;text-align:center;color:${done||curr ? '#7c3aed' : '#9ca3af'};font-weight:${done||curr ? '700' : '400'};">${st.label}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function showOrderDetail(o) {
    const s = STATUS_MAP[o.status] || { label: o.status, color: '#6b7280', bg: '#f3f4f6', icon: '?' };
    const items = o.order_items ?? [];
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:rgba(15,10,40,.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
    el.innerHTML = `
      <div style="background:white;border-radius:20px;width:420px;max-width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.25);">
        <div style="background:linear-gradient(135deg,#ec4899,#8b5cf6);padding:16px 20px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="color:white;font-size:16px;font-weight:800;">הזמנה #${o.id}</div>
            <div style="color:rgba(255,255,255,.75);font-size:11px;">${window.fmt.date(o.created_at)}</div>
          </div>
          <button id="_od-close" style="background:rgba(255,255,255,.2);border:none;color:white;width:30px;height:30px;border-radius:50%;font-size:15px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:16px 20px 20px;">
          ${renderOrderTimeline(o.status)}
          ${o.admin_notes ? `<div style="background:#fef3c7;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;">
            <span style="font-size:16px;">💬</span>
            <div>
              <div style="font-size:10px;color:#92400e;font-weight:700;margin-bottom:2px;">הודעה מהצוות</div>
              <div style="font-size:13px;color:#374151;">${o.admin_notes}</div>
            </div>
          </div>` : ''}
          <div style="background:#f8f7ff;border-radius:10px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:10px;color:#9ca3af;font-weight:700;margin-bottom:6px;">פריטים</div>
            ${items.length ? items.map(i => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f3f0ff;font-size:13px;">
                <span style="color:#1f2937;font-weight:600;">${i.products?.name ?? 'מוצר'}</span>
                <span style="color:#6b7280;">×${i.quantity} — ${window.fmt.currency(i.price * i.quantity)}</span>
              </div>`).join('') : '<div style="font-size:12px;color:#9ca3af;">אין פרטי פריטים</div>'}
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:14px;font-weight:800;">
              <span style="color:#1f2937;">סה"כ</span>
              <span style="background:linear-gradient(135deg,#ec4899,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${window.fmt.currency(o.total)}</span>
            </div>
          </div>
          <div style="text-align:center;">
            <span style="font-size:11px;font-weight:700;color:${s.color};background:${s.bg};padding:4px 14px;border-radius:20px;">${s.icon} ${s.label}</span>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#_od-close').addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  }

  function renderOrders(orders) {
    const list = document.getElementById('orders-list');
    list.innerHTML = orders.length
      ? orders.map(o => {
          const s = STATUS_MAP[o.status] || { label: o.status, color: '#6b7280', bg: '#f3f4f6', icon: '?' };
          return `
          <div data-oid="${o.id}" style="flex-shrink:0;background:white;border:1px solid #f3f0ff;border-radius:12px;padding:10px 14px;min-width:170px;box-shadow:0 2px 8px rgba(139,92,246,.07);cursor:pointer;transition:box-shadow .15s;" onmouseenter="this.style.boxShadow='0 4px 16px rgba(139,92,246,.18)'" onmouseleave="this.style.boxShadow='0 2px 8px rgba(139,92,246,.07)'">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">${window.fmt.date(o.created_at)}</div>
            <div style="font-weight:700;font-size:13px;color:#1f2937;margin-bottom:6px;">${window.fmt.currency(o.total)}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:6px;">
              <span style="font-size:11px;color:#6b7280;">${o.order_items?.length ?? 0} פריטים</span>
              <span style="font-size:10px;font-weight:700;color:${s.color};background:${s.bg};padding:2px 8px;border-radius:20px;">${s.icon} ${s.label}</span>
            </div>
            ${o.status !== 'cancelled' ? `<div style="display:flex;gap:2px;align-items:center;">${TIMELINE_STEPS.map((st,i) => {
              const done = i <= (STATUS_MAP[o.status]?.step ?? 0);
              return `<div style="flex:1;height:3px;border-radius:2px;background:${done ? 'linear-gradient(90deg,#ec4899,#8b5cf6)' : '#e5e7eb'};"></div>`;
            }).join('')}</div>` : ''}
          </div>`;
        }).join('')
      : '<p style="font-size:12px;color:#9ca3af;padding:4px 0;">אין הזמנות קודמות</p>';
    list.querySelectorAll('[data-oid]').forEach(card => {
      const oid = +card.dataset.oid;
      card.addEventListener('click', () => showOrderDetail(orders.find(o => o.id === oid)));
    });
  }

  // real-time עדכון הזמנות ללקוח מחובר
  if (userId !== 'guest') {
    window._sb
      .channel('orders-customer-' + userId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` }, async payload => {
        const updated = payload.new;
        const idx = orders.findIndex(o => o.id === updated.id);
        if (idx !== -1) {
          orders[idx] = { ...orders[idx], status: updated.status, admin_notes: updated.admin_notes };
          renderOrders(orders);
          const s = STATUS_MAP[updated.status];
          if (s) window.popup.toast(`הזמנה #${updated.id}: ${s.icon} ${s.label}`, 'info');
        }
      })
      .subscribe();
  }

  // אתחול אחרי הגדרת כל הפונקציות
  renderCategories();
  applyFilters();
  renderOrders(orders);
  updateCartUI();

})();
