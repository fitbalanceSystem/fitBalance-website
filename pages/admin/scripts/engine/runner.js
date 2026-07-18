import { logJobStart, logJobEnd, isJobRunning } from './logger.js';
import * as logic from '../logic/index.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'efrathugim@gmail.com';

function buildReportHtml(name, status, durationSec, result, errorMsg) {
  const isSuccess = status === 'success';
  const color = isSuccess ? '#16a34a' : '#dc2626';
  const icon = isSuccess ? '✅' : '❌';
  const statusLabel = isSuccess ? 'הסתיים בהצלחה' : 'נכשל';

  const resultRows = result
    ? Object.entries(result).map(([k, v]) =>
        `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280;">${k}</td>
             <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold;">${v}</td></tr>`
      ).join('')
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:540px;margin:32px auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:${color};padding:28px 32px;">
      <p style="margin:0;font-size:28px;">${icon}</p>
      <h1 style="color:white;margin:8px 0 0;font-size:20px;">Job Report — ${name}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">${statusLabel}</p>
    </div>
    <div style="background:white;padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280;">שם התהליך</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold;">${name}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280;">סטטוס</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold;color:${color};">${statusLabel}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280;">זמן ריצה</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold;">${durationSec} שניות</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#6b7280;">תאריך ושעה</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${new Date().toLocaleString('he-IL')}</td>
        </tr>
        ${resultRows}
      </table>
      ${errorMsg ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
        <p style="margin:0;font-weight:bold;color:#dc2626;">⚠️ שגיאה:</p>
        <pre style="margin:8px 0 0;font-size:13px;color:#7f1d1d;white-space:pre-wrap;">${errorMsg}</pre>
      </div>` : ''}
    </div>
    <div style="background:#f9fafb;padding:12px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">FitPlus Batch Jobs System</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * מריץ job לפי שם — גנרי לחלוטין, לא יודע כלום על הלוגיקה
 */
export async function runJob(job, context = {}) {
  const { name, logic: logicFn } = job;

  // מניעת הרצה כפולה
  if (await isJobRunning(name)) {
    console.warn(`[Runner] Job "${name}" is already running — skipping`);
    return { skipped: true, reason: 'already_running' };
  }

  const runId = await logJobStart(name);
  const startTime = Date.now();
  console.log(`[Runner] Starting job "${name}" (runId: ${runId})`);

  try {
    const fn = logic[logicFn];
    if (typeof fn !== 'function') {
      throw new Error(`Logic function "${logicFn}" not found in logic/index.js`);
    }

    const result = await fn(context);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    await logJobEnd(runId, 'success', result);
    console.log(`[Runner] Job "${name}" completed successfully`, result);

    await resend.emails.send({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject: `✅ Job הסתיים — ${name}`,
      html: buildReportHtml(name, 'success', duration, result, null),
    });

    return { success: true, result };

  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    await logJobEnd(runId, 'failed', null, err.message);
    console.error(`[Runner] Job "${name}" failed:`, err.message);

    await resend.emails.send({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject: `❌ Job נכשל — ${name}`,
      html: buildReportHtml(name, 'failed', duration, null, err.message),
    });

    return { success: false, error: err.message };
  }
}
