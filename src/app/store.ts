import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import {
  FamilyWorkspace,
  ImportantDate,
  ImportantDateParticipant,
  Person,
  PersonRelationship,
  Plan,
  PublicFamilySubmission,
  PublicSubmissionPayload,
  RelationshipType,
  ReminderChannel,
  User,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceShareLink
} from "../types/domain";
import { isSupabaseConfigured, supabase } from "../lib/supabase/client";
import { registerWorkspacePushToken } from "../lib/notifications/registerPushToken";

type NewPerson = Omit<Person, "id" | "workspaceId">;
type NewImportantDate = Omit<ImportantDate, "id" | "workspaceId"> & {
  participantPersonIds?: string[];
};

type YaadiState = {
  initialized: boolean;
  loading: boolean;
  error?: string;
  session: Session | null;
  profile?: User;
  workspaces: FamilyWorkspace[];
  workspace?: FamilyWorkspace;
  people: Person[];
  importantDates: ImportantDate[];
  dateParticipants: ImportantDateParticipant[];
  relationshipTypes: RelationshipType[];
  personRelationships: PersonRelationship[];
  plans: Plan[];
  shareLink?: WorkspaceShareLink;
  submissions: PublicFamilySubmission[];
  invitations: WorkspaceInvitation[];
  members: WorkspaceMember[];
  selectedPersonId?: string;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadWorkspaces: () => Promise<FamilyWorkspace[]>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<FamilyWorkspace>;
  setSelectedPersonId: (personId: string) => void;
  createPerson: (input: NewPerson) => Promise<Person>;
  updatePerson: (personId: string, input: Partial<NewPerson>) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;
  createImportantDate: (input: NewImportantDate) => Promise<void>;
  updateImportantDate: (importantDateId: string, input: NewImportantDate) => Promise<void>;
  deleteImportantDate: (importantDateId: string) => Promise<void>;
  loadRelationships: () => Promise<void>;
  createRelationship: (input: {
    personId: string;
    relatedPersonId: string;
    relationshipTypeId: string;
    notes?: string;
  }) => Promise<void>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
  saveReminderSettings: (input: { timezone: string; reminderSendTime: string; channels: ReminderChannel[]; days: number[] }) => Promise<void>;
  registerPushNotifications: () => Promise<string>;
  sendTestReminder: () => Promise<void>;
  loadAccessData: () => Promise<void>;
  setShareLinkEnabled: (enabled: boolean) => Promise<void>;
  replaceShareLink: () => Promise<void>;
  createAdminInvitation: (email: string) => Promise<void>;
  removeAdminMember: (memberId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<FamilyWorkspace>;
  approveSubmission: (submissionId: string) => Promise<void>;
  rejectSubmission: (submissionId: string) => Promise<void>;
  peopleCount: () => number;
  importantDatesCount: () => number;
};

export const useYaadiStore = create<YaadiState>((set, get) => ({
  initialized: false,
  loading: false,
  session: null,
  workspaces: [],
  people: [],
  importantDates: [],
  dateParticipants: [],
  relationshipTypes: [],
  personRelationships: [],
  plans: [],
  submissions: [],
  invitations: [],
  members: [],

  async bootstrap() {
    set({ loading: true, error: undefined });
    if (!isSupabaseConfigured) {
      set({
        initialized: true,
        loading: false,
        error: "Supabase is not configured yet. Add the Expo public Supabase URL and publishable key."
      });
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ initialized: true, loading: false, error: error.message });
      return;
    }

    set({ session: data.session });
    if (data.session) {
      await syncProfile();
      await get().loadWorkspaces();
      await loadPlans(set);
    }

    set({ initialized: true, loading: false });
  },

  async signIn(email, password) {
    set({ loading: true, error: undefined });
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }

    set({ session: data.session });
    await syncProfile();
    await Promise.all([get().loadWorkspaces(), loadPlans(set)]);
    set({ loading: false });
  },

  async signUp(email, password, firstName, lastName) {
    set({ loading: true, error: undefined });
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { first_name: firstName?.trim(), last_name: lastName?.trim() } }
    });
    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }

    set({ session: data.session });
    if (data.session) {
      await syncProfile();
      await Promise.all([get().loadWorkspaces(), loadPlans(set)]);
    }
    set({ loading: false });
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      set({ error: error.message });
      throw error;
    }
  },

  async signOut() {
    await supabase.auth.signOut();
    set({
      session: null,
      profile: undefined,
      workspaces: [],
      workspace: undefined,
      people: [],
      importantDates: [],
      dateParticipants: [],
      relationshipTypes: [],
      personRelationships: [],
      shareLink: undefined,
      submissions: [],
      invitations: [],
      members: [],
      selectedPersonId: undefined
    });
  },

  async loadWorkspaces() {
    if (!get().session) {
      set({ workspaces: [] });
      return [];
    }

    const { data, error } = await supabase
      .from("family_workspaces")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      set({ error: error.message });
      throw error;
    }

    const workspaces = (data ?? []).map(mapWorkspace);
    set({ workspaces });
    return workspaces;
  },

  async selectWorkspace(workspaceId) {
    set({ loading: true, error: undefined });
    const workspace = get().workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      const error = new Error("Workspace not found.");
      set({ loading: false, error: error.message });
      throw error;
    }

    const [
      peopleResult,
      datesResult,
      participantsResult,
      relationshipTypesResult,
      relationshipsResult
    ] = await Promise.all([
      supabase.from("people").select("*").eq("workspace_id", workspaceId).order("first_name"),
      supabase.from("important_dates").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("important_date_participants").select("*").eq("workspace_id", workspaceId),
      supabase
        .from("relationship_types")
        .select("*")
        .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        .order("category")
        .order("name"),
      supabase.from("person_relationships").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false })
    ]);

    const error =
      peopleResult.error ??
      datesResult.error ??
      participantsResult.error ??
      relationshipTypesResult.error ??
      relationshipsResult.error;
    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }

    const participants = (participantsResult.data ?? []).map(mapParticipant);
    const importantDates = (datesResult.data ?? []).map((row) =>
      mapImportantDate(
        row,
        participants.filter((participant) => participant.importantDateId === row.id)
      )
    );
    const people = (peopleResult.data ?? []).map(mapPerson);

    set({
      workspace,
      people,
      importantDates,
      dateParticipants: participants,
      relationshipTypes: (relationshipTypesResult.data ?? []).map(mapRelationshipType),
      personRelationships: (relationshipsResult.data ?? []).map(mapPersonRelationship),
      selectedPersonId: get().selectedPersonId ?? people[0]?.id,
      loading: false
    });
    await get().loadAccessData();
  },

  async createWorkspace(name) {
    const { data, error } = await supabase.rpc("create_family_workspace", { workspace_name: name.trim() });
    if (error || !data) {
      set({ error: error?.message ?? "Workspace could not be created." });
      throw error ?? new Error("Workspace could not be created.");
    }

    const workspace = mapWorkspace(data);
    await get().loadWorkspaces();
    await get().selectWorkspace(workspace.id);
    return workspace;
  },

  setSelectedPersonId(personId) {
    set({ selectedPersonId: personId });
  },

  async createPerson(input) {
    const workspace = requireWorkspace(get());
    const { data, error } = await supabase
      .from("people")
      .insert(toPersonRow(workspace.id, input))
      .select("*")
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Person could not be saved." });
      throw error ?? new Error("Person could not be saved.");
    }

    const person = mapPerson(data);
    set({ people: [...get().people, person], selectedPersonId: person.id });
    return person;
  },

  async updatePerson(personId, input) {
    const { data, error } = await supabase
      .from("people")
      .update(toPersonPatch(input))
      .eq("id", personId)
      .select("*")
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Person could not be updated." });
      throw error ?? new Error("Person could not be updated.");
    }

    const person = mapPerson(data);
    set({ people: get().people.map((item) => (item.id === person.id ? person : item)) });
  },

  async deletePerson(personId) {
    const { error } = await supabase.from("people").delete().eq("id", personId);
    if (error) {
      set({ error: error.message });
      throw error;
    }

    set({
      people: get().people.filter((person) => person.id !== personId),
      importantDates: get().importantDates.filter((date) => date.personId !== personId),
      personRelationships: get().personRelationships.filter((relationship) =>
        relationship.personId !== personId && relationship.relatedPersonId !== personId
      ),
      selectedPersonId: get().people.find((person) => person.id !== personId)?.id
    });
  },

  async createImportantDate(input) {
    const workspace = requireWorkspace(get());
    const { participantPersonIds, ...date } = input;
    const { data, error } = await supabase
      .from("important_dates")
      .insert(toImportantDateRow(workspace.id, date))
      .select("*")
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Important date could not be saved." });
      throw error ?? new Error("Important date could not be saved.");
    }

    const participantIds = unique([date.personId, ...(participantPersonIds ?? [])]);
    const participantRows = participantIds.map((personId, index) => ({
      workspace_id: workspace.id,
      important_date_id: data.id,
      person_id: personId,
      participant_role: index === 0 ? "subject" : "partner"
    }));
    const participantResult = await supabase
      .from("important_date_participants")
      .insert(participantRows)
      .select("*");
    if (participantResult.error) {
      set({ error: participantResult.error.message });
      throw participantResult.error;
    }

    const participants = (participantResult.data ?? []).map(mapParticipant);
    set({
      dateParticipants: [...get().dateParticipants, ...participants],
      importantDates: [mapImportantDate(data, participants), ...get().importantDates]
    });
  },

  async updateImportantDate(importantDateId, input) {
    const workspace = requireWorkspace(get());
    const { participantPersonIds, ...date } = input;
    const { data, error } = await supabase
      .from("important_dates")
      .update(toImportantDateRow(workspace.id, date))
      .eq("id", importantDateId)
      .select("*")
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Important date could not be updated." });
      throw error ?? new Error("Important date could not be updated.");
    }

    const removeResult = await supabase.from("important_date_participants").delete().eq("important_date_id", importantDateId);
    if (removeResult.error) {
      set({ error: removeResult.error.message });
      throw removeResult.error;
    }

    const participantIds = unique([date.personId, ...(participantPersonIds ?? [])]);
    const participantResult = await supabase
      .from("important_date_participants")
      .insert(participantIds.map((personId, index) => ({
        workspace_id: workspace.id,
        important_date_id: importantDateId,
        person_id: personId,
        participant_role: index === 0 ? "subject" : "partner"
      })))
      .select("*");
    if (participantResult.error) {
      set({ error: participantResult.error.message });
      throw participantResult.error;
    }

    const participants = (participantResult.data ?? []).map(mapParticipant);
    set({
      dateParticipants: [
        ...get().dateParticipants.filter((participant) => participant.importantDateId !== importantDateId),
        ...participants
      ],
      importantDates: get().importantDates.map((item) =>
        item.id === importantDateId ? mapImportantDate(data, participants) : item
      )
    });
  },

  async deleteImportantDate(importantDateId) {
    const { error } = await supabase.from("important_dates").delete().eq("id", importantDateId);
    if (error) {
      set({ error: error.message });
      throw error;
    }

    set({
      importantDates: get().importantDates.filter((date) => date.id !== importantDateId),
      dateParticipants: get().dateParticipants.filter((participant) => participant.importantDateId !== importantDateId)
    });
  },

  async loadRelationships() {
    const workspace = requireWorkspace(get());
    const [typesResult, relationshipsResult] = await Promise.all([
      supabase
        .from("relationship_types")
        .select("*")
        .or(`workspace_id.is.null,workspace_id.eq.${workspace.id}`)
        .order("category")
        .order("name"),
      supabase
        .from("person_relationships")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
    ]);
    const error = typesResult.error ?? relationshipsResult.error;
    if (error) {
      set({ error: error.message });
      throw error;
    }

    set({
      relationshipTypes: (typesResult.data ?? []).map(mapRelationshipType),
      personRelationships: (relationshipsResult.data ?? []).map(mapPersonRelationship)
    });
  },

  async createRelationship(input) {
    const workspace = requireWorkspace(get());
    if (input.personId === input.relatedPersonId) {
      const error = new Error("Choose two different people.");
      set({ error: error.message });
      throw error;
    }

    const relationshipType = get().relationshipTypes.find((type) => type.id === input.relationshipTypeId);
    const { data, error } = await supabase
      .from("person_relationships")
      .insert({
        workspace_id: workspace.id,
        person_id: input.personId,
        related_person_id: input.relatedPersonId,
        relationship_type_id: input.relationshipTypeId,
        core_tree_relationship: relationshipType?.treeMapping ?? "none",
        notes: optional(input.notes)
      })
      .select("*")
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Relationship could not be saved." });
      throw error ?? new Error("Relationship could not be saved.");
    }

    set({ personRelationships: [mapPersonRelationship(data), ...get().personRelationships] });
  },

  async deleteRelationship(relationshipId) {
    const { error } = await supabase.from("person_relationships").delete().eq("id", relationshipId);
    if (error) {
      set({ error: error.message });
      throw error;
    }

    set({ personRelationships: get().personRelationships.filter((relationship) => relationship.id !== relationshipId) });
  },

  async saveReminderSettings(input) {
    const workspace = requireWorkspace(get());
    const workspaceResult = await supabase
      .from("family_workspaces")
      .update({ timezone: input.timezone.trim(), reminder_send_time: input.reminderSendTime })
      .eq("id", workspace.id)
      .select("*")
      .single();
    const existingSettings = await supabase
      .from("reminder_settings")
      .select("id")
      .eq("workspace_id", workspace.id)
      .is("user_id", null)
      .maybeSingle();
    const settingsPayload = {
        workspace_id: workspace.id,
        user_id: null,
        channels: input.channels,
        default_days_before: input.days
    };
    const settingsResult = existingSettings.data
      ? await supabase.from("reminder_settings").update(settingsPayload).eq("id", existingSettings.data.id)
      : await supabase.from("reminder_settings").insert(settingsPayload);
    const error = workspaceResult.error ?? existingSettings.error ?? settingsResult.error;
    if (error || !workspaceResult.data) {
      set({ error: error?.message ?? "Reminder settings could not be saved." });
      throw error ?? new Error("Reminder settings could not be saved.");
    }

    const nextWorkspace = mapWorkspace(workspaceResult.data);
    set({
      workspace: nextWorkspace,
      workspaces: get().workspaces.map((item) => (item.id === nextWorkspace.id ? nextWorkspace : item))
    });
  },

  async registerPushNotifications() {
    const workspace = requireWorkspace(get());
    const userId = requireSessionUserId(get());
    return registerWorkspacePushToken({ userId, workspaceId: workspace.id });
  },

  async sendTestReminder() {
    const workspace = requireWorkspace(get());
    const { error } = await supabase.functions.invoke("send-test-reminder", {
      body: { workspaceId: workspace.id }
    });
    if (error) {
      set({ error: error.message });
      throw error;
    }
  },

  async loadAccessData() {
    const workspace = get().workspace;
    if (!workspace) {
      return;
    }

    const [shareResult, submissionsResult, invitationsResult, membersResult] = await Promise.all([
      supabase.from("workspace_share_links").select("*").eq("workspace_id", workspace.id).maybeSingle(),
      supabase
        .from("public_family_submissions")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("workspace_members")
        .select("id, workspace_id, user_id, role, users(email, first_name, last_name)")
        .eq("workspace_id", workspace.id)
    ]);
    const error = shareResult.error ?? submissionsResult.error ?? invitationsResult.error ?? membersResult.error;
    if (error) {
      set({ error: error.message });
      throw error;
    }

    set({
      shareLink: shareResult.data ? mapShareLink(shareResult.data) : undefined,
      submissions: (submissionsResult.data ?? []).map(mapSubmission),
      invitations: (invitationsResult.data ?? []).map(mapInvitation),
      members: (membersResult.data ?? []).map(mapMember)
    });
  },

  async setShareLinkEnabled(enabled) {
    const shareLink = get().shareLink;
    if (!shareLink) {
      throw new Error("Workspace share link is unavailable.");
    }

    const { data, error } = await supabase
      .from("workspace_share_links")
      .update({ enabled })
      .eq("id", shareLink.id)
      .select("*")
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Share link could not be updated." });
      throw error ?? new Error("Share link could not be updated.");
    }

    set({ shareLink: mapShareLink(data) });
  },

  async replaceShareLink() {
    const workspace = requireWorkspace(get());
    const { data, error } = await supabase.rpc("replace_workspace_share_link", { target_workspace_id: workspace.id });
    if (error || !data) {
      set({ error: error?.message ?? "Share link could not be replaced." });
      throw error ?? new Error("Share link could not be replaced.");
    }

    set({ shareLink: mapShareLink(data) });
  },

  async createAdminInvitation(email) {
    const workspace = requireWorkspace(get());
    const userId = requireSessionUserId(get());
    const { data, error } = await supabase
      .from("workspace_invitations")
      .insert({ workspace_id: workspace.id, email: email.trim(), role: "admin", invited_by: userId })
      .select("*")
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Invitation could not be created." });
      throw error ?? new Error("Invitation could not be created.");
    }

    set({ invitations: [mapInvitation(data), ...get().invitations] });
  },

  async removeAdminMember(memberId) {
    const { error } = await supabase.rpc("remove_workspace_admin", { target_member_id: memberId });
    if (error) {
      set({ error: error.message });
      throw error;
    }
    set({ members: get().members.filter((member) => member.id !== memberId) });
  },

  async acceptInvitation(token) {
    const { data, error } = await supabase.rpc("accept_workspace_invitation", { invitation_token: token });
    if (error || !data) {
      set({ error: error?.message ?? "Invitation could not be accepted." });
      throw error ?? new Error("Invitation could not be accepted.");
    }

    const workspaces = await get().loadWorkspaces();
    const workspace = workspaces.find((item) => item.id === data);
    if (!workspace) {
      throw new Error("Invitation accepted but workspace is not available yet.");
    }
    await get().selectWorkspace(workspace.id);
    return workspace;
  },

  async approveSubmission(submissionId) {
    const submission = get().submissions.find((item) => item.id === submissionId);
    if (!submission) {
      throw new Error("Submission not found.");
    }

    const workspace = requireWorkspace(get());
    const createdByClientId = new Map<string, Person>();
    for (const personInput of submission.payload.people) {
      const person = await get().createPerson({
        firstName: personInput.firstName,
        middleName: personInput.middleName,
        lastName: personInput.lastName,
        displayName: personInput.displayName,
        gender: personInput.gender,
        livingStatus: personInput.livingStatus,
        mobile: personInput.mobile,
        email: personInput.email,
        familyGroup: personInput.familyGroup,
        notes: personInput.notes
      });
      createdByClientId.set(personInput.clientId, person);
      await createSubmittedPersonDates(get(), person, personInput);
    }

    for (const wedding of submission.payload.weddings) {
      const first = createdByClientId.get(wedding.firstPersonClientId);
      const second = createdByClientId.get(wedding.secondPersonClientId);
      if (!first || !second || !wedding.weddingDate) {
        continue;
      }

      await get().createImportantDate({
        personId: first.id,
        participantPersonIds: [first.id, second.id],
        type: "wedding_anniversary",
        gregorianDate: parseYmd(wedding.weddingDate),
        showYear: true,
        reminderDaysBefore: [7, 5, 2, 1, 0],
        notes: wedding.notes
      });
    }

    await reviewSubmission(submissionId, "approved", set, get);
  },

  async rejectSubmission(submissionId) {
    await reviewSubmission(submissionId, "rejected", set, get);
  },

  peopleCount() {
    return get().people.length;
  },

  importantDatesCount() {
    return get().importantDates.length;
  }
}));

