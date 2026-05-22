import { createClient } from "npm:@supabase/supabase-js@2";
import { sendExpoPush, sendGmailReminder } from "../_shared/notificationProviders.ts";

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

    const body = await request.json();
    const workspaceId = body.workspaceId as string | undefined;
    if (!workspaceId) {
      return json({ error: "workspaceId is required." }, 400);
    }

    const { data: membership, error: membershipError } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (membershipError || !membership || !["owner", "admin"].includes(membership.role)) {
      return json({ error: "Workspace admin access required." }, 403);
    }

    const message = "Yaadi test reminder: notification delivery is ready for this family workspace.";
    if (auth.user.email) {
      await sendGmailReminder({
        to: [auth.user.email],
        subject: "Yaadi test reminder",
        text: message
      });
    }

    const { data: tokens, error: tokenError } = await admin
      .from("notification_tokens")
      .select("token")
      .eq("workspace_id", workspaceId)
      .eq("user_id", auth.user.id);
    if (tokenError) {
      throw tokenError;
    }
    await sendExpoPush(tokens ?? [], "Yaadi test reminder", message);

    return json({ ok: true, email: Boolean(auth.user.email), pushTokens: tokens?.length ?? 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Test reminder failed." }, 500);
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
