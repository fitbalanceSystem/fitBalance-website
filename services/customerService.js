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
    const { data, error } = await window._sb
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or('stock.is.null,stock.gt.0')
      .order('category');
    if (error) throw error;
    return data ?? [];
  },

  async getOrders(customerId) {
    const { data, error } = await window._sb
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createOrder(customerId, items, total, guestInfo = null) {
    const payload = { total, status: 'pending' };
    if (customerId) {
      payload.customer_id = customerId;
    } else if (guestInfo) {
      payload.guest_name    = guestInfo.name    || null;
      payload.guest_phone   = guestInfo.phone   || null;
      payload.guest_email   = guestInfo.email   || null;
      payload.guest_address = guestInfo.address || null;
      payload.guest_notes   = guestInfo.notes   || null;
    }
    const { data: order, error: oErr } = await window._sb
      .from('orders')
      .insert(payload)
      .select()
      .single();
    if (oErr) throw oErr;
    const rows = items.map(i => ({ order_id: order.id, product_id: i.id, quantity: i.qty, price: i.price }));
    const { error: iErr } = await window._sb.from('order_items').insert(rows);
    if (iErr) throw iErr;
    await Promise.all(items.map(i =>
      window._sb.rpc('decrement_stock', { p_product_id: i.id, p_qty: i.qty })
    ));
    return order;
  },
};
