import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.substring(0, idx).trim(), line.substring(idx + 1).trim()];
    })
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, market_code, is_active')
    .order('email');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Profiles in DB:');
  console.table(data);
}

main();
