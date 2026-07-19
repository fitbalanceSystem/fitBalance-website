async function savePrograms() {
  try {
    methods.showLoader();

    const rows = document.querySelectorAll('#classesBody tr');
    if (!rows.length) {
      Swal.fire('אין תוכניות', 'לא נמצאו תוכניות לשמירה.', 'info');
      methods.hideLoader();
      return;
    }

    // ===== 1️⃣ קריאה מהטבלה =====
    const programsToSave = [];
    const errors = [];

    rows.forEach(row => {
      console.log("row");
      console.log(row);
      console.log("row.dataset.code");
      console.log(row.dataset.code);
      const programId = parseInt(row.dataset.code, 10);
      const enrollmentId = parseInt(row.dataset.enrollmentId, 10) || undefined;
      const startDate = row.querySelector('.start-date').value;
      const endDate = row.querySelector('.end-date').value;

      if (!programId || !startDate || !endDate) return;

      if (new Date(startDate) > new Date(endDate)) {
        errors.push(`תוכנית ${programId}: תאריך התחלה גדול מתאריך סיום`);
        return;
      }

      const obj = { customer_id: idCustomer, program_id: programId, start_date: startDate, end_date: endDate };
      if (enrollmentId) obj.id = enrollmentId;
      programsToSave.push(obj);
    });

    console.log("programsToSave");
    console.log(programsToSave);
    if (errors.length) {
      Swal.fire('שגיאות בתאריכים', errors.join('<br>'), 'error');
      methods.hideLoader();
      return;
    }

    // ===== 2️⃣ בדיקה מול תוכניות מקור =====
    const { data: programsMeta, error: metaError } = await supabase.from('programs').select('id, start_date, end_date');
    if (metaError) throw metaError;

    const metaMap = new Map(programsMeta.map(p => [p.id, p]));
    const metaErrors = [];

    programsToSave.forEach(p => {
      const meta = metaMap.get(p.program_id);
      if (!meta) return;
      if (new Date(p.start_date) < new Date(meta.start_date)) metaErrors.push(`תוכנית ${p.program_id}: תאריך התחלה קטן מהתחלת התוכנית`);
      if (new Date(p.end_date) > new Date(meta.end_date)) metaErrors.push(`תוכנית ${p.program_id}: תאריך סיום גדול מסיום התוכנית`);
    });

    if (metaErrors.length) {
      Swal.fire('שגיאת תאריכים מול תוכניות', metaErrors.join('<br>'), 'error');
      methods.hideLoader();
      return;
    }

    // ===== 3️⃣ זיהוי שינויים =====
    const added = programsToSave.filter(p => !allProgram.some(a => a.program_id === p.program_id));
    const updated = programsToSave.filter(p => {
      const old = allProgram.find(a => a.program_id === p.program_id);
      if (!old) return false;
      const oldStart = old.start_date?.split('T')[0];
      const oldEnd = old.end_date?.split('T')[0];
      return oldStart !== p.start_date || oldEnd !== p.end_date;
    });
console.log("added");
console.log(added);
console.log("updated");
console.log(updated);
    if (added.length === 0 && updated.length === 0) {
      Swal.fire('אין שינויים', 'לא בוצעו שינויים בתוכניות.', 'info');
      methods.hideLoader();
      return;
    }

    const allChanges = [...added, ...updated];
    console.log("allChanges");
console.log(allChanges);
    // ===== 4️⃣ שמירה ב-DB: program_enrollments =====
    const { error: enrollError } = await supabase
      .from('program_enrollments')
      .upsert(allChanges, { onConflict: ['customer_id', 'program_id', 'start_date'] });
    if (enrollError) throw enrollError;

    // ===== 5️⃣ סנכרון נוכחות =====
    function chunkArray(arr, size) {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    }

    for (const p of allChanges) {
      // 5.1 שליפת כל המפגשים של התוכנית בטווח החדש
      const { data: sessions, error: sessErr } = await supabase
        .from('program_sessions')
        .select('id, date')
        .eq('program_id', p.program_id)
        .gte('date', p.start_date)
        .lte('date', p.end_date);
      if (sessErr) throw sessErr;

      const sessionIds = sessions.map(s => s.id);

      // 5.2 שליפת נוכחות קיימת של הלקוחה רק עבור המפגשים האלה
      const { data: existingAttendance } = await supabase
        .from('session_attendance')
        .select('id, session_id')
        .eq('customer_id', p.customer_id)
        .in('session_id', sessionIds);

      const existingSessionIds = existingAttendance.map(a => a.session_id);

      // 5.3 הוספת מפגשים חדשים שלא קיימים עדיין
      const missingSessions = sessionIds.filter(id => !existingSessionIds.includes(id));
      if (missingSessions.length > 0) {
        const newRecords = missingSessions.map(id => ({ customer_id: p.customer_id, session_id: id, is_present: false, status_code: 1 }));
        const chunks = chunkArray(newRecords, 100);
        for (const chunk of chunks) await supabase.from('session_attendance').insert(chunk);
      }

      // 5.4 מחיקת נוכחות עבור מפגשים מחוץ לטווח (קיצור)
      const { data: allProgramSessions } = await supabase
        .from('program_sessions')
        .select('id')
        .eq('program_id', p.program_id);
      const allSessionIds = allProgramSessions.map(s => s.id);
      const toDeleteIds = allSessionIds.filter(id => !sessionIds.includes(id));
      if (toDeleteIds.length > 0) {
        const chunks = chunkArray(toDeleteIds, 100);
        for (const chunk of chunks) {
          await supabase.from('session_attendance').delete().eq('customer_id', p.customer_id).in('session_id', chunk);
        }
      }
    }

    allProgram = programsToSave;
    Swal.fire('השינויים נשמרו', 'התוכניות עודכנו בהצלחה ✅', 'success');
    methods.hideLoader();

  } catch (err) {
    console.error('שגיאה בשמירת תוכניות:', err);
    Swal.fire('שגיאה', 'אירעה שגיאה בשמירת התוכניות: ' + err.message, 'error');
    methods.hideLoader();
  }
}