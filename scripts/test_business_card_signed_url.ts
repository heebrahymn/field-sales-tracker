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
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, anonKey);
const adminSupabase = createClient(url, serviceKey);

async function main() {
  const { data: user, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'babatunde.adeleke@carboncarcare.com',
    password: '[DEV_USER_PASSWORD_REDACTED]',
  });
  console.log('Login Babatunde:', user?.user?.email, loginErr?.message);

  // 1. Check storage buckets
  const { data: buckets, error: bErr } = await adminSupabase.storage.listBuckets();
  console.log('Storage Buckets in Supabase:');
  buckets?.forEach(b => console.log(` - ID: ${b.id}, Name: ${b.name}, Public: ${b.public}`));

  // 2. Query meeting logs to see what is currently in business_card_photo_url
  const { data: logs, error: lErr } = await adminSupabase
    .from('meeting_logs')
    .select('id, visit_id, business_card_photo_url, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(10);
  console.log('\nRecent meeting logs in DB:');
  logs?.forEach(l => console.log(` - ID: ${l.id}, Card: ${l.business_card_photo_url}, At: ${l.submitted_at}`));

  // 3. Test signed URL generation on 'business-cards' vs 'visit-business-cards'
  console.log('\nTesting signed URL on business-cards:');
  const sampleCard = logs?.find(l => l.business_card_photo_url)?.business_card_photo_url || 'test.jpg';
  console.log('Sample card path:', sampleCard);

  const cleanSample = sampleCard.replace(/^business-cards\//, '').replace(/^visit-business-cards\//, '');
  const { data: signed1, error: err1 } = await supabase.storage.from('business-cards').createSignedUrl(cleanSample, 300);
  console.log('Using bucket "business-cards":', signed1?.signedUrl ? 'SUCCESS' : 'FAILED', err1?.message);

  const { data: signed2, error: err2 } = await supabase.storage.from('visit-business-cards').createSignedUrl(cleanSample, 300);
  console.log('Using bucket "visit-business-cards":', signed2?.signedUrl ? 'SUCCESS' : 'FAILED', err2?.message);
}

main();
