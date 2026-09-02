window.uploadService = {
  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await window._sb.storage.from('profiles').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = window._sb.storage.from('profiles').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadProduct(file) {
    const ext  = file.name.split('.').pop();
    const path = `products/${Date.now()}.${ext}`;
    const { error } = await window._sb.storage.from('products').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = window._sb.storage.from('products').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadGift(file) {
    const ext  = file.name.split('.').pop();
    const path = `gifts/${Date.now()}.${ext}`;
    const { error } = await window._sb.storage.from('products').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = window._sb.storage.from('products').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadArticle(file, folder = 'articles/thumbs') {
    const ext  = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await window._sb.storage.from('products').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = window._sb.storage.from('products').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadEmailAttachment(file, templateKey) {
    const ext  = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const path = `email-attachments/${templateKey}/${Date.now()}${ext}`;
    const { error } = await window._sb.storage.from('products').upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
    if (error) throw error;
    const { data } = window._sb.storage.from('products').getPublicUrl(path);
    return { url: data.publicUrl, path, name: file.name, type: file.type || 'application/octet-stream' };
  },
};
