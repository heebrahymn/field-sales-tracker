// Vercel Serverless Function: Authoritative Client & Branch Registration
// Enforces authenticated user role, market scoping, and creates organization, branch, contact, and proposed pin.

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

    // 2. Verify caller profile (must be active and belong to market if salesperson)
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
    const allowedRoles = ['salesperson', 'country_sales_head', 'hq_admin'];
    if (!allowedRoles.includes(callerProfile.role)) {
      return res.status(403).json({ error: `Forbidden: Role ${callerProfile.role} cannot register clients.` });
    }

    const body = req.body || {};
    const organisationName = body.organisationName?.trim();
    const branchName = body.branchName?.trim();
    const streetAddress = body.streetAddress?.trim();
    const targetMarket = body.marketCode?.trim() || callerProfile.market_code || 'NG';

    if (!organisationName || !branchName || !streetAddress) {
      return res.status(400).json({ error: 'organisationName, branchName, and streetAddress are required.' });
    }

    // Market boundary check for salespeople
    if (callerProfile.role === 'salesperson' && callerProfile.market_code && callerProfile.market_code !== targetMarket) {
      return res.status(403).json({
        error: `Forbidden: Salesperson in ${callerProfile.market_code} cannot register clients in ${targetMarket}.`,
      });
    }

    // 3. Resolve or create Organisation
    let orgId = body.organisationId;
    if (!orgId) {
      const orgSearchResp = await fetch(
        `${supabaseUrl}/rest/v1/organisations?name=ilike.${encodeURIComponent(organisationName)}&market_code=eq.${targetMarket}&select=id`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const existingOrgs = await orgSearchResp.json();
      if (Array.isArray(existingOrgs) && existingOrgs.length > 0) {
        orgId = existingOrgs[0].id;
      } else {
        const createOrgResp = await fetch(`${supabaseUrl}/rest/v1/organisations`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            name: organisationName,
            market_code: targetMarket,
            tier: 'standard',
          }),
        });

        if (!createOrgResp.ok) {
          const orgErr = await createOrgResp.json();
          return res.status(createOrgResp.status).json({ error: orgErr.message || 'Failed to create organisation.' });
        }
        const createdOrg = await createOrgResp.json();
        orgId = createdOrg[0].id;
      }
    }

    // 4. Map category to allowed enum
    const validCategories = ['fleet_operator', 'workshop', 'dealer', 'distributor', 'retail', 'logistics'];
    let safeCategory = 'logistics';
    const catLower = (body.category || '').toLowerCase();
    if (catLower.includes('fleet')) safeCategory = 'fleet_operator';
    else if (catLower.includes('workshop')) safeCategory = 'workshop';
    else if (catLower.includes('dealer')) safeCategory = 'dealer';
    else if (catLower.includes('distributor')) safeCategory = 'distributor';
    else if (catLower.includes('retail')) safeCategory = 'retail';
    else if (validCategories.includes(catLower)) safeCategory = catLower;

    // 5. Insert Branch into public.branches
    const branchInsertResp = await fetch(`${supabaseUrl}/rest/v1/branches`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        organisation_id: orgId,
        branch_name: branchName,
        category: safeCategory,
        city: body.city?.trim() || (targetMarket === 'ZM' ? 'Lusaka' : targetMarket === 'MW' ? 'Blantyre' : 'Lagos'),
        street_address: streetAddress,
        switchboard_phone: body.switchboardPhone?.trim() || body.contactPhone?.trim() || '+234 1 000 0000',
        estimated_fleet_size: body.estimatedFleetSize || null,
        market_code: targetMarket,
        operating_status: 'pending_approval',
        created_by: callerId,
      }),
    });

    if (!branchInsertResp.ok) {
      const bErr = await branchInsertResp.json();
      return res.status(branchInsertResp.status).json({ error: bErr.message || 'Failed to create branch.' });
    }
    const createdBranches = await branchInsertResp.json();
    const newBranch = createdBranches[0];

    // 6. Insert primary contact into public.client_contacts
    let createdContact = null;
    if (body.contactName?.trim()) {
      const contactResp = await fetch(`${supabaseUrl}/rest/v1/client_contacts`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          branch_id: newBranch.id,
          organisation_id: orgId,
          full_name: body.contactName.trim(),
          designation: body.contactRole?.trim() || 'Operations Lead',
          phone_number: body.contactPhone?.trim() || newBranch.switchboard_phone,
          email: body.contactEmail?.trim() || null,
          is_primary: true,
        }),
      });
      if (contactResp.ok) {
        const contacts = await contactResp.json();
        createdContact = contacts[0];
      }
    }

    // 7. Propose location pin if coordinates provided
    let proposedPin = null;
    if (typeof body.latitude === 'number' && typeof body.longitude === 'number') {
      const pinResp = await fetch(`${supabaseUrl}/rest/v1/branch_location_pins`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          branch_id: newBranch.id,
          version_number: 1,
          latitude: body.latitude,
          longitude: body.longitude,
          reported_accuracy_m: body.accuracyM || 15,
          premises_photo_url: body.premisesPhotoPath?.trim() || 'visit-premises-photos/pending_proposal.jpg',
          status: 'pending_review',
          proposed_by: callerId,
          is_active: false,
        }),
      });

      if (pinResp.ok) {
        const pins = await pinResp.json();
        proposedPin = pins[0];
      }
    }

    return res.status(200).json({
      success: true,
      branch: {
        ...newBranch,
        client_contacts: createdContact ? [createdContact] : [],
        branch_location_pins: proposedPin ? [proposedPin] : [],
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

