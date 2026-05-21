import { FamilyWorkspace, Plan } from "../../types/domain";

export type SubscriptionGateInput = {
  workspace: FamilyWorkspace;
  plan?: Plan;
  peopleCount: number;
  adminsCount: number;
  today?: Date;
};

export type SubscriptionGate = {
  canView: boolean;
  canAddPeople: boolean;
  canSendReminders: boolean;
  canInviteAdmin: boolean;
  showUpgradeCta: boolean;
  reason?: string;
};

const TRIAL_PEOPLE_LIMIT = 10;

export function evaluateSubscriptionGate(input: SubscriptionGateInput): SubscriptionGate {
  const today = input.today ?? new Date();

  if (input.workspace.status !== "active") {
    return blocked("This family workspace is inactive.");
  }

  if (input.workspace.subscriptionStatus === "trial") {
    const trialExpired = input.workspace.trialEndsAt ? input.workspace.trialEndsAt < today : false;
    if (trialExpired) {
      return {
        canView: true,
        canAddPeople: false,
        canSendReminders: false,
        canInviteAdmin: false,
        showUpgradeCta: true,
        reason: "Your trial has ended."
      };
    }

    return {
      canView: true,
      canAddPeople: input.peopleCount < TRIAL_PEOPLE_LIMIT,
      canSendReminders: true,
      canInviteAdmin: false,
      showUpgradeCta: input.peopleCount >= TRIAL_PEOPLE_LIMIT,
      reason: input.peopleCount >= TRIAL_PEOPLE_LIMIT ? "The free trial is limited to 10 people." : undefined
    };
  }

  if (input.workspace.subscriptionStatus !== "active") {
    return {
      canView: true,
      canAddPeople: false,
      canSendReminders: false,
      canInviteAdmin: false,
      showUpgradeCta: true,
      reason: "Upgrade to keep adding dates and receiving reminders."
    };
  }

  const maxPeople = input.plan?.maxPeople ?? 0;
  const maxAdmins = input.plan?.maxAdmins ?? 0;

  return {
    canView: true,
    canAddPeople: input.peopleCount < maxPeople,
    canSendReminders: true,
    canInviteAdmin: input.adminsCount < maxAdmins,
    showUpgradeCta: input.peopleCount >= maxPeople || input.adminsCount >= maxAdmins,
    reason: input.peopleCount >= maxPeople ? "This plan has reached its people limit." : undefined
  };
}

function blocked(reason: string): SubscriptionGate {
  return {
    canView: false,
    canAddPeople: false,
    canSendReminders: false,
    canInviteAdmin: false,
    showUpgradeCta: true,
    reason
  };
}