async function loadPlans(set: (partial: Partial<YaadiState>) => void) {
  const { data, error } = await supabase.from("plans").select("*").order("price_monthly");
  if (error) {
    set({ error: error.message });
    return;
  }

  set({ plans: (data ?? []).map(mapPlan) });
}

async function syncProfile() {
  const { error } = await supabase.rpc("sync_current_user_profile");
  if (error) {
    throw error;
  }
}

async function createSubmittedPersonDates(state: YaadiState, person: Person, input: PublicSubmissionPayload["people"][number]) {
  if (input.birthday) {
    await state.createImportantDate({
      personId: person.id,
      type: "birthday",
      gregorianDate: parseYmd(input.birthday),
      showYear: true,
      reminderDaysBefore: [7, 5, 2, 1, 0]
    });
  }

  if (input.hijriBirthdayDay && input.hijriBirthdayMonth) {
    await state.createImportantDate({
      personId: person.id,
      type: "hijri_birthday_waras",
      hijriDay: input.hijriBirthdayDay,
      hijriMonth: input.hijriBirthdayMonth,
      hijriYear: input.hijriBirthdayYear,
      reminderDaysBefore: [7, 5, 2, 1, 0]
    });
  }

  if (input.passingDate) {
    await state.createImportantDate({
      personId: person.id,
      type: "passing_anniversary",
      gregorianDate: parseYmd(input.passingDate),
      reminderDaysBefore: [7, 5, 2, 1, 0]
    });
  }
}

