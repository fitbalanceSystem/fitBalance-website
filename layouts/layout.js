window.renderLayout = function(activeId) {
  const user = window.storageUtil.load();
  const name = user?.full_name ?? 'לקוחה';
  const initials = window.helpers.getInitials(name);

  const NAV = [
    { id: 'profile',  label: 'פרופיל',         icon: 'fa-user',         href: 'profile.html' },
    { id: 'schedule', label: 'מערכת שעות',      icon: 'fa-calendar-alt', href: 'schedule.html' },
    { id: 'plans',    label: 'תוכניות ונוכחות', icon: 'fa-dumbbell',     href: 'plans.html' },
    { id: 'shop',     label: 'חנות',            icon: 'fa-shopping-bag', href: 'shop.html', badge: true },
  ];

  const navHTML = NAV.map(n => {
    const active = n.id === activeId;
    return `
      <a href="${n.href}" class="_nav-item ${active ? '_nav-active' : ''}" style="position:relative;">
        <span class="_nav-icon"><i class="fas ${n.icon}"></i></span>
        <span>${n.label}</span>
        ${n.badge ? '<span class="_cart-badge" style="display:none;position:absolute;top:6px;left:10px;min-width:18px;height:18px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border-radius:999px;font-size:10px;font-weight:700;align-items:center;justify-content:center;padding:0 4px;">0</span>' : ''}
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

      .page-content{margin-top:64px;margin-right:260px;margin-left:192px;padding:32px 40px;min-height:calc(100vh - 64px);max-width:none;font-size:16px}
      .page-content .max-w-3xl,.page-content .max-w-4xl,.page-content .max-w-5xl{max-width:none !important;width:100%}
      .page-content h1{font-size:1.75rem !important}
      .page-content h2{font-size:1.4rem !important}
      .page-content h3{font-size:1.15rem !important}
      .page-content p,.page-content span,.page-content div,.page-content a,.page-content td,.page-content th,.page-content li{font-size:1rem}
      .page-content .text-xs{font-size:.8rem !important}
      .page-content .text-sm{font-size:.95rem !important}
      .page-content .text-lg{font-size:1.2rem !important}
      .page-content .text-xl{font-size:1.35rem !important}
      .page-content .text-2xl{font-size:1.6rem !important}

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
        .page-content{margin-right:0;margin-left:0;padding:16px}
        #_sidebar_toggle{display:block !important}
        #_hh_panel{display:none}
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

  document.getElementById('_logout_btn').addEventListener('click', () => window.authMiddleware?.logout());
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

  // עדכון badge עגלה
  if (window.cartService && user?.id) window.cartService.init(user.id);

  // באנר היפ הופ
  document.body.insertAdjacentHTML('beforeend', `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap');
      @keyframes _hhBg{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes _hhFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
      @keyframes _hhPulse{0%,100%{box-shadow:0 0 0 0 rgba(236,72,153,.6)}70%{box-shadow:0 0 0 10px rgba(236,72,153,0)}}
      @keyframes _hhStar{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
      @keyframes _hhSlideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
      @keyframes _hhGlow{0%,100%{text-shadow:0 0 10px rgba(249,168,212,.4)}50%{text-shadow:0 0 20px rgba(249,168,212,.9),0 0 40px rgba(139,92,246,.4)}}

      #_hh_panel{
        position:fixed;left:0;top:64px;bottom:0;width:192px;z-index:28;
        background:linear-gradient(160deg,#2d0a3a 0%,#1a0a3a 40%,#3a0a2a 70%,#1e0a4a 100%);
        background-size:400% 400%;animation:_hhBg 8s ease infinite;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:14px;padding:28px 16px;text-align:center;
        box-shadow:4px 0 40px rgba(139,92,246,.25),inset -1px 0 0 rgba(255,255,255,.05);
        animation:_hhBg 8s ease infinite,_hhSlideIn .5s ease both;
        overflow:hidden;
      }
      #_hh_panel::before{
        content:'';position:absolute;inset:0;
        background:radial-gradient(ellipse at 50% 0%,rgba(236,72,153,.15) 0%,transparent 70%),
                   radial-gradient(ellipse at 50% 100%,rgba(139,92,246,.15) 0%,transparent 70%);
        pointer-events:none;
      }
      #_hh_panel .hh-stars{
        position:absolute;inset:0;pointer-events:none;overflow:hidden;
      }
      #_hh_panel .hh-star{
        position:absolute;width:3px;height:3px;border-radius:50%;background:white;
        animation:_hhStar 2s ease-in-out infinite;
      }
      #_hh_panel .hh-live{
        display:flex;align-items:center;gap:6px;
        background:rgba(236,72,153,.2);border:1px solid rgba(236,72,153,.4);
        padding:4px 10px;border-radius:999px;
      }
      #_hh_panel .hh-live-dot{
        width:7px;height:7px;border-radius:50%;background:#ec4899;
        animation:_hhPulse 1.5s ease-in-out infinite;
      }
      #_hh_panel{font-family:'Heebo',sans-serif}
      #_hh_panel .hh-live-text{font-size:10px;font-weight:700;color:#fda4af;letter-spacing:.5px}
      #_hh_panel .hh-emoji{
        font-size:52px;animation:_hhFloat 3.5s ease-in-out infinite;
        filter:drop-shadow(0 4px 12px rgba(236,72,153,.5));
        position:relative;z-index:1;
      }
      #_hh_panel .hh-title{
        color:white;font-size:20px;font-weight:900;line-height:1.25;
        animation:_hhGlow 3s ease-in-out infinite;
        position:relative;z-index:1;
        letter-spacing:.5px;
      }
      #_hh_panel .hh-divider{
        width:50px;height:2px;border-radius:999px;
        background:linear-gradient(90deg,transparent,#ec4899,#8b5cf6,transparent);
        position:relative;z-index:1;
      }
      #_hh_panel .hh-sub{
        color:rgba(253,164,175,.85);font-size:11.5px;font-weight:600;line-height:1.6;
        position:relative;z-index:1;
      }
      #_hh_panel .hh-sub strong{color:white}
      #_hh_panel .hh-cta{
        display:flex;align-items:center;justify-content:center;gap:6px;width:100%;
        background:linear-gradient(135deg,#ec4899,#a855f7);
        color:white;font-size:13px;font-weight:800;
        padding:13px 8px;border-radius:16px;
        text-decoration:none;
        box-shadow:0 6px 20px rgba(236,72,153,.5),0 2px 8px rgba(0,0,0,.3);
        transition:transform .25s,box-shadow .25s;
        position:relative;z-index:1;
        border:1px solid rgba(255,255,255,.2);
      }
      #_hh_panel .hh-cta:hover{
        transform:translateY(-2px) scale(1.03);
        box-shadow:0 10px 28px rgba(236,72,153,.7),0 4px 12px rgba(0,0,0,.3);
      }
      #_hh_panel .hh-cta2{
        display:flex;align-items:center;justify-content:center;gap:5px;width:100%;
        background:rgba(255,255,255,.07);
        border:1px solid rgba(255,255,255,.18);
        color:rgba(255,255,255,.8);font-size:12px;font-weight:600;
        padding:10px 8px;border-radius:14px;
        text-decoration:none;
        transition:background .2s,color .2s,transform .2s;
        position:relative;z-index:1;
        backdrop-filter:blur(4px);
      }
      #_hh_panel .hh-cta2:hover{background:rgba(255,255,255,.15);color:white;transform:translateY(-1px)}
    </style>
    <div id="_hh_panel">
      <div class="hh-stars">
        <div class="hh-star" style="top:10%;left:15%;animation-delay:0s"></div>
        <div class="hh-star" style="top:20%;left:75%;animation-delay:.4s"></div>
        <div class="hh-star" style="top:35%;left:30%;animation-delay:.8s"></div>
        <div class="hh-star" style="top:55%;left:80%;animation-delay:.3s"></div>
        <div class="hh-star" style="top:70%;left:20%;animation-delay:1s"></div>
        <div class="hh-star" style="top:85%;left:60%;animation-delay:.6s"></div>
        <div class="hh-star" style="top:90%;left:40%;animation-delay:1.2s"></div>
      </div>
      <div class="hh-live">
        <div class="hh-live-dot"></div>
        <span class="hh-live-text">הרשמה פתוחה</span>
      </div>
      <div class="hh-emoji">💃</div>
      <div class="hh-title">חוגי<br>היפ הופ</div>
      <div class="hh-divider"></div>
      <div class="hh-sub">לבנות ונשים<br><strong>שנת תשפ"ו</strong> ✨<br>מקומות מוגבלים!</div>
      <a class="hh-cta" href="../../hip-hop.html" target="_blank">🎀 השאירי פרטים</a>
      <a class="hh-cta2" href="../../hip-hop.html" target="_blank">לפרטים נוספים ←</a>
    </div>
  `);
};

window.renderPublicShopLayout = function() {
  const user = window.storageUtil?.load();
  const isLoggedIn = !!user;

  document.body.insertAdjacentHTML('afterbegin', `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;background:#f8f7ff;direction:rtl}
      #_pub-topbar{
        position:fixed;top:0;right:0;left:0;height:64px;
        background:white;z-index:30;
        display:flex;align-items:center;justify-content:space-between;
        padding:0 24px;
        border-bottom:1px solid #ede9fe;
        box-shadow:0 1px 12px rgba(139,92,246,.07);
      }
      #_pub-topbar a{text-decoration:none}
      ._pub-logo{display:flex;align-items:center;gap:10px}
      ._pub-logo img{height:36px;border-radius:8px}
      ._pub-logo span{font-size:18px;font-weight:800;background:linear-gradient(135deg,#ec4899,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      ._pub-actions{display:flex;align-items:center;gap:10px}
      ._pub-login-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;font-size:13px;font-weight:600;border:none;cursor:pointer;text-decoration:none}
      ._pub-user-chip{display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:10px;background:#f3f0ff;font-size:13px;font-weight:600;color:#7c3aed}
      .page-content{margin-top:64px;padding:0;min-height:calc(100vh - 64px)}
      .card{background:white;border-radius:16px;box-shadow:0 2px 16px rgba(139,92,246,.07);border:1px solid #f3f0ff}
      .gradient-text{background:linear-gradient(135deg,#ec4899,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .btn-primary{padding:.65rem 1.4rem;border:none;cursor:pointer;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;font-size:.9rem;font-weight:600;border-radius:10px;box-shadow:0 4px 14px rgba(236,72,153,.3);transition:opacity .2s,transform .2s}
      .btn-primary:hover{opacity:.9;transform:translateY(-1px)}
      .skeleton{background:linear-gradient(90deg,#f3f0ff 25%,#ede9fe 50%,#f3f0ff 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .fade-in{animation:fadeIn .5s ease both}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .qty-btn{width:28px;height:28px;border-radius:50%;border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700;transition:all .15s}
      .qty-btn:hover{border-color:#ec4899;color:#ec4899}
    </style>
    <header id="_pub-topbar">
      <a href="../../home.html" class="_pub-logo">
        <img src="../../assets/icons/logo.jpg" onerror="this.style.display='none'" />
        <span>FitBalance</span>
      </a>
      <div class="_pub-actions">
        ${isLoggedIn
          ? `<div class="_pub-user-chip"><i class="fas fa-user"></i> ${user.firstName ?? user.full_name ?? 'לקוחה'}</div>
             <a href="../../pages/customer/profile.html" class="_pub-login-btn"><i class="fas fa-th-large"></i> אזור אישי</a>`
          : `<a href="../../login.html" class="_pub-login-btn"><i class="fas fa-sign-in-alt"></i> כניסה לאזור אישי</a>`
        }
      </div>
    </header>
  `);

  if (window.cartService && user?.id) window.cartService.init(user.id);
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

  document.getElementById('_logout_btn').addEventListener('click', () => window.authMiddleware?.logout());
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
