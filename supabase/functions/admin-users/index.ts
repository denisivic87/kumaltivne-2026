import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication: verify the caller's JWT and check admin role ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nedostaje Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userToken = authHeader.replace("Bearer ", "");

    // Create a client with the caller's JWT (not service role key)
    const userClient = createClient(supabaseUrl, userToken, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Neispravan token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check that the caller has role='admin' and status='active' in public.users
    const { data: callerProfile, error: profileError } = await userClient
      .from("users")
      .select("role, status")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Profil korisnika nije pronađen" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerProfile.role !== "admin" || callerProfile.status !== "active") {
      return new Response(JSON.stringify({ error: "Pristup odbijen — potrebna admin rola" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Caller is verified admin; now use service role client for operations ---
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const path = url.pathname.replace("/admin-users", "");

    // GET /admin-users — list all users from public.users
    if (req.method === "GET" && (path === "" || path === "/")) {
      const { data, error } = await adminClient
        .from("users")
        .select("id, username, email, budget_user_id, treasury, role, status, created_at, pdf_display_name, auth_user_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /admin-users — create new user via Supabase Auth
    if (req.method === "POST" && (path === "" || path === "/")) {
      const body = await req.json();
      const { email, password, username, budget_user_id, treasury, role, status, pdf_display_name } = body;

      if (!email || !password || !username) {
        return new Response(JSON.stringify({ error: "Email, lozinka i korisničko ime su obavezni" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, budget_user_id, treasury, role: role || "user", pdf_display_name },
      });

      if (authError) throw authError;

      // Upsert public.users — handles both: trigger already created the row (UPDATE),
      // or trigger was blocked by RLS and row doesn't exist yet (INSERT)
      const { error: upsertError } = await adminClient
        .from("users")
        .upsert({
          auth_user_id: authData.user.id,
          email,
          username,
          budget_user_id: budget_user_id || "",
          treasury: treasury || "",
          role: role || "user",
          status: status || "active",
          pdf_display_name: pdf_display_name || null,
          is_active: status === "active",
        }, { onConflict: "auth_user_id", ignoreDuplicates: false });

      if (upsertError) throw upsertError;

      return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /admin-users/:id — update user status/profile
    if (req.method === "PUT" && path.startsWith("/")) {
      const userId = path.slice(1);
      const body = await req.json();

      const updates: Record<string, unknown> = {};
      if (body.status !== undefined) { updates.status = body.status; updates.is_active = body.status === "active"; }
      if (body.username !== undefined) updates.username = body.username;
      if (body.budget_user_id !== undefined) updates.budget_user_id = body.budget_user_id;
      if (body.treasury !== undefined) updates.treasury = body.treasury;
      if (body.pdf_display_name !== undefined) updates.pdf_display_name = body.pdf_display_name;
      if (body.role !== undefined) updates.role = body.role;

      const { error } = await adminClient.from("users").update(updates).eq("id", userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /admin-users/:id — delete user
    if (req.method === "DELETE" && path.startsWith("/")) {
      const userId = path.slice(1);

      // Get auth_user_id first
      const { data: userRow } = await adminClient
        .from("users")
        .select("auth_user_id")
        .eq("id", userId)
        .maybeSingle();

      if (userRow?.auth_user_id) {
        await adminClient.auth.admin.deleteUser(userRow.auth_user_id);
      }

      await adminClient.from("users").delete().eq("id", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Nepoznata greška";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
