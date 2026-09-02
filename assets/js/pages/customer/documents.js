(async () => {
  const authUser = await window.authMiddleware.requireAuth();
  if (!authUser) return;
  window.renderLayout('documents');

  const user = window.storageUtil.load();
  if (!user) return;

  const list  = document.getElementById('docs-list');
  const modal = document.getElementById('pdf-modal');
  const frame = document.getElementById('pdf-frame');
  const modalTitle = document.getElementById('modal-title');

  document.getElementById('modal-close').addEventListener('click', () => {
    modal.style.display = 'none';
    frame.src = '';
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) { modal.style.display = 'none'; frame.src = ''; }
  });

  async function openPdf(pdfPath, formName) {
    try {
      const url = await window.pdfService.getSignedUrlForCustomer(pdfPath);
      modalTitle.textContent = formName || 'מסמך';
      frame.src = url;
      modal.style.display = 'flex';
    } catch (e) {
      alert('לא ניתן לטעון את המסמך: ' + e.message);
    }
  }

  try {
    const forms = await window.formsService.getCustomerForms(user.id);
    const signed = forms.filter(f => f.status === 'signed');

    if (!signed.length) {
      list.innerHTML = '<p style="text-align:center;color:#9ca3af;font-size:13px;padding:32px 0">אין מסמכים חתומים עדיין</p>';
      return;
    }

    list.innerHTML = signed.map(f => {
      const name     = f.digital_forms?.name || 'טופס';
      const signedAt = f.signed_at ? window.fmt.date(f.signed_at) : '—';
      const year     = f.activity_year ? `${f.activity_year}-${f.activity_year + 1}` : '';
      return `
        <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;background:#faf9ff;border:1px solid #f3f0ff">
          <span style="font-size:28px;flex-shrink:0">📄</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:#1f2937">${name}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">
              נחתם: ${signedAt}${year ? ' · שנה: ' + year : ''}
            </div>
          </div>
          ${f.pdf_url
            ? `<button data-path="${f.pdf_url}" data-name="${name}"
                 style="display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;font-size:12px;font-weight:700;font-family:inherit;flex-shrink:0">
                 <i class="fas fa-eye"></i> צפייה
               </button>`
            : `<span style="font-size:11px;color:#d1d5db">PDF לא זמין</span>`
          }
        </div>`;
    }).join('');

    list.querySelectorAll('button[data-path]').forEach(btn => {
      btn.addEventListener('click', () => openPdf(btn.dataset.path, btn.dataset.name));
    });

  } catch (err) {
    console.error('documents load error:', err);
    list.innerHTML = '<p style="text-align:center;color:#ef4444;font-size:13px;padding:32px 0">שגיאה בטעינת המסמכים</p>';
  }
})();
