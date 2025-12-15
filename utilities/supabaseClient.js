// supabaseClient.js
const { createClient } = window.supabase;

const supabaseUrl = 'https://bmrtobuvjuycnvvfmgvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcnRvYnV2anV5Y252dmZtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ5MDUsImV4cCI6MjA2NjE2MDkwNX0.VhoKIR_nb6lyu_05CEsVT8G_c90chKTX8v__5QA-A-s';

export const supabase = createClient(supabaseUrl, supabaseKey);
