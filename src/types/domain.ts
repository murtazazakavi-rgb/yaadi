export type UserRole = "super_admin" | "family_admin";
export type WorkspaceMemberRole = "owner" | "admin" | "viewer";
export type WorkspaceStatus = "active" | "inactive";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";
export type LivingStatus = "living" | "deceased";
export type ImportantDateType = "birthday" | "hijri_birthday_waras" | "passing_anniversary";
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
