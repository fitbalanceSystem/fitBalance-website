import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'efrathugim@gmail.com';
const FROM_EMAIL = 'efrathugim@gmail.com';

// חישוב חודש קודם
function getPrevMonth() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  const mm = String(m).padStart(2, '0');
  return {
    label: `${y}-${mm}`,
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${new Date(y, m, 0).getDate()}`,
  };
}

function buildEmailHtml(instructor, sessions, rate, month) {
  const total = sessions.length * rate;
  const rows = sessions.map(s => `
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.date}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${s.programs?.name || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${(s.time || '').slice(0, 5)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${s.present} / ${s.total}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;color:#16a34a;font-weight:bold;">${rate} ₪</td>
    </tr>`).join('');

  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#ec4899;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:22px;">FitPlus 💪</h1>
        <p style="color:#fce7f3;margin:4px 0 0;">סיכום נוכחות חודשי</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
        <p style="font-size:16px;">שלום <strong>${instructor.firstName} ${instructor.lastName}</strong>,</p>
        <p>להלן סיכום המפגשים שלך לחודש <strong>${month}</strong>:</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">תאריך</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">תוכנית</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">שעה</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">נוכחות</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">שכר</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f0fdf4;font-weight:bold;">
              <td colspan="4" style="padding:8px;border:1px solid #e5e7eb;">סה"כ — ${sessions.length} מפגשים</td>
              <td style="padding:8px;border:1px solid #e5e7eb;color:#16a34a;">${total.toLocaleString()} ₪</td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-top:16px;">
          <p style="margin:0;font-weight:bold;">📄 נא לשלוח חשבונית על סך <span style="color:#d97706;">${total.toLocaleString()} ₪</span></p>
          <p style="margin:4px 0 0;font-size:13px;color:#92400e;">אנא שלחי את החשבונית לכתובת: ${ADMIN_EMAIL}</p>
        </div>
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;font-size:12px;color:#9ca3af;">
        FitPlus — נשלח אוטומטית
      </div>
    </div>`;
}

async function runSalarySummary() {
  const { from, to, label } = getPrevMonth();
  console.log(`מריץ סיכום שכר לחודש ${label}...`);

  // שליפת כל המדריכות הפעילות
  const { data: instructors, error: instErr } = await db
    .from('instructors')
    .select('id, firstName, lastName, email, salary_per_session')
    .eq('is_active', true);

  if (instErr) throw instErr;

  let sent = 0, skipped = 0;

  for (const inst of instructors) {
    if (!inst.email) { skipped++; continue; }
    const rate = inst.salary_per_session || 0;

    // שליפת מפגשים לפי instructor_code
    const { data: sessions } = await db
      .from('program_sessions')
      .select('id, date, time, programs!inner(name)')
      .eq('instructor_code', inst.id)
      .gte('date', from)
      .lte('date', to)
      .or('status.is.null,status.neq.2')
      .order('date');

    if (!sessions?.length) { skipped++; continue; }

    // שליפת נוכחות לכל מפגש
    const sessionIds = sessions.map(s => s.id);
    const { data: att } = await db
      .from('session_attendance')
      .select('session_id, is_present')
      .in('session_id', sessionIds);

    const attMap = {};
    (att || []).forEach(a => {
      if (!attMap[a.session_id]) attMap[a.session_id] = { present: 0, total: 0 };
      attMap[a.session_id].total++;
      if (a.is_present) attMap[a.session_id].present++;
    });

    const enriched = sessions.map(s => ({
      ...s,
      present: attMap[s.id]?.present || 0,
      total: attMap[s.id]?.total || 0,
    }));

    // שליחת מייל
    const { error: mailErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: inst.email,
      subject: `סיכום נוכחות ${label} — FitPlus`,
      html: buildEmailHtml(inst, enriched, rate, label),
    });

    if (mailErr) {
      console.error(`שגיאה בשליחה ל-${inst.email}:`, mailErr);
    } else {
      console.log(`✅ נשלח ל-${inst.firstName} ${inst.lastName} (${inst.email})`);
      sent++;
    }

    // רישום ב-automation_logs
    await db.from('automation_logs').insert({
      automation_type: 'salary_summary',
      month: label,
      instructor_id: inst.id,
      sessions_count: sessions.length,
      total_amount: sessions.length * rate,
      status: mailErr ? 'error' : 'sent',
      error_message: mailErr?.message || null,
    });
  }

  console.log(`\nסיכום: ${sent} נשלחו, ${skipped} דולגו`);
}

runSalarySummary().catch(err => {
  console.error('שגיאה כללית:', err);
  process.exit(1);
});
