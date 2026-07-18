window.attendanceService = {
  async getMyAttendance(userId, limit = 20) {
    const { data, error } = await window._sb.from('session_attendance')
      .select('*, program_sessions(date, time, programs(name))')
      .eq('customer_id', userId)
      .eq('is_present', 1)
    if (error) throw error;
    return (data ?? []).map(r => ({
      ...r,
      attended_at: r.program_sessions?.date ?? null,
      attended_time: r.program_sessions?.time ? r.program_sessions.time.slice(0,5) : null,
      schedule: {
        class_types: {
          name: r.program_sessions?.programs?.name ?? 'שיעור',
          emoji: '🏃',
          color: '#ec4899',
        },
      },
    }))
    .sort((a, b) => (b.attended_at ?? '').localeCompare(a.attended_at ?? ''))
    .slice(0, limit);
  },

  async getAttendanceStats(userId) {
    const { data, error } = await window._sb.from('session_attendance')
      .select('session_id, is_present, program_sessions(date)')
      .eq('customer_id', userId)
      .eq('is_present', 1);
    if (error) throw error;
    const now = new Date();
    const thisMonth = (data ?? []).filter(r => {
      const d = new Date(r.program_sessions?.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: (data ?? []).length, thisMonth };
  },

  async getWeeklySchedule() {
    const { data, error } = await window._sb.from('programs')
      .select('id, name, day, time, type_code')
      .order('day').order('time');
    if (error) throw error;
    return data ?? [];
  },

  async registerToClass(userId, scheduleId) {
    const { error } = await window._sb.from('trial_sessions')
      .insert({ customer_id: userId, session_id: scheduleId });
    if (error) throw error;
  },

  async registerMultiple(userId, sessionIds) {
    // מסנן שיעורים שכבר רשומה אליהם
    const existing = await this.getMyRegistrations(userId);
    const toInsert = sessionIds
      .filter(id => !existing.has(id))
      .map(id => ({ customer_id: userId, session_id: id }));
    if (!toInsert.length) return 0;
    const { error } = await window._sb.from('trial_sessions').insert(toInsert);
    if (error) throw error;
    return toInsert.length;
  },

  async cancelRegistration(userId, scheduleId) {
    const { error } = await window._sb.from('trial_sessions')
      .delete().eq('customer_id', userId).eq('session_id', scheduleId);
    if (error) throw error;
  },

  async getMyRegistrations(userId) {
    const { data, error } = await window._sb.from('trial_sessions')
      .select('session_id').eq('customer_id', userId);
    if (error) throw error;
    return new Set((data ?? []).map(r => r.session_id));
  },
};
