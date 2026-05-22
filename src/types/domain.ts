export type UserRole = "super_admin" | "family_admin";
export type WorkspaceMemberRole = "owner" | "admin" | "viewer";
export type WorkspaceStatus = "active" | "inactive";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";
export type LivingStatus = "living" | "deceased";
export type ImportantDateType = "birthday" | "hijri_birthday_waras" | "passing_anniversary" | "wedding_anniversary";
export type DateSource = "confirmed" | "calculated" | "approximate" | "not_sure";
export type ReminderChannel = "app" | "email" | "whatsapp" | "sms";
export type ReminderStatus = "pending" | "sent" | "failed" | "skipped";
export type TreeMapping = "parent" | "child" | "spouse" | "sibling" | "none";

export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  role: UserRole;
};

export type FamilyWorkspace = {
  id: string;
  name: string;
  ownerUserId: string;
  status: WorkspaceStatus;
  planId?: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date;
  timezone: string;
  reminderSendTime: string;
};

export type Person = {
  id: string;
  workspaceId: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  gender?: string;
  livingStatus: LivingStatus;
  mobile?: string;
  email?: string;
  familyGroup?: string;
  notes?: string;
};

export type ImportantDate = {
  id: string;
  workspaceId: string;
  personId: string;
  participantPersonIds?: string[];
  type: ImportantDateType;
  gregorianDate?: Date;
  hijriDay?: number;
  hijriMonth?: number;
  hijriYear?: number;
  showYear?: boolean;
  dateSource?: DateSource;
  reminderDaysBefore: number[];
  notes?: string;
};

export type ImportantDateParticipant = {
  id: string;
  workspaceId: string;
  importantDateId: string;
  personId: string;
  participantRole: string;
};

export type RelationshipType = {
  id: string;
  workspaceId?: string;
  name: string;
  category: string;
  inverseName?: string;
  treeMapping: TreeMapping;
  isSystemDefault: boolean;
};

export type PersonRelationship = {
  id: string;
  workspaceId: string;
  personId: string;
  relatedPersonId: string;
  relationshipTypeId: string;
  coreTreeRelationship: TreeMapping;
  notes?: string;
};

export type ReminderLog = {
  id: string;
  workspaceId: string;
  importantDateId: string;
  reminderForDate: Date;
  reminderDaysBefore: number;
  channel: ReminderChannel;
  status: ReminderStatus;
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
};

export type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxPeople: number;
  maxAdmins: number;
  whatsappEnabled: boolean;
  exportEnabled: boolean;
  futureTreeEnabled: boolean;
};

export type WorkspaceShareLink = {
  id: string;
  workspaceId: string;
  token: string;
  enabled: boolean;
  replacedAt?: Date;
};

export type PublicSubmissionPersonInput = {
  clientId: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  relationshipToSubmitter?: string;
  familySide?: string;
  gender?: string;
  livingStatus: LivingStatus;
  mobile?: string;
  email?: string;
  familyGroup?: string;
  canReceiveReminders?: "yes" | "no" | "not_sure";
  notes?: string;
  birthday?: string;
  hijriBirthdayDay?: number;
  hijriBirthdayMonth?: number;
  hijriBirthdayYear?: number;
  passingDate?: string;
  passingHijriDay?: number;
  passingHijriMonth?: number;
  passingHijriYear?: number;
  createPassingReminder?: boolean;
};

export type PublicSubmissionWeddingInput = {
  firstPersonClientId: string;
  secondPersonClientId: string;
  weddingDate: string;
  notes?: string;
};

export type PublicSubmissionPayload = {
  meta?: {
    submitterFamilyRelation?: string;
  };
  people: PublicSubmissionPersonInput[];
  weddings: PublicSubmissionWeddingInput[];
};

export type PublicFamilySubmission = {
  id: string;
  workspaceId: string;
  submitterName: string;
  submitterEmail?: string;
  submitterMobile?: string;
  payload: PublicSubmissionPayload;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
};

export type WorkspaceInvitation = {
  id: string;
  workspaceId: string;
  email: string;
  role: "owner" | "admin";
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: Date;
  createdAt: Date;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  email?: string;
  name?: string;
};