async function reviewSubmission(
  submissionId: string,
  status: "approved" | "rejected",
  set: (partial: Partial<YaadiState>) => void,
  get: () => YaadiState
) {
  const { data, error } = await supabase
    .from("public_family_submissions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", submissionId)
    .select("*")
    .single();
  if (error || !data) {
    set({ error: error?.message ?? "Submission could not be reviewed." });
    throw error ?? new Error("Submission could not be reviewed.");
  }

  set({ submissions: get().submissions.map((item) => (item.id === submissionId ? mapSubmission(data) : item)) });
}

function requireWorkspace(state: YaadiState): FamilyWorkspace {
  if (!state.workspace) {
    throw new Error("Select a family workspace first.");
  }

  return state.workspace;
}

function requireSessionUserId(state: YaadiState): string {
  const userId = state.session?.user.id;
  if (!userId) {
    throw new Error("Sign in first.");
  }

  return userId;
}

function mapWorkspace(row: Record<string, any>): FamilyWorkspace {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    status: row.status,
    planId: row.plan_id ?? undefined,
    subscriptionStatus: row.subscription_status,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : undefined,
    timezone: row.timezone ?? "Asia/Kolkata",
    reminderSendTime: String(row.reminder_send_time ?? "09:00").slice(0, 5)
  };
}

