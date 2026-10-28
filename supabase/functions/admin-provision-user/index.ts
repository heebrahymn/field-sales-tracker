import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProvisionUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: "salesperson" | "country_sales_head" | "hq_admin";
  market_code?: "NG" | "ZM" | "MW" | null;
  assigned_device_id?: string;
  password?: string;
}

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  let pwd = "C3!";
  for (let i = 0; i < array.length; i++) {
    pwd += chars[array[i] % chars.length];
  }
  return pwd;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration: missing Supabase environment variables." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Verify Caller JWT and Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid Authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user: callerUser },
      error: callerAuthError,
    } = await userClient.auth.getUser(token);

    if (callerAuthError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired session token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify Caller Role in public.profiles (Must be Active HQ Admin)
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .eq("id", callerUser.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Forbidden: Caller profile record not found." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerProfile.role !== "hq_admin" || !callerProfile.is_active) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only active HQ Enterprise Administrators can provision employee accounts.",
          callerRole: callerProfile.role,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Parse & Validate Payload
    let body: ProvisionUserPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON request body." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { first_name, last_name, email, phone_number, role, market_code, assigned_device_id, password } = body;

    if (!first_name || !first_name.trim()) {
      return new Response(JSON.stringify({ error: "First name is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!last_name || !last_name.trim()) {
      return new Response(JSON.stringify({ error: "Last name is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: "A valid corporate email address is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["salesperson", "country_sales_head", "hq_admin"];
    if (!role || !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role '${role}'. Must be one of: ${validRoles.join(", ")}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Market Code assignment
    let sanitizedMarketCode: "NG" | "ZM" | "MW" | null = null;
    if (role === "hq_admin") {
      sanitizedMarketCode = null; // HQ Admin is global across all markets
    } else {
      const validMarkets = ["NG", "ZM", "MW"];
      if (!market_code || !validMarkets.includes(market_code)) {
        return new Response(
          JSON.stringify({
            error: `Market code is required for ${role}. Must be one of: ${validMarkets.join(", ")}.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      sanitizedMarketCode = market_code;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanFullName = `${first_name.trim()} ${last_name.trim()}`;
    const cleanPhone = (phone_number ?? "").trim();
    const finalPassword = password && password.trim().length >= 8 ? password.trim() : generateSecurePassword();

    // 4. Duplicate Check in public.profiles
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: `An employee account with email '${cleanEmail}' already exists in profiles.` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create Auth User in auth.users via GoTrue Admin API
    const { data: createdAuthData, error: authCreateError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: cleanFullName,
        role: role,
        market_code: sanitizedMarketCode,
      },
    });

    if (authCreateError || !createdAuthData.user) {
      return new Response(
        JSON.stringify({
          error: `Supabase Auth creation failed: ${authCreateError?.message || "Unknown Auth error"}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = createdAuthData.user.id;

    // 6. Create Matching Profile in public.profiles
    const { error: profileInsertError } = await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        full_name: cleanFullName,
        email: cleanEmail,
        phone_number: cleanPhone,
        role: role,
        market_code: sanitizedMarketCode,
        is_active: true,
      },
      { onConflict: "id" }
    );

    if (profileInsertError) {
      // COMPENSATING ACTION: Rollback Auth User if profile persistence failed
      console.error(`Profile insert failed for ${newUserId}. Rolling back auth user.`);
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({
          error: `Database profile persistence failed: ${profileInsertError.message}. Rolled back Auth user.`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Optional Device Assignment
    let assignedDeviceTag: string | undefined = undefined;
    if (assigned_device_id && role === "salesperson") {
      const { data: deviceRecord, error: devErr } = await adminClient
        .from("devices")
        .select("id, asset_id, make, model, inventory_status")
        .eq("id", assigned_device_id)
        .maybeSingle();

      if (!devErr && deviceRecord) {
        assignedDeviceTag = deviceRecord.asset_id;
        // Record device assignment
        await adminClient
          .from("devices")
          .update({
            inventory_status: "assigned_active",
          })
          .eq("id", assigned_device_id);

        await adminClient.from("device_assignments").insert({
          device_id: assigned_device_id,
          salesperson_id: newUserId,
          assigned_by: callerUser.id,
          is_current: true,
        });
      }
    }

    // 8. Administrative Audit Log Entry
    await adminClient.from("approval_audit").insert({
      action: "user_provisioned",
      entity_type: "profiles",
      entity_id: newUserId,
      actor_id: callerUser.id,
      previous_state: "unprovisioned",
      new_state: JSON.stringify({
        email: cleanEmail,
        full_name: cleanFullName,
        role: role,
        market_code: sanitizedMarketCode,
        is_active: true,
        assigned_device: assignedDeviceTag,
      }),
      mandatory_reason: `HQ Admin (${callerProfile.full_name}) provisioned new ${role} employee account for ${cleanFullName} (${cleanEmail}).`,
    });

    // 9. Return Confirmed Persistence Response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Employee account ${cleanEmail} provisioned successfully with role ${role}.`,
        user: {
          id: newUserId,
          name: cleanFullName,
          email: cleanEmail,
          phone: cleanPhone || "—",
          role: role,
          marketCode: sanitizedMarketCode || "ALL",
          marketName:
            sanitizedMarketCode === "NG"
              ? "Nigeria (Lagos Hub)"
              : sanitizedMarketCode === "ZM"
              ? "Zambia (Lusaka Hub)"
              : sanitizedMarketCode === "MW"
              ? "Malawi (Blantyre Hub)"
              : "All Markets (HQ Regional)",
          status: "active",
          assignedDeviceTag: assignedDeviceTag || "Unassigned Handset",
          assignedDeviceModel: assignedDeviceTag ? "Samsung Galaxy A15 Enterprise" : undefined,
          lastLogin: "Never (Pending First Login)",
          mfaEnabled: false,
          createdAt: new Date().toISOString().split("T")[0],
        },
        credentialSetup: {
          temporaryPassword: finalPassword,
          loginReady: true,
          mustChangeOnFirstLogin: false,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error in admin-provision-user:", message);
    return new Response(JSON.stringify({ error: `Internal server error: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
