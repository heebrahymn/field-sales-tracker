import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function seedPendingRecords() {
  console.log('Seeding pending records for Country Sales Head review...');

  // 1. Get Tunde Adebayo profile
  const { data: tunde, error: tundeErr } = await supabase
    .from('profiles')
    .select('id, email, market_code')
    .eq('email', 'tunde.adebayo@carboncarcare.com')
    .single();

  if (tundeErr || !tunde) {
    console.error('Tunde Adebayo not found:', tundeErr);
    return;
  }
  console.log('Found Tunde Adebayo:', tunde.id);

  // 2. Insert or update pending Non-Visit Workday request
  // Check if any pending exists
  const { data: existingPendingAbs } = await supabase
    .from('absence_requests')
    .select('id')
    .eq('market_code', 'NG')
    .eq('status', 'pending');

  if (!existingPendingAbs || existingPendingAbs.length === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    // Clean up any existing on this date
    await supabase.from('absence_requests').delete().eq('user_id', tunde.id).eq('absence_date', dateStr);

    const { data: newAbs, error: absErr } = await supabase.from('absence_requests').insert({
      user_id: tunde.id,
      market_code: 'NG',
      absence_date: dateStr,
      category: 'training_development',
      justification: 'Attending mandatory Carbon Advanced Lubricant Certification at Lekki Technical Depot.',
      status: 'pending',
    }).select().single();

    if (absErr) {
      console.error('Failed to create pending absence request:', absErr.message);
    } else {
      console.log('[OK] Created pending non-visit workday request:', newAbs.id, dateStr);
    }
  } else {
    console.log('[OK] Pending non-visit workday request already exists:', existingPendingAbs[0].id);
  }

  // 3. Check pending GPS Pin proposal
  const { data: existingPendingPins } = await supabase
    .from('branch_location_pins')
    .select('id')
    .eq('status', 'pending_approval');

  if (!existingPendingPins || existingPendingPins.length === 0) {
    // Find an NG branch
    const { data: branch } = await supabase
      .from('branches')
      .select('id, branch_name')
      .eq('market_code', 'NG')
      .limit(1)
      .single();

    if (branch) {
      // Find highest version number for this branch
      const { data: maxPin } = await supabase
        .from('branch_location_pins')
        .select('version_number')
        .eq('branch_id', branch.id)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (maxPin?.[0]?.version_number || 0) + 1;

      const { data: newPin, error: pinErr } = await supabase.from('branch_location_pins').insert({
        branch_id: branch.id,
        version_number: nextVersion,
        latitude: 6.4532100,
        longitude: 3.4215000,
        reported_accuracy_m: 14.5,
        premises_photo_url: 'brand/carbon_logo.png',
        status: 'pending_approval',
        proposed_by: tunde.id,
        is_active: false,
      }).select().single();

      if (pinErr) {
        console.error('Failed to create pending pin proposal:', pinErr.message);
      } else {
        console.log('[OK] Created pending branch GPS pin proposal:', newPin.id, 'for branch:', branch.branch_name);
      }
    }
  } else {
    console.log('[OK] Pending pin proposal already exists:', existingPendingPins[0].id);
  }

  // 4. Ensure Tunde Adebayo has an active 'started' workday today so visits can be checked in
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: att } = await supabase
    .from('attendance_days')
    .select('id, status')
    .eq('user_id', tunde.id)
    .eq('work_date', todayStr)
    .maybeSingle();

  if (!att) {
    await supabase.from('attendance_days').insert({
      user_id: tunde.id,
      market_code: 'NG',
      work_date: todayStr,
      status: 'started',
      started_at: new Date().toISOString(),
      start_latitude: 6.5892,
      start_longitude: 3.3581,
      start_accuracy_m: 12.0,
      start_selfie_url: 'selfies/tunde_start.jpg',
    });
    console.log('[OK] Seeded started workday for Tunde today:', todayStr);
  } else if (att.status !== 'started') {
    await supabase.from('attendance_days').update({
      status: 'started',
      ended_at: null,
    }).eq('id', att.id);
    console.log('[OK] Re-opened started workday for Tunde today:', todayStr);
  } else {
    console.log('[OK] Tunde already has an active started workday today:', att.id);
  }

  // 5. Check pending Exceptions
  const { data: pendingExc } = await supabase
    .from('exceptions')
    .select('id, reason, status')
    .eq('status', 'pending_review');

  console.log('[OK] Total pending exceptions ready for review:', pendingExc?.length);
}

seedPendingRecords().catch(console.error);

