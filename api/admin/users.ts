// Vercel Serverless Function: HQ Admin User Password Reset & User Account Removal
// Strictly enforces active hq_admin role verification before executing privileged operations.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return res.status(500).json({ error: 'Supabase server environment variables missing.' });
  }

  try {
    // 1. Verify caller Authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResp.ok) {
      return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
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
      return res.status(403).json({ error: 'Forbidden: Only active HQ Administrators can perform this action' });
    }

    // 3. Parse action and userId
    const body = req.body || {};
    const action = body.action || (req.method === 'DELETE' ? 'delete_user' : '');
    const targetUserId = body.userId;

    if (!targetUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (action === 'reset_password') {
      const newPassword = body.newPassword;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
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
        return res.status(updateResp.status).json({ error: errData.message || 'Failed to update user password' });
      }

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
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
        return res.status(deleteResp.status).json({ error: errData.message || 'Failed to delete auth user' });
      }

      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

