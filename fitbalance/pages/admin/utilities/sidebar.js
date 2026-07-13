(async function loadSidebar() {
  const placeholder = document.getElementById('sidebar-placeholder');
  if (!placeholder) return;

  // נתיב יחסי לתיקיית הקובץ הנוכחי
  const base = document.currentScript
    ? document.currentScript.src.replace(/\/[^\/]+$/, '')
    : new URL('utilities', location.href).href;

  try {
    const res = await fetch(base + '/../component/sidebar.html');
    if (!res.ok) throw new Error(res.status);
    const html = await res.text();
    document.body.insertAdjacentHTML('afterbegin', html);
    placeholder.remove();
  } catch (e) {
    console.error('sidebar load failed:', e);
    placeholder.remove();
  }
})();
