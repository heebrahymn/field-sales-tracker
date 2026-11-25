// Vercel Serverless Function: HQ Admin Client & Branch Management
// Strictly enforces active hq_admin role verification before executing privileged operations.

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('[api/admin/clients] Missing required server environment variables.');
    return res.status(500).json({ error: 'The client directory service is temporarily unavailable. Please try again later.' });
  }

  try {
    // 1. Verify caller Authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResp.ok) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
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

    // 3. Parse action and body
    const body = req.body || {};
    const action = body.action || (req.method === 'DELETE' ? 'delete_branch' : 'get_clients');

    // ==========================================
    // ACTION: get_clients
    // ==========================================
    if (action === 'get_clients' || req.method === 'GET') {
      const marketFilter = req.query?.marketCode || body.marketCode;
      const statusFilter = req.query?.status || body.status;

      let queryUrl = `${supabaseUrl}/rest/v1/branches?select=id,branch_name,market_code,category,street_address,city,switchboard_phone,operating_status,created_at,updated_at,created_by,creator:profiles!branches_created_by_fkey(id,full_name,email),organisations(id,name,tier),client_contacts(id,full_name,designation,phone_number,email,is_primary),branch_location_pins(id,latitude,longitude,reported_accuracy_m,premises_photo_url,status,is_active,proposed_at,proposed_by,reviewed_at,reviewed_by,reviewer:profiles!branch_location_pins_reviewed_by_fkey(id,full_name),decision_reason)&order=created_at.desc`;

      if (marketFilter && marketFilter !== 'ALL') {
        queryUrl += `&market_code=eq.${marketFilter}`;
      }
      if (statusFilter && statusFilter !== 'all') {
        queryUrl += `&operating_status=eq.${statusFilter}`;
      }

      const fetchResp = await fetch(queryUrl, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });

      if (!fetchResp.ok) {
        const err = await fetchResp.json();
        return res.status(fetchResp.status).json({ error: err.message || 'Failed to fetch clients' });
      }

      const clients = await fetchResp.json();
      return res.status(200).json({ success: true, data: clients });
    }

    // ==========================================
    // ACTION: update_client
    // ==========================================
    if (action === 'update_client') {
      const {
        branchId,
        organisationId,
        organisationName,
        branchName,
        category,
        streetAddress,
        city,
        switchboardPhone,
        contactId,
        contactName,
        contactRole,
        contactPhone,
        contactEmail,
        reason,
      } = body;

      if (!branchId) {
        return res.status(400).json({ error: 'branchId is required' });
      }

      const nowIso = new Date().toISOString();

      // Update Organisation Name if provided
      if (organisationId && organisationName?.trim()) {
        await fetch(`${supabaseUrl}/rest/v1/organisations?id=eq.${organisationId}`, {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: organisationName.trim() }),
        });
      }

      // Update Branch Details
      const branchUpdatePayload: Record<string, any> = { updated_at: nowIso };
      if (branchName?.trim()) branchUpdatePayload.branch_name = branchName.trim();
      if (category?.trim()) branchUpdatePayload.category = category.trim();
      if (streetAddress?.trim()) branchUpdatePayload.street_address = streetAddress.trim();
      if (city?.trim()) branchUpdatePayload.city = city.trim();
      if (switchboardPhone?.trim()) branchUpdatePayload.switchboard_phone = switchboardPhone.trim();

      const branchUpdateResp = await fetch(`${supabaseUrl}/rest/v1/branches?id=eq.${branchId}`, {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(branchUpdatePayload),
      });

      if (!branchUpdateResp.ok) {
        const err = await branchUpdateResp.json();
        return res.status(branchUpdateResp.status).json({ error: err.message || 'Failed to update branch' });
      }

      // Update or Create Primary Contact
      if (contactName?.trim()) {
        if (contactId) {
          await fetch(`${supabaseUrl}/rest/v1/client_contacts?id=eq.${contactId}`, {
            method: 'PATCH',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              full_name: contactName.trim(),
              designation: contactRole?.trim() || 'Site Contact',
              phone_number: contactPhone?.trim() || switchboardPhone?.trim() || '+234 1 000 0000',
              email: contactEmail?.trim() || null,
            }),
          });
        } else {
          await fetch(`${supabaseUrl}/rest/v1/client_contacts`, {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              branch_id: branchId,
              organisation_id: organisationId || null,
              full_name: contactName.trim(),
              designation: contactRole?.trim() || 'Site Contact',
              phone_number: contactPhone?.trim() || switchboardPhone?.trim() || '+234 1 000 0000',
              email: contactEmail?.trim() || null,
              is_primary: true,
            }),
          });
        }
      }

      // Record Audit Trail
      await fetch(`${supabaseUrl}/rest/v1/approval_audit`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: 'branches',
          entity_id: branchId,
          action: 'client_details_updated',
          actor_id: callerId,
          mandatory_reason: reason?.trim() || 'Client registration details corrected by HQ Admin',
          new_state: 'updated',
        }),
      });

      return res.status(200).json({ success: true, message: 'Client details successfully updated' });
    }

    // ==========================================
    // ACTION: delete_branch
    // ==========================================
    if (action === 'delete_branch') {
      const branchId = body.branchId;
      const reason = body.reason?.trim() || 'Erronous registration removed by HQ Admin';

      if (!branchId) {
        return res.status(400).json({ error: 'branchId is required' });
      }

      // Check for visits referencing branch
      const visitsCheck = await fetch(
        `${supabaseUrl}/rest/v1/visits?branch_id=eq.${branchId}&select=id`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            Prefer: 'count=exact',
          },
        }
      );
      const visitsContentRange = visitsCheck.headers.get('content-range');
      const visitCount = visitsContentRange ? parseInt(visitsContentRange.split('/')[1] || '0', 10) : 0;

      // Check for exceptions referencing branch
      const excCheck = await fetch(
        `${supabaseUrl}/rest/v1/exceptions?branch_id=eq.${branchId}&select=id`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            Prefer: 'count=exact',
          },
        }
      );
      const excContentRange = excCheck.headers.get('content-range');
      const excCount = excContentRange ? parseInt(excContentRange.split('/')[1] || '0', 10) : 0;

      if (visitCount > 0 || excCount > 0) {
        return res.status(409).json({
          success: false,
          hasHistory: true,
          error:
            'BRANCH_HAS_OPERATIONAL_HISTORY: This client site has historical field visits or salesperson exceptions. Under enterprise audit compliance, it cannot be permanently deleted. You can mark it as Inactive (Decommissioned) instead.',
        });
      }

      // Fetch organisationId before deleting branch
      const branchInfoResp = await fetch(
        `${supabaseUrl}/rest/v1/branches?id=eq.${branchId}&select=organisation_id`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const branchInfos = await branchInfoResp.json();
      const orgId = branchInfos?.[0]?.organisation_id;

      // Delete branch (cascades client_contacts and branch_location_pins)
      const deleteResp = await fetch(`${supabaseUrl}/rest/v1/branches?id=eq.${branchId}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });

      if (!deleteResp.ok) {
        const err = await deleteResp.json();
        return res.status(deleteResp.status).json({ error: err.message || 'Failed to delete client branch' });
      }

      // If orgId exists, check if any other branches remain for this organisation
      if (orgId) {
        const remainingResp = await fetch(
          `${supabaseUrl}/rest/v1/branches?organisation_id=eq.${orgId}&select=id`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              Prefer: 'count=exact',
            },
          }
        );
        const remRange = remainingResp.headers.get('content-range');
        const remCount = remRange ? parseInt(remRange.split('/')[1] || '0', 10) : 0;
        if (remCount === 0) {
          await fetch(`${supabaseUrl}/rest/v1/organisations?id=eq.${orgId}`, {
            method: 'DELETE',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          });
        }
      }

      // Record Audit Trail
      await fetch(`${supabaseUrl}/rest/v1/approval_audit`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          entity_type: 'branches',
          entity_id: branchId,
          action: 'branch_deleted',
          actor_id: callerId,
          mandatory_reason: reason,
          new_state: 'deleted',
        }),
      });

      return res.status(200).json({ success: true, message: 'Client site deleted successfully' });
    }

    // ==========================================
    // ACTION: deactivate_branch
    // ==========================================
    if (action === 'deactivate_branch') {
      const branchId = body.branchId;
      const reason = body.reason?.trim() || 'Decommissioned by HQ Admin';

      if (!branchId) {
        return res.status(400).json({ error: 'branchId is required' });
      }

      const patchResp = await fetch(`${supabaseUrl}/rest/v1/branches?id=eq.${branchId}`, {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operating_status: 'inactive',
          updated_at: new Date().toISOString(),
        }),
      });

      if (!patchResp.ok) {
        const err = await patchResp.json();
        return res.status(patchResp.status).json({ error: err.message || 'Failed to deactivate branch' });
      }

      // Record Audit Trail
      await fetch(`${supabaseUrl}/rest/v1/approval_audit`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: 'branches',
          entity_id: branchId,
          action: 'branch_deactivated',
          actor_id: callerId,
          mandatory_reason: reason,
          new_state: 'inactive',
        }),
      });

      return res.status(200).json({ success: true, message: 'Client site marked as inactive' });
    }

    // ==========================================
    // ACTION: review_pin
    // ==========================================
    if (action === 'review_pin') {
      const { pinId, decision, reason } = body;
      if (!pinId || !decision || !reason?.trim()) {
        return res.status(400).json({ error: 'pinId, decision, and rationale are required' });
      }

      const rpcName = decision === 'approved' ? 'approve_branch_location_pin' : 'reject_branch_location_pin';
      const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_pin_id: pinId,
          p_reason: reason.trim(),
        }),
      });

      if (!rpcResp.ok) {
        const err = await rpcResp.json();
        return res.status(rpcResp.status).json({ error: err.message || `Failed to ${decision} pin` });
      }

      return res.status(200).json({ success: true, message: `Location pin ${decision} successfully` });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[api/admin/clients] Unexpected error:', err);
    return res.status(500).json({ error: 'Unable to complete this client update right now. Please try again.' });
  }
}

