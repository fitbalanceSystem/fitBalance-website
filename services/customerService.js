window.customerService = {
  async getProfile(customerEmail) {
    const { data, error } = await window._sb
      .from('customers')
      .select('*')
      .eq('email', customerEmail)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateProfile(customerId, updates) {
    const { data, error } = await window._sb
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getActivePlan(customerId) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await window._sb
      .from('program_enrollments')
      .select('*, programs!fk_enrollments_program(*)')
      .eq('customer_id', customerId)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    // נרמול כך שה-profile.js ימשיך לעבוד
    if (!data) return null;
    return { ...data, plans: data.programs, sessions_left: null };
  },

  async getAvailablePlans() {
    const { data, error } = await window._sb
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('price');
    if (error) throw error;
    return data ?? [];
  },

  async getProducts() {
    // נסה עם product_variants, אם הטבלה לא קיימת — fallback ללאה
    let { data, error } = await window._sb
      .from('products')
      .select('*, product_variants(*)')
      .eq('is_active', true)
      .order('category');
    if (error?.code === 'PGRST200') {
      ({ data, error } = await window._sb
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category'));
    }
    if (error) throw error;
    // הסתר מוצרים ללא מלאי — אלא אם יש וריאנטים עם מלאי
    return (data ?? []).filter(p => {
      if (p.stock == null || p.stock > 0) return true;
      return (p.product_variants || []).some(v => v.stock == null || v.stock > 0);
    });
  },

  async getOrders(customerId) {
    const { data, error } = await window._sb
      .from('orders')
      .select('*, order_items(quantity, price, products(name))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createOrder(customerId, items, total, guestInfo = null, couponCode = null) {
    const numericId = customerId && customerId !== 'guest' ? Number(customerId) : null;

    // שלב 1: גלה אילו עמודות קיימות בטבלת orders
    const { data: sampleRow } = await window._sb.from('orders').select('*').limit(1).maybeSingle();
    const existingCols = sampleRow ? new Set(Object.keys(sampleRow)) : new Set();

    const payload = { total, status: 'new' };
    if (numericId) {
      payload.customer_id = numericId;
    }
    if (couponCode && existingCols.has('coupon_code'))  payload.coupon_code   = couponCode;
    if (existingCols.has('notes')) {
      if (numericId && guestInfo?.notes)  payload.notes = guestInfo.notes;
      if (!numericId && guestInfo?.notes) payload.notes = guestInfo.notes;
    }
    if (!numericId && guestInfo) {
      if (existingCols.has('guest_name'))    payload.guest_name    = guestInfo.name    || null;
      if (existingCols.has('guest_phone'))   payload.guest_phone   = guestInfo.phone   || null;
      if (existingCols.has('guest_email'))   payload.guest_email   = guestInfo.email   || null;
      if (existingCols.has('guest_address')) payload.guest_address = guestInfo.address || null;
    }

    const { data: order, error: oErr } = await window._sb
      .from('orders')
      .insert(payload)
      .select()
      .single();
    if (oErr) throw oErr;
    const { data: sampleItem } = await window._sb.from('order_items').select('*').limit(1).maybeSingle();
    const itemCols = sampleItem ? new Set(Object.keys(sampleItem)) : new Set();
    const rows = items.map(i => {
      const row = {
        order_id:   order.id,
        product_id: i.id,
        quantity:   i.qty,
        price:      i.price,
      };
      if (itemCols.has('variant_id'))    row.variant_id    = i.variantId    || null;
      if (itemCols.has('variant_label')) row.variant_label = i.variantLabel || null;
      return row;
    });
    const { error: iErr } = await window._sb.from('order_items').insert(rows);
    if (iErr) throw iErr;
    // הורדת מלאי — לפי וריאנט אם קיים, אחרת לפי מוצר
    await Promise.all(items.map(async i => {
      try {
        if (i.variantId) {
          const { error } = await window._sb.rpc('decrement_variant_stock', { p_variant_id: i.variantId, p_qty: i.qty });
          if (error) console.warn('decrement_variant_stock error:', error.message);
        } else {
          const { error } = await window._sb.rpc('decrement_stock', { p_product_id: i.id, p_qty: i.qty });
          if (error) console.warn('decrement_stock error:', error.message);
        }
      } catch (_) {}
    })).catch(() => {});
    return order;
  },
};
