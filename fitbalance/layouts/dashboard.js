/* Injected by dashboard.js – shared page chrome styles */
export const PAGE_SHELL = `
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f8f7ff; }
    .page-content { padding-top: 4rem; margin-right: 0; }
    @media (min-width: 768px) { .page-content { margin-right: 16rem; } }
    .card { background: white; border-radius: 1.25rem; box-shadow: 0 2px 16px rgba(0,0,0,0.06); }
    .gradient-text { background: linear-gradient(135deg,#ec4899,#8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .btn-primary { background: linear-gradient(135deg,#ec4899,#8b5cf6); color:white; border-radius:.75rem; padding:.6rem 1.4rem; font-weight:600; font-size:.9rem; border:none; cursor:pointer; transition:opacity .2s,transform .2s; box-shadow:0 4px 14px rgba(236,72,153,.3); }
    .btn-primary:hover { opacity:.9; transform:translateY(-1px); }
    .btn-outline { border:2px solid #ec4899; color:#ec4899; border-radius:.75rem; padding:.55rem 1.3rem; font-weight:600; font-size:.9rem; background:transparent; cursor:pointer; transition:all .2s; }
    .btn-outline:hover { background:#fdf2f8; }
    .badge { display:inline-flex; align-items:center; gap:.3rem; padding:.25rem .75rem; border-radius:999px; font-size:.75rem; font-weight:600; }
    .fade-in { animation: fadeIn .4s ease both; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    .skeleton { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:.75rem; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  </style>
`;
