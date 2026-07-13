import { db } from './db.js';

export async function logJobStart(jobName) {
  const { data, error } = await db
    .from('job_runs')
    .insert({ job_name: jobName, status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single();

  if (error) throw new Error(`Logger error: ${error.message}`);
  return data.id;
}

export async function logJobEnd(runId, status, result = null, errorMsg = null) {
  await db.from('job_runs').update({
    status,
    finished_at: new Date().toISOString(),
    result: result ? JSON.stringify(result) : null,
    error_message: errorMsg,
  }).eq('id', runId);
}

export async function isJobRunning(jobName) {
  const { data } = await db
    .from('job_runs')
    .select('id')
    .eq('job_name', jobName)
    .eq('status', 'running')
    .limit(1);
  return data?.length > 0;
}
