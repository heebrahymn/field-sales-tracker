import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): { url: string; anonKey: string; devPassword?: string } {
  let url = process.env.VITE_SUPABASE_URL || '';
  let anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  let devPassword = process.env.DEV_USER_PASSWORD || '';

  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        url = trimmed.split('=')[1].trim();
      } else if (trimmed.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
        anonKey = trimmed.split('=')[1].trim();
      } else if (trimmed.startsWith('DEV_USER_PASSWORD=')) {
        devPassword = trimmed.split('=')[1].trim();
      }
    }
  }
  return { url, anonKey, devPassword };
}

async function testAuth() {
  const { url, anonKey, devPassword } = loadEnv();
  console.log('Connecting to:', url);
  const client = createClient(url, anonKey);
  
  const emails = [
    'tunde.adebayo@carboncarcare.com',
    'babatunde.adeleke@carboncarcare.com',
    'peter.mwale@carboncarcare.com',
    'chileshe.mwape@carboncarcare.com',
    'kondwani.banda@carboncarcare.com',
    'tamika.phiri@carboncarcare.com',
    'hq.admin@carboncarcare.com',
  ];

  for (const email of emails) {
    console.log('\n--- Testing Login for:', email);
    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email,
      password: devPassword!,
    });
    if (authErr) {
      console.error('Auth error:', authErr.message);
      continue;
    }
    console.log('Auth success! User ID:', authData.user?.id);
    
    // Fetch profile
    const { data: profile, error: profErr } = await client
      .from('profiles')
      .select('id, full_name, email, role, market_code, is_active, phone_number')
      .eq('id', authData.user!.id)
      .single();
      
    if (profErr) {
      console.error('Profile fetch error:', profErr.message);
      continue;
    }
    console.log('Profile loaded:', profile);

    // Fetch active device assignment
    const { data: deviceAssignment, error: devErr } = await client
      .from('device_assignments')
      .select('id, is_current, assigned_at, devices(id, asset_id, asset_tag, make, model, inventory_status, security_authorization)')
      .eq('salesperson_id', authData.user!.id)
      .eq('is_current', true)
      .maybeSingle();

    if (devErr) {
      console.error('Device assignment query error:', devErr.message);
    } else {
      console.log('Device assignment:', deviceAssignment);
    }

    await client.auth.signOut();
  }
}

testAuth();
