window.renderLayout = function(activeId) {
  const user = window.storageUtil.load();
  const name = user?.full_name ?? 'לקוחה';
  const initials = window.helpers.getInitials(name);

  const NAV = [
    { id: 'profile',  label: 'פרופיל',         icon: 'fa-user',         href: 'profile.html' },
    { id: 'schedule', label: 'מערכת שעות',      icon: 'fa-calendar-alt', href: 'schedule.html' },
    { id: 'plans',    label: 'תוכניות ונוכחות', icon: 'fa-dumbbell',     href: 'plans.html' },
    { id: 'shop',     label: 'חנות',            icon: 'fa-shopping-bag', href: 'shop.html' },
  ];

  const navHTML = NAV.map(n => {
    const active = n.id === activeId;
    return `
      <a href="${n.href}" class="_nav-item ${active ? '_nav-active' : ''}">
        <span class="_nav-icon"><i class="fas ${n.icon}"></i></span>
        <span>${n.label}</span>
        ${active ? '<span class="_nav-dot"></span>' : ''}
      </a>`;
  }).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;background:#f8f7ff;direction:rtl}

      #_sidebar{
        position:fixed;top:0;right:0;height:100%;width:260px;
        background:linear-gradient(180deg,#1a1035 0%,#2d1b69 60%,#3b1f7a 100%);
        z-index:40;display:flex;flex-direction:column;
        transition:transform .3s ease;
        box-shadow: 4px 0 30px rgba(0,0,0,.25);
      }
      ._sidebar-logo{
        padding:24px 20px 20px;
        border-bottom:1px solid rgba(255,255,255,.08);
        display:flex;align-items:center;gap:10px;text-decoration:none;
      }
      ._sidebar-logo img{height:36px;border-radius:8px}
      ._sidebar-logo span{
        font-size:18px;font-weight:800;
        background:linear-gradient(135deg,#f9a8d4,#c4b5fd);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      }
      ._sidebar-user{
        padding:16px 20px;
        display:flex;align-items:center;gap:12px;
        border-bottom:1px solid rgba(255,255,255,.08);
      }
      ._avatar{
        width:42px;height:42px;border-radius:50%;
        background:linear-gradient(135deg,#ec4899,#8b5cf6);
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:14px;font-weight:700;
        flex-shrink:0;border:2px solid rgba(255,255,255,.2);
      }
      ._user-name{font-size:14px;font-weight:600;color:white}
      ._user-role{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
      nav{flex:1;padding:12px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
      ._nav-item{
        display:flex;align-items:center;gap:12px;
        padding:11px 14px;border-radius:12px;
        font-size:14px;font-weight:500;text-decoration:none;
        color:rgba(255,255,255,.55);transition:all .2s;
        position:relative;
      }
      ._nav-item:hover{color:white;background:rgba(255,255,255,.08)}
      ._nav-active{
        color:white !important;
        background:rgba(255,255,255,.12) !important;
      }
      ._nav-icon{width:20px;text-align:center;font-size:15px}
      ._nav-dot{
        width:6px;height:6px;border-radius:50%;
        background:linear-gradient(135deg,#ec4899,#8b5cf6);
        margin-right:auto;flex-shrink:0;
      }
      ._sidebar-footer{
        padding:14px;
        border-top:1px solid rgba(255,255,255,.08);
      }
      #_logout_btn{
        display:flex;align-items:center;gap:10px;width:100%;
        padding:10px 14px;border-radius:12px;border:none;
        background:transparent;color:rgba(255,255,255,.4);
        font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;
      }
      #_logout_btn:hover{background:rgba(239,68,68,.15);color:#fca5a5}

      #_topbar{
        position:fixed;top:0;right:260px;left:0;height:64px;
        background:white;z-index:30;
        display:flex;align-items:center;justify-content:space-between;
        padding:0 24px;
        border-bottom:1px solid #ede9fe;
        box-shadow:0 1px 12px rgba(139,92,246,.07);
      }
      ._page-title{font-size:16px;font-weight:700;color:#1f2937}
      ._topbar-right{display:flex;align-items:center;gap:12px}
      ._topbar-greeting{font-size:13px;color:#9ca3af}
      ._topbar-greeting strong{color:#1f2937;font-weight:600}
      ._topbar-avatar{
        width:36px;height:36px;border-radius:50%;
        background:linear-gradient(135deg,#ec4899,#8b5cf6);
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:12px;font-weight:700;
      }
      #_sidebar_toggle{
        display:none;background:none;border:none;
        font-size:20px;color:#6b7280;cursor:pointer;padding:4px;
      }

      .page-content{margin-top:64px;margin-right:260px;padding:28px;min-height:calc(100vh - 64px)}

      .card{
        background:white;border-radius:16px;
        box-shadow:0 2px 16px rgba(139,92,246,.07);
        border:1px solid #f3f0ff;
      }
      .badge{
        display:inline-flex;align-items:center;gap:4px;
        padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;
      }
      .gradient-text{
        background:linear-gradient(135deg,#ec4899,#8b5cf6);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      }
      .btn-primary{
        padding:.65rem 1.4rem;border:none;cursor:pointer;
        background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;
        font-size:.9rem;font-weight:600;border-radius:10px;
        box-shadow:0 4px 14px rgba(236,72,153,.3);
        transition:opacity .2s,transform .2s;
      }
      .btn-primary:hover{opacity:.9;transform:translateY(-1px)}

      .skeleton{
        background:linear-gradient(90deg,#f3f0ff 25%,#ede9fe 50%,#f3f0ff 75%);
        background-size:200% 100%;animation:shimmer 1.4s infinite;
        border-radius:8px;
      }
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .fade-in{animation:fadeIn .5s ease both}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

      @media(max-width:768px){
        #_sidebar{transform:translateX(100%)}
        #_sidebar.open{transform:translateX(0)}
        #_topbar{right:0 !important}
        .page-content{margin-right:0;padding:16px}
        #_sidebar_toggle{display:block !important}
      }
    </style>

    <aside id="_sidebar">
      <a href="../../home.html" class="_sidebar-logo">
        <img src="../../assets/icons/logo.jpg" onerror="this.style.display='none'" />
        <span>FitBalance</span>
      </a>
      <div class="_sidebar-user">
        <div class="_avatar">${initials}</div>
        <div>
          <div class="_user-name">${name}</div>
          <div class="_user-role">לקוחה</div>
        </div>
      </div>
      <nav>${navHTML}</nav>
      <div class="_sidebar-footer">
        <button id="_logout_btn">
          <i class="fas fa-sign-out-alt" style="width:20px;text-align:center"></i>
          התנתקות
        </button>
      </div>
    </aside>

    <header id="_topbar">
      <button id="_sidebar_toggle"><i class="fas fa-bars"></i></button>
      <div class="_topbar-right">
        <span class="_topbar-greeting">שלום, <strong>${name}</strong></span>
        <div class="_topbar-avatar">${initials}</div>
      </div>
    </header>

    <div id="_sidebar_overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:35"></div>
  `);

  document.getElementById('_logout_btn').addEventListener('click', () => window.authMiddleware.logout());
  const sidebar = document.getElementById('_sidebar');
  const overlay = document.getElementById('_sidebar_overlay');
  document.getElementById('_sidebar_toggle').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.style.display = 'none';
  });
};

window.renderEmployeeLayout = function(activeId) {
  const user     = window.storageUtil.load();
  const name     = user?.full_name ?? 'עובד';
  const initials = window.helpers.getInitials(name);

  const NAV = [
    { id: 'profile',  label: 'פרופיל',       icon: 'fa-user',         href: 'profile.html' },
    { id: 'schedule', label: 'מערכת שעות',    icon: 'fa-calendar-alt', href: 'schedule.html' },
    { id: 'attendance', label: 'נוכחות',      icon: 'fa-clipboard-list', href: 'attendance.html' },
  ];

  const navHTML = NAV.map(n => {
    const active = n.id === activeId;
    return `
      <a href="${n.href}" class="_nav-item ${active ? '_nav-active' : ''}">
        <span class="_nav-icon"><i class="fas ${n.icon}"></i></span>
        <span>${n.label}</span>
        ${active ? '<span class="_nav-dot"></span>' : ''}
      </a>`;
  }).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;background:#f8f7ff;direction:rtl}
      #_sidebar{position:fixed;top:0;right:0;height:100%;width:260px;background:linear-gradient(180deg,#1a1035 0%,#2d1b69 60%,#3b1f7a 100%);z-index:40;display:flex;flex-direction:column;transition:transform .3s ease;box-shadow:4px 0 30px rgba(0,0,0,.25)}
      ._sidebar-logo{padding:24px 20px 20px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;text-decoration:none}
      ._sidebar-logo img{height:36px;border-radius:8px}
      ._sidebar-logo span{font-size:18px;font-weight:800;background:linear-gradient(135deg,#f9a8d4,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      ._sidebar-user{padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,.08)}
      ._avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;flex-shrink:0;border:2px solid rgba(255,255,255,.2)}
      ._user-name{font-size:14px;font-weight:600;color:white}
      ._user-role{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
      nav{flex:1;padding:12px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
      ._nav-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;font-size:14px;font-weight:500;text-decoration:none;color:rgba(255,255,255,.55);transition:all .2s;position:relative}
      ._nav-item:hover{color:white;background:rgba(255,255,255,.08)}
      ._nav-active{color:white !important;background:rgba(255,255,255,.12) !important}
      ._nav-icon{width:20px;text-align:center;font-size:15px}
      ._nav-dot{width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);margin-right:auto;flex-shrink:0}
      ._sidebar-footer{padding:14px;border-top:1px solid rgba(255,255,255,.08)}
      #_logout_btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border-radius:12px;border:none;background:transparent;color:rgba(255,255,255,.4);font-size:14px;font-weight:500;cursor:pointer;transition:all .2s}
      #_logout_btn:hover{background:rgba(239,68,68,.15);color:#fca5a5}
      #_topbar{position:fixed;top:0;right:260px;left:0;height:64px;background:white;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid #ede9fe;box-shadow:0 1px 12px rgba(139,92,246,.07)}
      ._topbar-right{display:flex;align-items:center;gap:12px}
      ._topbar-greeting{font-size:13px;color:#9ca3af}
      ._topbar-greeting strong{color:#1f2937;font-weight:600}
      ._topbar-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700}
      #_sidebar_toggle{display:none;background:none;border:none;font-size:20px;color:#6b7280;cursor:pointer;padding:4px}
      .page-content{margin-top:64px;margin-right:260px;padding:28px;min-height:calc(100vh - 64px)}
      .card{background:white;border-radius:16px;box-shadow:0 2px 16px rgba(139,92,246,.07);border:1px solid #f3f0ff}
      .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
      .gradient-text{background:linear-gradient(135deg,#ec4899,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .btn-primary{padding:.65rem 1.4rem;border:none;cursor:pointer;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;font-size:.9rem;font-weight:600;border-radius:10px;box-shadow:0 4px 14px rgba(236,72,153,.3);transition:opacity .2s,transform .2s}
      .btn-primary:hover{opacity:.9;transform:translateY(-1px)}
      .skeleton{background:linear-gradient(90deg,#f3f0ff 25%,#ede9fe 50%,#f3f0ff 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .fade-in{animation:fadeIn .5s ease both}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:768px){#_sidebar{transform:translateX(100%)}#_sidebar.open{transform:translateX(0)}#_topbar{right:0 !important}.page-content{margin-right:0;padding:16px}#_sidebar_toggle{display:block !important}}
    </style>

    <aside id="_sidebar">
      <a href="../../home.html" class="_sidebar-logo">
        <img src="../../assets/icons/logo.jpg" onerror="this.style.display='none'" />
        <span>FitBalance</span>
      </a>
      <div class="_sidebar-user">
        <div class="_avatar">${initials}</div>
        <div>
          <div class="_user-name">${name}</div>
          <div class="_user-role">מדריך/ה</div>
        </div>
      </div>
      <nav>${navHTML}</nav>
      <div class="_sidebar-footer">
        <button id="_logout_btn">
          <i class="fas fa-sign-out-alt" style="width:20px;text-align:center"></i>
          התנתקות
        </button>
      </div>
    </aside>

    <header id="_topbar">
      <button id="_sidebar_toggle"><i class="fas fa-bars"></i></button>
      <div class="_topbar-right">
        <span class="_topbar-greeting">שלום, <strong>${name}</strong></span>
        <div class="_topbar-avatar">${initials}</div>
      </div>
    </header>

    <div id="_sidebar_overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:35"></div>
  `);

  document.getElementById('_logout_btn').addEventListener('click', () => window.authMiddleware.logout());
  const sidebar = document.getElementById('_sidebar');
  const overlay = document.getElementById('_sidebar_overlay');
  document.getElementById('_sidebar_toggle').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.style.display = 'none';
  });
};
