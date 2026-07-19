import { Resend } from 'resend';
import { db } from '../engine/db.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'efrathugim@gmail.com';

function buildBirthdayHtml(firstName) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(236,72,153,0.15);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ec4899,#8b5cf6);padding:40px 32px;text-align:center;">
      <div style="font-size:64px;margin-bottom:8px;">🎂</div>
      <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">יום הולדת שמח!</h1>
      <p style="color:#fce7f3;margin:8px 0 0;font-size:16px;">Happy Birthday 🎉</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;text-align:right;">
      <p style="font-size:20px;color:#1f2937;margin:0 0 16px;">שלום <strong style="color:#ec4899;">${firstName}</strong> 💕</p>

      <p style="font-size:16px;color:#4b5563;line-height:1.8;margin:0 0 20px;">
        כל הצוות שלנו ב-<strong>FitPlus</strong> שולח לך ברכות חמות ביום הולדתך! 🌸<br>
        מאחלים לך שנה מלאה בבריאות, שמחה, ואנרגיה אין-סופית!
      </p>

      <!-- Decorative box -->
      <div style="background:linear-gradient(135deg,#fdf2f8,#ede9fe);border-radius:12px;padding:20px 24px;margin:24px 0;border-right:4px solid #ec4899;">
        <p style="margin:0;font-size:15px;color:#6b21a8;font-weight:bold;">🎁 מתנה קטנה ממנו</p>
        <p style="margin:8px 0 0;font-size:14px;color:#7c3aed;line-height:1.7;">
          בתור מתנת יום הולדת — השיעור הבא שלך הוא עלינו! 🏋️‍♀️<br>
          <span style="font-size:12px;color:#9ca3af;">(ניצור איתך קשר לתיאום)</span>
        </p>
      </div>

      <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0;">
        תמשיכי להיות הכוכבת שאת! ✨<br>
        באהבה, <strong>צוות FitPlus</strong> 💪
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">FitPlus — מועדון כושר לנשים 🌸</p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * שולח מייל מזל טוב ללקוחות שנולדו היום
 */
export async function sendBirthdayEmails() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayMD = `${mm}-${dd}`;

  // שולפים לקוחות עם אימייל ותאריך לידה
  const { data: customers, error } = await db
    .from('customers')
    .select('id, firstName, email, birthDate')
    .not('email', 'is', null)
    .not('birthDate', 'is', null);

  if (error) throw new Error(`sendBirthdayEmails DB error: ${error.message}`);

  // מסננים לפי MM-DD
  const birthdays = (customers || []).filter(c => {
    const bd = c.birthDate?.slice(5, 10); // YYYY-MM-DD → MM-DD
    return bd === todayMD;
  });

  if (!birthdays.length) {
    console.log(`[Birthday] No birthdays today (${todayMD})`);
    return { sent: 0, skipped: 0, date: todayMD };
  }

  let sent = 0, skipped = 0;

  for (const customer of birthdays) {
    const { error: mailErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customer.email,
      subject: `🎂 יום הולדת שמח ${customer.firstName}! מ-FitPlus`,
      html: buildBirthdayHtml(customer.firstName),
    });

    await db.from('job_runs_log').insert({
      job_name: 'birthday-emails',
      reference_id: customer.id,
      status: mailErr ? 'failed' : 'sent',
      error_message: mailErr?.message || null,
      created_at: new Date().toISOString(),
    }).catch(() => {}); // לא קריטי אם הטבלה לא קיימת

    mailErr ? skipped++ : sent++;
    console.log(`[Birthday] ${mailErr ? '✗' : '✓'} ${customer.firstName} <${customer.email}>`);
  }

  return { sent, skipped, date: todayMD, total: birthdays.length };
}
