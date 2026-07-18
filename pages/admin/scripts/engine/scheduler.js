import cron from 'node-cron';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runJob } from './runner.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dir, '../jobs.config.json'), 'utf8'));

export function startScheduler() {
  const autoJobs = config.jobs.filter(j => j.type === 'auto' && j.enabled);

  if (!autoJobs.length) {
    console.log('[Scheduler] No auto jobs to schedule');
    return;
  }

  autoJobs.forEach(job => {
    if (!cron.validate(job.schedule)) {
      console.error(`[Scheduler] Invalid cron expression for job "${job.name}": ${job.schedule}`);
      return;
    }

    cron.schedule(job.schedule, async () => {
      console.log(`[Scheduler] Triggering scheduled job "${job.name}"`);
      await runJob(job);
    }, { timezone: 'Asia/Jerusalem' });

    console.log(`[Scheduler] Scheduled "${job.name}" → ${job.schedule}`);
  });

  console.log(`[Scheduler] ${autoJobs.length} jobs scheduled`);
}
