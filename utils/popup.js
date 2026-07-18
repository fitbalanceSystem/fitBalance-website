window.popup = {
  toast(message, type = 'success') {
    const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    const icons  = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    let c = document.getElementById('_toast_container');
    if (!c) {
      c = document.createElement('div');
      c.id = '_toast_container';
      c.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
      document.body.appendChild(c);
    }
    const el = document.createElement('div');
    el.style.cssText = `background:${colors[type]};color:white;padding:10px 20px;border-radius:12px;font-size:14px;font-weight:600;
      box-shadow:0 4px 20px rgba(0,0,0,.2);display:flex;align-items:center;gap:8px;
      opacity:0;transform:translateY(-8px);transition:all .25s ease;pointer-events:auto`;
    el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    c.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  },

  confirm(message) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
      overlay.innerHTML = `
        <div style="background:white;border-radius:20px;padding:28px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)">
          <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
          <p style="color:#374151;font-weight:500;margin-bottom:20px">${message}</p>
          <div style="display:flex;gap:10px;justify-content:center">
            <button id="_c_yes" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border:none;padding:10px 24px;border-radius:12px;font-weight:600;cursor:pointer">אישור</button>
            <button id="_c_no"  style="background:#f3f4f6;color:#374151;border:none;padding:10px 24px;border-radius:12px;font-weight:600;cursor:pointer">ביטול</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#_c_yes').onclick = () => { overlay.remove(); resolve(true); };
      overlay.querySelector('#_c_no').onclick  = () => { overlay.remove(); resolve(false); };
    });
  },
};
