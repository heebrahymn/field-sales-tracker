/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

function getSupabaseServerConfig() {
  let url = process.env.VITE_SUPABASE_URL || '';
  let anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('VITE_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
        if (trimmed.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) anonKey = trimmed.split('=')[1].trim();
        if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = trimmed.split('=')[1].trim();
      }
    }
  }
  return { url, anonKey, serviceKey };
}

function adminApiDevPlugin(): Plugin {
  return {
    name: 'carbon-admin-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/admin/users')) {
          return next();
        }

        const { url: supabaseUrl, anonKey, serviceKey } = getSupabaseServerConfig();
        if (!supabaseUrl || !serviceKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Supabase configuration or service key missing on server' }));
          return;
        }

        try {
          // 1. Verify caller Authorization token
          const authHeader = req.headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized: Missing Bearer token' }));
            return;
          }

          const token = authHeader.replace(/^Bearer\s+/i, '');
          const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${token}`,
            },
          });

          if (!userResp.ok) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized: Invalid session token' }));
            return;
          }

          const caller = await userResp.json();
          const callerId = caller.id;

          // 2. Verify caller role in public.profiles is active hq_admin
          const profileResp = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${callerId}&select=role,is_active`,
            {
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
              },
            }
          );

          const profiles = await profileResp.json();
          if (!profiles || profiles.length === 0 || profiles[0].role !== 'hq_admin' || !profiles[0].is_active) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: Only active HQ Administrators can perform this action' }));
            return;
          }

          // 3. Read body
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const rawBody = Buffer.concat(buffers).toString('utf-8');
          const body = rawBody ? JSON.parse(rawBody) : {};

          const action = body.action || (req.method === 'DELETE' ? 'delete_user' : '');
          const targetUserId = body.userId;

          if (!targetUserId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'userId is required' }));
            return;
          }

          if (action === 'reset_password') {
            const newPassword = body.newPassword;
            if (!newPassword || newPassword.length < 8) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'newPassword must be at least 8 characters' }));
              return;
            }

            const updateResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
              method: 'PUT',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ password: newPassword }),
            });

            if (!updateResp.ok) {
              const errData = await updateResp.json();
              res.writeHead(updateResp.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: errData.message || 'Failed to update user password' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Password updated successfully' }));
            return;
          }

          if (action === 'delete_user') {
            const deleteResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
              method: 'DELETE',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
              },
            });

            if (!deleteResp.ok) {
              const errData = await deleteResp.json();
              res.writeHead(deleteResp.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: errData.message || 'Failed to delete auth user' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'User deleted successfully' }));
            return;
          }

          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    adminApiDevPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    pool: 'forks',
  },
  server: {
    port: 5173,
    host: true,
  },
});
