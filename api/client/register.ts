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
    return res.status(500).json({ error: 'The registration service is temporarily unavailable. Please try again later or contact HQ Admin.' });
  }

  try {
    // 1. Verify caller Authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again and retry.' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResp.ok) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again and retry.' });
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
      return res.status(403).json({ error: 'Your employee account is inactive or could not be verified. Please contact HQ Admin.' });
    }

    const callerProfile = profiles[0];
    const allowedRoles = ['salesperson', 'country_sales_head', 'hq_admin'];
    if (!allowedRoles.includes(callerProfile.role)) {
      return res.status(403).json({ error: 'Your account role does not have permission to register client locations.' });
    }

    const body = req.body || {};
    const organisationName = body.organisationName?.trim();
    const branchName = body.branchName?.trim();
    const streetAddress = body.streetAddress?.trim();
    const registrationMode: 'new' | 'existing' | undefined =
      body.registrationMode === 'new' || body.registrationMode === 'existing'
        ? body.registrationMode
        : undefined;
    const targetMarket = body.marketCode?.trim() || callerProfile.market_code || 'NG';

    const normalizeValue = (val: string) => val.trim().replace(/\s+/g, ' ').toLowerCase();

    if (!organisationName || !branchName || !streetAddress) {
      return res.status(400).json({ error: 'Please fill in the Company Name, Branch Name, and Street Address before submitting.' });
    }

    // Market boundary check for salespeople
    if (callerProfile.role === 'salesperson' && callerProfile.market_code && callerProfile.market_code !== targetMarket) {
      return res.status(403).json({
        error: 'You can only register clients within your assigned market.',
      });
    }

    // 3. Resolve Organisation & Enforce Duplicate Prevention (while permitting new branches of existing clients)
    let orgId = body.organisationId;
    let resolvedOrgName = organisationName;
    if (!orgId) {
      const orgSearchResp = await fetch(
        `${supabaseUrl}/rest/v1/organisations?market_code=eq.${encodeURIComponent(targetMarket)}&select=id,name`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const marketOrgs = await orgSearchResp.json();
      const matchedOrg = Array.isArray(marketOrgs)
        ? marketOrgs.find((o: any) => o?.name && normalizeValue(o.name) === normalizeValue(organisationName))
        : null;

      if (matchedOrg?.id) {
        orgId = matchedOrg.id;
        resolvedOrgName = matchedOrg.name;
      }
    }

    if (orgId) {
      // Check existing branches under this organisation in the same market
      const existingBranchesResp = await fetch(
        `${supabaseUrl}/rest/v1/branches?organisation_id=eq.${encodeURIComponent(orgId)}&market_code=eq.${encodeURIComponent(targetMarket)}&select=id,branch_name,street_address,operating_status`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const existingBranches = await existingBranchesResp.json();
      const activeOrPendingBranches = Array.isArray(existingBranches)
        ? existingBranches.filter(
            (b: any) => b?.operating_status !== 'rejected' && b?.operating_status !== 'inactive'
          )
        : [];

      const duplicateBranch = activeOrPendingBranches.find(
        (b: any) =>
          (b?.branch_name && normalizeValue(b.branch_name) === normalizeValue(branchName)) ||
          (b?.street_address && normalizeValue(b.street_address) === normalizeValue(streetAddress))
      );

      if (duplicateBranch) {
        const isPending =
          duplicateBranch.operating_status === 'pending_approval' ||
          duplicateBranch.operating_status === 'location_pending';
        return res.status(409).json({
          duplicate: true,
          duplicateType: 'branch_exists',
          existingStatus: duplicateBranch.operating_status,
          existingBranchName: duplicateBranch.branch_name,
          existingCompanyName: resolvedOrgName,
          error: isPending
            ? `Duplicate client submission: "${resolvedOrgName} — ${duplicateBranch.branch_name}" has already been submitted and is currently awaiting Country Sales Head approval. To add a different branch for this client, select "Existing Client Location" and enter the new branch name and address.`
            : `Duplicate client location: "${resolvedOrgName} — ${duplicateBranch.branch_name}" is already registered and approved in your market. To add another branch for this client, select "Existing Client Location" and enter a distinct branch name and address.`,
        });
      }

      // Prevent resubmitting an already-registered/pending client as a brand-new client company
      if (registrationMode === 'new' && activeOrPendingBranches.length > 0) {
        const hasPendingOnly = activeOrPendingBranches.every(
          (b: any) =>
            b?.operating_status === 'pending_approval' || b?.operating_status === 'location_pending'
        );
        return res.status(409).json({
          duplicate: true,
          duplicateType: 'company_exists',
          existingCompanyName: resolvedOrgName,
          error: hasPendingOnly
            ? `Duplicate new client: "${resolvedOrgName}" has already been submitted for approval. To add another branch for this client, switch to "Existing Client Location" and select "${resolvedOrgName}".`
            : `Duplicate new client: "${resolvedOrgName}" is already registered in your market. To add a new branch for this client, switch to "Existing Client Location" and select "${resolvedOrgName}".`,
        });
      }
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
        const orgErr = await createOrgResp.json().catch(() => ({}));
        console.error('[api/client/register] Organisation insert failed:', orgErr);
        return res.status(createOrgResp.status).json({
          error: 'Could not save the new client company right now. Please check your details and try again.',
        });
      }
      const createdOrg = await createOrgResp.json();
      orgId = createdOrg[0].id;
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
      const bErr = await branchInsertResp.json().catch(() => ({}));
      console.error('[api/client/register] Branch insert failed:', bErr);
      return res.status(branchInsertResp.status).json({
        error: 'Could not save this client location right now. Please check the branch details and try again.',
      });
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
    console.error('[api/client/register] Unexpected error:', err);
    return res.status(500).json({
      error: 'Unable to complete client registration due to a temporary server issue. Please try again.',
    });
  }
}