function mapPerson(row: Record<string, any>): Person {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    firstName: row.first_name,
    middleName: row.middle_name ?? undefined,
    lastName: row.last_name ?? undefined,
    displayName: row.display_name ?? undefined,
    gender: row.gender ?? undefined,
    livingStatus: row.living_status,
    mobile: row.mobile ?? undefined,
    email: row.email ?? undefined,
    familyGroup: row.family_group ?? undefined,
    notes: row.notes ?? undefined
  };
}

function mapImportantDate(row: Record<string, any>, participants: ImportantDateParticipant[]): ImportantDate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    personId: row.person_id,
    participantPersonIds: participants.map((participant) => participant.personId),
    type: row.type,
    gregorianDate: row.gregorian_date ? parseYmd(row.gregorian_date) : undefined,
    hijriDay: row.hijri_day ?? undefined,
    hijriMonth: row.hijri_month ?? undefined,
    hijriYear: row.hijri_year ?? undefined,
    showYear: row.show_year,
    dateSource: row.date_source ?? undefined,
    reminderDaysBefore: row.reminder_days_before ?? [7, 5, 2, 1, 0],
    notes: row.notes ?? undefined
  };
}

function mapParticipant(row: Record<string, any>): ImportantDateParticipant {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    importantDateId: row.important_date_id,
    personId: row.person_id,
    participantRole: row.participant_role
  };
}

