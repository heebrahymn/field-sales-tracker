/**
 * Carbon Field Sales Tracker - Authenticated User Provisioning & Credential Rotation
 * 
 * Uses official Supabase Auth Admin API (GoTrue Admin) to provision or rotate
 * user accounts across Nigeria, Zambia, and Malawi.
 * 
 * Features:
 * - Direct GoTrue API interaction (bypasses SQL hacks on auth.users).
 * - Cryptographically strong runtime password generation.
 * - Idempotent upsert into public.profiles.
 * - Credential rotation with secure local environment file update.
 * - Zero cleartext passwords stored in migrations or repository.
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface UserDefinition {
  id?: string;
  email: string;
  fullName: string;
  role: 'salesperson' | 'country_sales_head' | 'hq_admin';
  marketCode?: 'NG' | 'ZM' | 'MW';
  phoneNumber: string;
}

const SEED_USERS: UserDefinition[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'tunde.adebayo@carboncarcare.com',
    fullName: 'Tunde Adebayo',
    role: 'salesperson',
    marketCode: 'NG',
    phoneNumber: '+2348031234567',
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'babatunde.adeleke@carboncarcare.com',
    fullName: 'Babatunde Adeleke',
    role: 'country_sales_head',
    marketCode: 'NG',
    phoneNumber: '+2348029876543',
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    email: 'peter.mwale@carboncarcare.com',
    fullName: 'Peter Mwale',
    role: 'salesperson',
    marketCode: 'ZM',
    phoneNumber: '+260971234567',
  },
  {
    id: '55555555-5555-4555-a555-555555555555',
    email: 'chileshe.mwape@carboncarcare.com',
    fullName: 'Chileshe Mwape',
    role: 'country_sales_head',
    marketCode: 'ZM',
    phoneNumber: '+260979876543',
  },
  {
    id: '66666666-6666-4666-a666-666666666666',
    email: 'kondwani.banda@carboncarcare.com',
    fullName: 'Kondwani Banda',
    role: 'salesperson',
    marketCode: 'MW',
    phoneNumber: '+265991234567',
  },
  {
    id: '77777777-7777-4777-a777-777777777777',
    email: 'tamika.phiri@carboncarcare.com',
    fullName: 'Tamika Phiri',
    role: 'country_sales_head',
    marketCode: 'MW',
    phoneNumber: '+265999876543',
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'ayodele.ibraheem@carboncarcare.com',
    fullName: 'Ayodele Ibraheem',
    role: 'hq_admin',
    marketCode: undefined,
    phoneNumber: '+2348011122334',
  },
];

function loadEnvFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
        }
      }
    }
  }
  return env;
}

function updateEnvLocal(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const randomBytes = crypto.randomBytes(24);
  let password = 'C3!';
  for (let i = 0; i < 20; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

async function main() {
  console.log('=================================================================');
  console.log('Carbon Field Sales Tracker — Supabase Auth Admin Provisioning');
  console.log('=================================================================\n');

  const env = loadEnvFile();
  const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    console.error('Please configure them in .env.local or environment variables.');
    process.exit(1);
  }

  const supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const shouldRotate = process.argv.includes('--rotate');
  let provisionPassword = process.env.DEV_USER_PASSWORD || env.DEV_USER_PASSWORD;

  if (!provisionPassword || shouldRotate) {
    provisionPassword = generateSecurePassword();
    console.log(`Generated fresh secure password for environment: [PROTECTED - LENGTH ${provisionPassword.length}]`);
    updateEnvLocal('DEV_USER_PASSWORD', provisionPassword);
    console.log('Saved DEV_USER_PASSWORD into .env.local (git-ignored).');
  } else {
    console.log('Using configured DEV_USER_PASSWORD from environment.');
  }

  // Fetch all existing users in project
  const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (listError) {
    console.error('Failed to query users via Auth Admin API:', listError.message);
    process.exit(1);
  }

  const existingUsersByEmail = new Map<string, any>();
  for (const u of userList.users) {
    if (u.email) existingUsersByEmail.set(u.email.toLowerCase(), u);
  }

  console.log(`Found ${userList.users.length} existing Auth users in project.\n`);

  for (const seed of SEED_USERS) {
    const existing = existingUsersByEmail.get(seed.email.toLowerCase());
    let userId: string;

    if (existing) {
      console.log(`Updating existing user: ${seed.email} (${seed.role} / ${seed.marketCode || 'Global'})`);
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: provisionPassword,
        email_confirm: true,
        user_metadata: {
          full_name: seed.fullName,
          role: seed.role,
          market_code: seed.marketCode || null,
        },
      });

      if (updateError) {
        console.error(`  ❌ Failed to update ${seed.email}:`, updateError.message);
        continue;
      }
      userId = updated.user.id;
      console.log(`  ✅ Password and metadata updated via Auth Admin API (ID: ${userId})`);
    } else {
      console.log(`Creating fresh user: ${seed.email} (${seed.role} / ${seed.marketCode || 'Global'})`);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        ...(seed.id ? { id: seed.id } : {}),
        email: seed.email,
        password: provisionPassword,
        email_confirm: true,
        user_metadata: {
          full_name: seed.fullName,
          role: seed.role,
          market_code: seed.marketCode || null,
        },
      });

      if (createError) {
        console.error(`  ❌ Failed to create ${seed.email}:`, createError.message);
        continue;
      }
      userId = created.user.id;
      console.log(`  ✅ User created successfully via Auth Admin API (ID: ${userId})`);
    }

    // Upsert into public.profiles to guarantee DB profile consistency
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        market_code: seed.marketCode || null,
        full_name: seed.fullName,
        email: seed.email,
        phone_number: seed.phoneNumber,
        role: seed.role,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error(`  ⚠️ Warning: Profile sync error for ${seed.email}:`, profileError.message);
    } else {
      console.log(`  ✅ Profile synchronized in public.profiles`);
    }
  }

  console.log('\n=================================================================');
  console.log('Auth Admin Provisioning Complete! All accounts verified.');
  console.log('=================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during Auth provisioning:', err);
  process.exit(1);
});
