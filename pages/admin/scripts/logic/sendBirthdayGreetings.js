import { Resend } from 'resend';
import { db } from '../engine/db.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'efrathugim@gmail.com';

function buildBirthdayHtml(customer) {
  const firstName = customer.firstName || 'חברה יקרה';
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(236,72,153,0.15);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ec4899,#8b5cf6);padding:40px 32px;text-align:center;">
      <div style="font-size:64px;margin-bottom:8px;">🎂</div>
      <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">יום הולדת שמח!</h1>
      <p style="color:#fce7f3;margin:8px 0 0;font-size:16px;">מ-FitPlus עם אהבה 💕</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;text-align:right;">
      <p style="font-size:20px;color:#1f2937;margin:0 0 16px;">שלום <strong style="color:#ec4899;">${firstName}</strong> 🌸</p>

      <p style="font-size:15px;color:#4b5563;line-height:1.8;margin:0 0 24px;">
        היום הוא יום מיוחד — <strong>יום ההולדת שלך!</strong><br>
        כל המשפחה של FitPlus שולחת לך חיבוק גדול ומאחלת לך
        שנה מלאה בבריאות, שמחה, אנרגיה וכוח 💪✨
      </p>

      <!-- Balloon decoration -->
      <div style="background:linear-gradient(135deg,#fdf2f8,#ede9fe);border-radius:16px;padding:24px;text-align:center;margin:0 0 28px;">
        <div style="font-size:40px;margin-bottom:8px;">🎈🎉🎈</div>
        <p style="margin:0;font-size:16px;color:#7c3aed;font-weight:bold;">
          תמשיכי לזרוח ולהיות השראה לכולנו!
        </p>
      </div>

      <p style="font-size:14px;color:#9ca3af;text-align:center;margin:0;">
        באהבה,<br>
        <strong style="color:#ec4899;">צוות FitPlus 🌺</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#fdf2f8;padding:16px 32px;text-align:center;border-top:1px solid #fce7f3;">
      <p style="margin:0;font-size:12px;color:#d1d5db;">FitPlus — מועדון כושר לנשים</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * שולח מייל מזל טוב ללקוחות שנולדו היום
 */
export async function sendBirthdayGreetings() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  // שליפת לקוחות שיום ולחודש הלידה שלהם תואמים להיום
  const { data: customers, error } = await db
    .from('customers')
    .select('id, firstName, lastName, email, birthDate')
    .not('email', 'is', null)
    .not('birthDate', 'is', null);

  if (error) throw new Error(`sendBirthdayGreetings DB error: ${error.message}`);

  const todayBirthdays = (customers || []).filter(c => {
    if (!c.birthDate) return false;
    const [, cMm, cDd] = c.birthDate.split('-');
    return cMm === mm && cDd === dd;
  });

  let sent = 0, failed = 0;

  for (const customer of todayBirthdays) {
    const { error: mailErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customer.email,
      subject: `🎂 יום הולדת שמח ${customer.firstName}! מ-FitPlus`,
      html: buildBirthdayHtml(customer),
    });

    await db.from('job_runs_log').insert({
      job_name: 'birthday-greetings',
      reference_id: customer.id,
      reference_name: `${customer.firstName} ${customer.lastName}`,
      status: mailErr ? 'failed' : 'success',
      error_message: mailErr?.message || null,
      ran_at: new Date().toISOString(),
    }).catch(() => {}); // לא קריטי אם הטבלה לא קיימת

    mailErr ? failed++ : sent++;
  }

  return { date: `${mm}-${dd}`, total: todayBirthdays.length, sent, failed };
}