function mapRelationshipType(row: Record<string, any>): RelationshipType {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    name: row.name,
    category: row.category,
    inverseName: row.inverse_name ?? undefined,
    treeMapping: row.tree_mapping,
    isSystemDefault: row.is_system_default
  };
}

function mapPersonRelationship(row: Record<string, any>): PersonRelationship {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    personId: row.person_id,
    relatedPersonId: row.related_person_id,
    relationshipTypeId: row.relationship_type_id,
    coreTreeRelationship: row.core_tree_relationship,
    notes: row.notes ?? undefined
  };
}

function mapPlan(row: Record<string, any>): Plan {
  return {
    id: row.id,
    name: row.name,
    priceMonthly: row.price_monthly,
    priceYearly: row.price_yearly,
    maxPeople: row.max_people,
    maxAdmins: row.max_admins,
    whatsappEnabled: row.whatsapp_enabled,
    exportEnabled: row.export_enabled,
    futureTreeEnabled: row.future_tree_enabled
  };
}

function mapShareLink(row: Record<string, any>): WorkspaceShareLink {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    token: row.token,
    enabled: row.enabled,
    replacedAt: row.replaced_at ? new Date(row.replaced_at) : undefined
  };
}

function mapSubmission(row: Record<string, any>): PublicFamilySubmission {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    submitterName: row.submitter_name,
    submitterEmail: row.submitter_email ?? undefined,
    submitterMobile: row.submitter_mobile ?? undefined,
    payload: row.payload,
    status: row.status,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
    reviewNotes: row.review_notes ?? undefined,
    createdAt: new Date(row.created_at)
  };
}

