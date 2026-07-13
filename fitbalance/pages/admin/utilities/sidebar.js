// טוען את ה-sidebar המשותף ומסמן את הדף הפעיל
(async function loadSidebar() {
  const placeholder = document.getElementById('sidebar-placeholder');
  if (!placeholder) return;

  const res = await fetch('component/sidebar.html');
  const html = await res.text();

  // מוסיף את ה-sidebar לפני ה-body
  document.body.insertAdjacentHTML('afterbegin', html);
  placeholder.remove();
})();
