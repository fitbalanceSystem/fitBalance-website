window.uploadService = {
  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await window._sb.storage.from('profiles').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = window._sb.storage.from('profiles').getPublicUrl(path);
    return data.publicUrl;
  },
};
