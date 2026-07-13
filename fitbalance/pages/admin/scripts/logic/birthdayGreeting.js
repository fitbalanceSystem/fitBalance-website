import { Resend } from 'resend';
import { db } from '../engine/db.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'efrathugim@gmail.com';

function buildBirthdayHtml(firstName) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(236,72,153,0.15);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ec4899,#a855f7);padding:48px 32px;text-align:center;">
      <div style="font-size:64px;margin-bottom:12px;">🎂</div>
      <h1 style="color:white;margin:0;font-size:32px;letter-spacing:1px;">יום הולדת שמח!</h1>
      <p style="color:#fce7f3;margin:8px 0 0;font-size:16px;">Happy Birthday</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:40px 32px;text-align:center;">
      <p style="font-size:20px;color:#374151;margin:0 0 16px;">
        שלום <strong style="color:#ec4899;">${firstName}</strong> היקרה 💕
      </p>
      <p style="font-size:16px;color:#6b7280;line-height:1.8;margin:0 0 24px;">
        כל הצוות שלנו ב-<strong>FitPlus</strong> מאחל לך<br>
        יום הולדת מלא שמחה, בריאות ואנרגיה!<br>
        שהשנה הבאה תביא לך הרבה הצלחות ורגעים מאושרים 🌟
      </p>

      <!-- Divider -->
      <div style="width:60px;height:4px;background:linear-gradient(90deg,#ec4899,#a855f7);border-radius:2px;margin:0 auto 24px;"></div>

      <!-- Gift badge -->
      <div style="background:linear-gradient(135deg,#fdf2f8,#f5f3ff);border:2px dashed #f9a8d4;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#9333ea;font-weight:bold;">🎁 מתנה קטנה ממנו</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">בואי לאמן איתנו ותקבלי חיוך גדול! 😊</p>
      </div>

      <p style="font-size:14px;color:#9ca3af;margin:0;">
        באהבה,<br>
        <strong style="color:#ec4899;">צוות FitPlus 💪</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#fdf2f8;padding:16px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#d1d5db;">
        קיבלת מייל זה כי את חלק ממשפחת FitPlus 🌸
      </p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * שולח מייל מזל טוב ללקוחות שנולדו היום
 */
export async function birthdayGreeting() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  // שליפת לקוחות שתאריך הלידה שלהם מסתיים ב-MM-DD של היום
  const { data: customers, error } = await db
    .from('customers')
    .select('id, firstName, email, birthDate')
    .not('email', 'is', null)
    .not('birthDate', 'is', null);

  if (error) throw new Error(`birthdayGreeting DB error: ${error.message}`);

  const todayBirthdays = (customers || []).filter(c => {
    const bd = c.birthDate?.slice(5, 10); // MM-DD
    return bd === `${mm}-${dd}`;
  });

  if (!todayBirthdays.length) {
    console.log('[Birthday] No birthdays today');
    return { sent: 0, skipped: 0, failed: 0 };
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const customer of todayBirthdays) {
    if (!customer.email) { skipped++; continue; }

    const { error: mailErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customer.email,
      subject: `🎂 יום הולדת שמח ${customer.firstName}! מ-FitPlus`,
      html: buildBirthdayHtml(customer.firstName),
    });

    await db.from('job_runs_log').insert({
      job_name: 'birthday-greeting',
      reference_id: customer.id,
      status: mailErr ? 'failed' : 'success',
      note: mailErr?.message || `נשלח ל-${customer.email}`,
      created_at: new Date().toISOString(),
    }).maybeSingle();

    mailErr ? failed++ : sent++;
    console.log(`[Birthday] ${mailErr ? '✗' : '✓'} ${customer.firstName} <${customer.email}>`);
  }

  return { date: `${mm}-${dd}`, total: todayBirthdays.length, sent, skipped, failed };
}
