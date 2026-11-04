// Vercel Serverless Function: Authoritative Non-Visit Workday Request Cancellation
// Enforces caller authentication and ownership (salesperson author or supervisor).
// Writes an immutable audit ledger entry to approval_audit before deleting the pending request.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

    // 2. Verify caller profile
    const profileResp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${callerId}&select=role,market_code,is_active`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const profiles = await profileResp.json();
    if (!profiles || profiles.length === 0 || !profiles[0].is_active) {
      return res.status(403).json({ error: 'Forbidden: Inactive or unrecognized profile.' });
    }

    const callerProfile = profiles[0];

    // 3. Parse request body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const requestId = body.requestId;

    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }

    // 4. Query target absence request
    const reqResp = await fetch(
      `${supabaseUrl}/rest/v1/absence_requests?id=eq.${requestId}&select=*`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const requests = await reqResp.json();
    if (!requests || requests.length === 0) {
      return res.status(200).json({ success: true, message: 'Request already cancelled or not found.' });
    }

    const targetReq = requests[0];

    // 5. Verify authorization
    const isOwner = callerId === targetReq.user_id;
    const isAssignedCSH = callerProfile.role === 'country_sales_head' && callerProfile.market_code === targetReq.market_code;
    const isHQ = callerProfile.role === 'hq_admin';

    if (!isOwner && !isAssignedCSH && !isHQ) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to cancel this request.' });
    }

    // 6. Verify status is 'pending'
    if (targetReq.status !== 'pending') {
      return res.status(400).json({ error: `Cannot cancel request: request is already ${targetReq.status}.` });
    }

    // 7. Insert immutable audit trail into approval_audit
    await fetch(`${supabaseUrl}/rest/v1/approval_audit`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        entity_type: 'absence_request',
        entity_id: requestId,
        actor_id: callerId,
        action: 'cancel_non_visit_workday',
        previous_state: 'pending',
        new_state: 'cancelled',
        mandatory_reason: body.reason?.trim() || (isOwner ? 'Cancelled by salesperson' : 'Cancelled by management'),
      }),
    });

    // 8. Delete the request
    const deleteResp = await fetch(`${supabaseUrl}/rest/v1/absence_requests?id=eq.${requestId}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!deleteResp.ok) {
      const delErr = await deleteResp.json().catch(() => ({}));
      return res.status(deleteResp.status).json({ error: delErr.message || 'Failed to delete absence request' });
    }

    return res.status(200).json({
      success: true,
      message: 'Non-visit workday request cancelled successfully',
    });
  } catch (err: any) {
    console.error('API /api/attendance/cancel-non-visit error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