function mapInvitation(row: Record<string, any>): WorkspaceInvitation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    token: row.token,
    status: row.status,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at)
  };
}

function mapMember(row: Record<string, any>): WorkspaceMember {
  const profile = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    email: profile?.email ?? undefined,
    name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined
  };
}

function toPersonRow(workspaceId: string, input: NewPerson) {
  return { workspace_id: workspaceId, ...toPersonPatch(input) };
}

function toPersonPatch(input: Partial<NewPerson>) {
  return {
    ...(input.firstName !== undefined ? { first_name: input.firstName.trim() } : {}),
    ...(input.middleName !== undefined ? { middle_name: optional(input.middleName) } : {}),
    ...(input.lastName !== undefined ? { last_name: optional(input.lastName) } : {}),
    ...(input.displayName !== undefined ? { display_name: optional(input.displayName) } : {}),
    ...(input.gender !== undefined ? { gender: optional(input.gender) } : {}),
    ...(input.livingStatus !== undefined ? { living_status: input.livingStatus } : {}),
    ...(input.mobile !== undefined ? { mobile: optional(input.mobile) } : {}),
    ...(input.email !== undefined ? { email: optional(input.email) } : {}),
    ...(input.familyGroup !== undefined ? { family_group: optional(input.familyGroup) } : {}),
    ...(input.notes !== undefined ? { notes: optional(input.notes) } : {})
  };
}

function toImportantDateRow(workspaceId: string, input: Omit<NewImportantDate, "participantPersonIds">) {
  return {
    workspace_id: workspaceId,
    person_id: input.personId,
    type: input.type,
    gregorian_date: input.gregorianDate ? toYmd(input.gregorianDate) : null,
    hijri_day: input.hijriDay ?? null,
    hijri_month: input.hijriMonth ?? null,
    hijri_year: input.hijriYear ?? null,
    show_year: input.showYear ?? false,
    date_source: input.dateSource ?? null,
    reminder_days_before: input.reminderDaysBefore,
    notes: optional(input.notes)
  };
}

function parseYmd(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function optional(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
