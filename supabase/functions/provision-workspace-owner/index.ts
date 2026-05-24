import { createClient } from "npm:@supabase/supabase-js@2";
import type { ProvisionWorkspaceOwnerInput } from "../_shared/domain.ts";

const supabaseUrl = requireSecret("SUPABASE_URL");
const serviceRoleKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (request) => {
  try {
    const bearer = request.headers.get("authorization");
    const jwt = bearer?.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return json({ error: "Authentication required." }, 401);
    }

    const { data: auth, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !auth.user) {
      return json({ error: "Authentication required." }, 401);
    }

    const { data: caller, error: callerError } = await admin
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (callerError) {
      throw callerError;
    }
    if (caller?.role !== "super_admin") {
      return json({ error: "Super admin access required." }, 403);
    }

    const input = await request.json() as ProvisionWorkspaceOwnerInput;
    const email = input.email?.trim().toLowerCase();
    const password = input.password ?? "";
    const workspaceName = input.workspaceName?.trim();
    if (!email || !password || password.length < 6 || !workspaceName) {
      return json({ error: "Email, password with at least 6 characters, and workspace name are required." }, 400);
    }

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName?.trim() || undefined,
        last_name: input.lastName?.trim() || undefined
      }
    });
    if (createUserError || !createdUser.user) {
      throw createUserError ?? new Error("User could not be created.");
    }

    const userId = createdUser.user.id;
    const { error: profileError } = await admin
      .from("users")
      .upsert({
        id: userId,
        email,
        first_name: input.firstName?.trim() || null,
        last_name: input.lastName?.trim() || null,
        role: "family_admin"
      }, { onConflict: "id" });
    if (profileError) {
      throw profileError;
    }

    const { data: plan } = await admin
      .from("plans")
      .select("id")
      .eq("name", "Family Plus")
      .limit(1)
      .maybeSingle();

    const { data: workspace, error: workspaceError } = await admin
      .from("family_workspaces")
      .insert({
        name: workspaceName,
        owner_user_id: userId,
        plan_id: plan?.id ?? null,
        subscription_status: "trial",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select("*")
      .single();
    if (workspaceError || !workspace) {
      throw workspaceError ?? new Error("Workspace could not be created.");
    }

    const { error: memberError } = await admin
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });
    if (memberError) {
      throw memberError;
    }

    const [{ error: settingsError }, { error: shareLinkError }] = await Promise.all([
      admin.from("reminder_settings").insert({ workspace_id: workspace.id }),
      admin.from("workspace_share_links").insert({ workspace_id: workspace.id })
    ]);
    if (settingsError || shareLinkError) {
      throw settingsError ?? shareLinkError;
    }

    return json({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      userId,
      email
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Provisioning failed." }, 500);
  }
});

function requireSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
