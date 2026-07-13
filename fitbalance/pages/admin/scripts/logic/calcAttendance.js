import { db } from '../engine/db.js';

/**
 * חישוב נוכחות יומי — מסכם כל מפגש של היום
 */
export async function calcAttendance(context = {}) {
  const date = context.date || new Date().toISOString().split('T')[0];

  const { data: sessions, error } = await db
    .from('program_sessions')
    .select('id, program_id, programs!inner(name)')
    .eq('date', date)
    .or('status.is.null,status.neq.2');

  if (error) throw new Error(`calcAttendance DB error: ${error.message}`);
  if (!sessions?.length) return { date, sessions: 0, message: 'No sessions today' };

  const sessionIds = sessions.map(s => s.id);
  const { data: att } = await db
    .from('session_attendance')
    .select('session_id, is_present')
    .in('session_id', sessionIds);

  const summary = sessions.map(s => {
    const rows = (att || []).filter(a => a.session_id === s.id);
    return {
      session_id: s.id,
      program: s.programs?.name,
      total: rows.length,
      present: rows.filter(a => a.is_present).length,
    };
  });

  return { date, sessions: sessions.length, summary };
}
