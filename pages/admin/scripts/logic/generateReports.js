import { db } from '../engine/db.js';

function getPrevMonth() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  const mm = String(m).padStart(2, '0');
  return { label: `${y}-${mm}`, from: `${y}-${mm}-01`, to: `${y}-${mm}-${new Date(y, m, 0).getDate()}` };
}

/**
 * יצירת דוחות חודשיים — מסכם הכנסות, נוכחות ושכר
 */
export async function generateReports(context = {}) {
  const month = context.month || getPrevMonth().label;
  const [y, m] = month.split('-');
  const from = `${y}-${m}-01`;
  const to = `${y}-${m}-${new Date(y, m, 0).getDate()}`;

  const [
    { data: payments },
    { data: sessions },
    { data: attendance },
  ] = await Promise.all([
    db.from('payments').select('amount, method').gte('payment_date', from).lte('payment_date', to),
    db.from('program_sessions').select('id, instructor_code').gte('date', from).lte('date', to).or('status.is.null,status.neq.2'),
    db.from('session_attendance').select('is_present'),
  ]);

  const totalIncome = (payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const totalSessions = sessions?.length || 0;
  const totalPresent = (attendance || []).filter(a => a.is_present).length;
  const totalAttendance = attendance?.length || 0;
  const avgAttendancePct = totalAttendance ? Math.round(totalPresent / totalAttendance * 100) : 0;

  const report = { month, totalIncome, totalSessions, avgAttendancePct, generatedAt: new Date().toISOString() };

  // שמירת הדוח ב-DB
  await db.from('monthly_reports').upsert(report, { onConflict: 'month' });

  return report;
}
