import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runJob } from './runner.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dir, '../jobs.config.json'), 'utf8'));

/**
 * מריץ job ידני לפי שם
 * @param {string} jobName
 * @param {object} context - פרמטרים נוספים (לדוגמא: { month: '2025-06' })
 */
export async function triggerManual(jobName, context = {}) {
  const job = config.jobs.find(j => j.name === jobName);

  if (!job) {
    throw new Error(`Job "${jobName}" not found in config`);
  }
  if (!job.enabled) {
    throw new Error(`Job "${jobName}" is disabled`);
  }
  if (job.type !== 'manual') {
    throw new Error(`Job "${jobName}" is type "${job.type}" — use scheduler for auto jobs`);
  }

  console.log(`[Manual] Triggering job "${jobName}"`);
  return await runJob(job, context);
}

// הרצה ישירה מ-CLI: node manual.js monthly-salary '{"month":"2025-06"}'
if (process.argv[2]) {
  const jobName = process.argv[2];
  const context = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  triggerManual(jobName, context)
    .then(r => { console.log('Result:', r); process.exit(0); })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}
