window.customerService = {
  async getProfile(customerEmail) {
    const { data, error } = await window._sb
      .from('customers')
      .select('*')
      .eq('email', customerEmail)
      .single();
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
    const { data, error } = await window._sb
      .from('customer_plans')
      .select('*, plans(*)')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
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
      .eq('active', true)
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

  async createOrder(customerId, items, total) {
    const { data: order, error: oErr } = await window._sb
      .from('orders')
      .insert({ customer_id: customerId, total, status: 'pending' })
      .select()
      .single();
    if (oErr) throw oErr;
    const rows = items.map(i => ({ order_id: order.id, product_id: i.id, quantity: i.qty, price: i.price }));
    const { error: iErr } = await window._sb.from('order_items').insert(rows);
    if (iErr) throw iErr;
    return order;
  },
};
