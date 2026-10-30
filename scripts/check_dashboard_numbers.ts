import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('=== DASHBOARD DATA ACCURACY AUDIT ===');
  
  // 1. Visits
  const { data: visits } = await supabase.from('visits').select('id, market_code:branches(market_code), verification_status, location_classification');
  const vCounts: Record<string, number> = {};
  visits?.forEach((v: any) => {
    const s = v.verification_status;
    vCounts[s] = (vCounts[s] || 0) + 1;
  });
  console.log('Total visits:', visits?.length, 'by status:', vCounts);

  // 2. Reps
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, market_code');
  const repsNG = profiles?.filter((p: any) => p.role === 'salesperson' && p.market_code === 'NG');
  console.log('Salespeople in NG:', repsNG?.length);

  // 3. Attendance today
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: attendance } = await supabase.from('attendance_days').select('*').eq('work_date', todayStr);
  console.log('Attendance records today:', attendance?.length);

  // 4. Approved absences
  const { data: abs } = await supabase.from('approved_absences').select('*');
  console.log('Approved absences:', abs?.length);

  // 5. Exceptions
  const { data: exc } = await supabase.from('exceptions').select('status');
  const eCounts: Record<string, number> = {};
  exc?.forEach((e: any) => {
    eCounts[e.status] = (eCounts[e.status] || 0) + 1;
  });
  console.log('Exceptions by status:', eCounts);

  // 6. Branch Location Pins
  const { data: pins } = await supabase.from('branch_location_pins').select('status');
  const pCounts: Record<string, number> = {};
  pins?.forEach((p: any) => {
    pCounts[p.status] = (pCounts[p.status] || 0) + 1;
  });
  console.log('Pins by status:', pCounts);

  // 7. Flags
  const { data: flags } = await supabase.from('verification_flags').select('status');
  const fCounts: Record<string, number> = {};
  flags?.forEach((f: any) => {
    fCounts[f.status] = (fCounts[f.status] || 0) + 1;
  });
  console.log('Flags by status:', fCounts);
}

check().catch(console.error);

