window.attendanceService = {
  async getMyAttendance(userId, limit = 20) {
    const { data, error } = await window._sb.from('session_attendance')
      .select('*, schedule(*, class_types(name, color, emoji))')
      .eq('customer_id', userId)
      .order('attended_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data ?? [];
  },
  async getAttendanceStats(userId) {
    const { data, error } = await window._sb.from('session_attendance')
      .select('attended_at').eq('customer_id', userId);
    if (error) throw error;
    const now = new Date();
    const thisMonth = (data ?? []).filter(r => {
      const d = new Date(r.attended_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: (data ?? []).length, thisMonth };
  },
  async getWeeklySchedule() {
    const { data, error } = await window._sb.from('schedule')
      .select('*, class_types(name, color, emoji), profiles(full_name)')
      .eq('active', true).order('day_of_week').order('start_time');
    if (error) throw error;
    return data ?? [];
  },
  async registerToClass(userId, scheduleId) {
    const { error } = await window._sb.from('registrations')
      .insert({ customer_id: userId, schedule_id: scheduleId });
    if (error) throw error;
  },
  async cancelRegistration(userId, scheduleId) {
    const { error } = await window._sb.from('registrations')
      .delete().eq('customer_id', userId).eq('schedule_id', scheduleId);
    if (error) throw error;
  },
  async getMyRegistrations(userId) {
    const { data, error } = await window._sb.from('registrations')
      .select('schedule_id').eq('customer_id', userId);
    if (error) throw error;
    return new Set((data ?? []).map(r => r.schedule_id));
  },
};
