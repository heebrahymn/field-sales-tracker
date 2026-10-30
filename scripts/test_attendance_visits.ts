import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testAttendanceVisits() {
  const { data, error } = await supabase
    .from('attendance_days')
    .select(`
      id,
      user_id,
      work_date,
      visits (id, verification_status)
    `)
    .limit(5);

  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}

testAttendanceVisits();

