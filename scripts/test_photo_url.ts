import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPhoto() {
  const path = '11111111-1111-4111-a111-111111111111/proposals/1793305787868.jpg';
  const { data, error } = await supabase.storage.from('visit-premises-photos').createSignedUrl(path, 300);
  console.log('Signed URL:', data?.signedUrl, 'Error:', error?.message);

  const { data: files, error: listErr } = await supabase.storage.from('visit-premises-photos').list('11111111-1111-4111-a111-111111111111/proposals');
  console.log('Files in folder:', files, 'List error:', listErr?.message);
}

checkPhoto().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

