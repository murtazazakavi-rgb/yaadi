import { createClient } from "npm:@supabase/supabase-js@2";
import { sendExpoPush, sendGmailReminder } from "../_shared/notificationProviders.ts";
import {
  FamilyWorkspace,
  ImportantDate,
  ImportantDateParticipant,
  Person,
  ReminderChannel,
  ReminderLog
} from "../_shared/domain.ts";
import {
  ReminderCandidate,
  ReminderRepository,
  runReminderEngine
} from "../_shared/reminderEngine.ts";

const supabaseUrl = requireSecret("SUPABASE_URL");
const serviceRoleKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (request) => {
  const runnerSecret = requireSecret("REMINDER_RUNNER_SECRET");
  if (request.headers.get("authorization") !== `Bearer ${runnerSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const workspaces = await loadDueWorkspaces();
    const repository = createReminderRepository(workspaces);
    const result = await runReminderEngine({ repository, channels: ["email", "app"] });
    const deliveries = await Promise.allSettled(result.candidates.map((candidate, index) =>
      deliverCandidate(candidate, result.createdLogs[index])
    ));

    return json({
      checkedWorkspaces: result.checkedWorkspaces,
      skippedWorkspaces: result.skippedWorkspaces,
      createdLogs: result.createdLogs.length,
      delivered: deliveries.filter((delivery) => delivery.status === "fulfilled").length,
      failed: deliveries.filter((delivery) => delivery.status === "rejected").length
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Reminder run failed." }, 500);
  }
});

function createReminderRepository(workspaces: FamilyWorkspace[]): ReminderRepository {
  return {
    async loadActiveWorkspaces() {
      return workspaces;
    },
    async loadImportantDates(workspaceId) {
      const [dates, participants] = await Promise.all([
        admin.from("important_dates").select("*").eq("workspace_id", workspaceId),
        admin.from("important_date_participants").select("*").eq("workspace_id", workspaceId)
      ]);
      assertNoError(dates.error);
      assertNoError(participants.error);
      const dateParticipants = (participants.data ?? []).map(mapParticipant);
      return (dates.data ?? []).map((row) => mapImportantDate(row, dateParticipants));
    },
    async loadPeople(workspaceId) {
      const { data, error } = await admin.from("people").select("*").eq("workspace_id", workspaceId);
      assertNoError(error);
      return (data ?? []).map(mapPerson);
    },
    async hasReminderLog(input) {
      const { data, error } = await admin
        .from("reminder_logs")
        .select("id")
        .eq("workspace_id", input.workspaceId)
        .eq("important_date_id", input.importantDateId)
        .eq("reminder_for_date", toYmd(input.reminderForDate))
        .eq("reminder_days_before", input.reminderDaysBefore)
        .eq("channel", input.channel)
        .maybeSingle();
      assertNoError(error);
      return Boolean(data);
    },
    async createReminderLog(input) {
      const { data, error } = await admin
        .from("reminder_logs")
        .insert({
          workspace_id: input.workspaceId,
          important_date_id: input.importantDateId,
          reminder_for_date: toYmd(input.reminderForDate),
          reminder_days_before: input.reminderDaysBefore,
          channel: input.channel,
          status: input.status
        })
        .select("*")
        .single();
      assertNoError(error);
      return mapReminderLog(data);
    }
  };
}

async function deliverCandidate(candidate: ReminderCandidate, log?: ReminderLog) {
  if (!log) {
    return;
  }
  try {
    if (candidate.channel === "email") {
      const emails = await loadAdminEmails(candidate.workspace.id);
      if (emails.length === 0) {
        await markLog(log.id, "skipped", "Workspace has no owner/admin email.");
        return;
      }
      await sendGmailReminder({
        to: emails,
        subject: "Yaadi reminder",
        text: candidate.message
      });
    } else if (candidate.channel === "app") {
      const tokens = await loadPushTokens(candidate.workspace.id);
      if (tokens.length === 0) {
        await markLog(log.id, "skipped", "Workspace admins have no Expo push tokens.");
        return;
      }
      await sendExpoPush(tokens, "Yaadi reminder", candidate.message);
    }
    await markLog(log.id, "sent");
  } catch (error) {
    await markLog(log.id, "failed", error instanceof Error ? error.message : "Notification delivery failed.");
    throw error;
  }
}

async function loadDueWorkspaces(): Promise<FamilyWorkspace[]> {
  const { data, error } = await admin
    .from("family_workspaces")
    .select("*")
    .eq("status", "active")
    .in("subscription_status", ["trial", "active"]);
  assertNoError(error);
  return (data ?? []).map(mapWorkspace).filter(isWorkspaceDue);
}

async function loadAdminEmails(workspaceId: string) {
  const { data: members, error } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .in("role", ["owner", "admin"]);
  assertNoError(error);
  const ids = (members ?? []).map((member) => member.user_id);
  if (ids.length === 0) {
    return [];
  }
  const { data: users, error: usersError } = await admin.from("users").select("email").in("id", ids);
  assertNoError(usersError);
  return (users ?? []).map((user) => user.email).filter(Boolean);
}

async function loadPushTokens(workspaceId: string) {
  const { data, error } = await admin.from("notification_tokens").select("token").eq("workspace_id", workspaceId);
  assertNoError(error);
  return data ?? [];
}

async function markLog(id: string, status: "sent" | "failed" | "skipped", errorMessage?: string) {
  const { error } = await admin
    .from("reminder_logs")
    .update({ status, error_message: errorMessage ?? null, sent_at: status === "sent" ? new Date().toISOString() : null })
    .eq("id", id);
  assertNoError(error);
}

function isWorkspaceDue(workspace: FamilyWorkspace) {
  const time = localizedTime(new Date(), workspace.timezone);
  return time.hour === workspace.reminderSendTime.slice(0, 2);
}

function localizedTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return {
    hour: parts.find((part) => part.type === "hour")?.value ?? "00",
    minute: parts.find((part) => part.type === "minute")?.value ?? "00"
  };
}

function mapWorkspace(row: Record<string, unknown>): FamilyWorkspace {
  return {
    id: row.id as string,
    name: row.name as string,
    ownerUserId: row.owner_user_id as string,
    status: row.status as FamilyWorkspace["status"],
    planId: row.plan_id as string | undefined,
    subscriptionStatus: row.subscription_status as FamilyWorkspace["subscriptionStatus"],
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at as string) : undefined,
    timezone: (row.timezone as string | undefined) ?? "Asia/Kolkata",
    reminderSendTime: String(row.reminder_send_time ?? "09:00").slice(0, 5)
  };
}

function mapPerson(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    firstName: row.first_name as string,
    middleName: row.middle_name as string | undefined,
    lastName: row.last_name as string | undefined,
    displayName: row.display_name as string | undefined,
    gender: row.gender as string | undefined,
    livingStatus: row.living_status as Person["livingStatus"],
    mobile: row.mobile as string | undefined,
    email: row.email as string | undefined,
    familyGroup: row.family_group as string | undefined,
    notes: row.notes as string | undefined
  };
}

function mapParticipant(row: Record<string, unknown>): ImportantDateParticipant {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    importantDateId: row.important_date_id as string,
    personId: row.person_id as string,
    participantRole: row.participant_role as string
  };
}

function mapImportantDate(row: Record<string, unknown>, participants: ImportantDateParticipant[]): ImportantDate {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    personId: row.person_id as string,
    participantPersonIds: participants.filter((participant) => participant.importantDateId === row.id).map((participant) => participant.personId),
    type: row.type as ImportantDate["type"],
    gregorianDate: row.gregorian_date ? parseYmd(row.gregorian_date as string) : undefined,
    hijriDay: row.hijri_day as number | undefined,
    hijriMonth: row.hijri_month as number | undefined,
    hijriYear: row.hijri_year as number | undefined,
    showYear: row.show_year as boolean,
    dateSource: row.date_source as ImportantDate["dateSource"],
    reminderDaysBefore: (row.reminder_days_before as number[]) ?? [7, 5, 2, 1, 0],
    notes: row.notes as string | undefined
  };
}

function mapReminderLog(row: Record<string, unknown>): ReminderLog {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    importantDateId: row.important_date_id as string,
    reminderForDate: parseYmd(row.reminder_for_date as string),
    reminderDaysBefore: row.reminder_days_before as number,
    channel: row.channel as ReminderChannel,
    status: row.status as ReminderLog["status"],
    sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
    errorMessage: row.error_message as string | undefined,
    createdAt: new Date(row.created_at as string)
  };
}

function parseYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function assertNoError(error: unknown) {
  if (error) {
    throw error;
  }
}

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
