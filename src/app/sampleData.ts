import { FamilyWorkspace, ImportantDate, Person, Plan } from "../types/domain";
import { makeLocalDate } from "../lib/calendar/dateConversion";

export const sampleWorkspace: FamilyWorkspace = {
  id: "workspace-1",
  name: "Murtaza Family",
  ownerUserId: "user-1",
  status: "active",
  planId: "22222222-2222-4222-8222-222222222222",
  subscriptionStatus: "trial",
  trialEndsAt: makeLocalDate(2026, 6, 5)
};

export const samplePlans: Plan[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Basic Family",
    priceMonthly: 99,
    priceYearly: 999,
    maxPeople: 50,
    maxAdmins: 1,
    whatsappEnabled: false,
    exportEnabled: false,
    futureTreeEnabled: false
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Family Plus",
    priceMonthly: 199,
    priceYearly: 1999,
    maxPeople: 250,
    maxAdmins: 3,
    whatsappEnabled: false,
    exportEnabled: true,
    futureTreeEnabled: true
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Premium Family",
    priceMonthly: 399,
    priceYearly: 3999,
    maxPeople: 1000,
    maxAdmins: 10,
    whatsappEnabled: true,
    exportEnabled: true,
    futureTreeEnabled: true
  }
];

export const samplePeople: Person[] = [
  {
    id: "person-1",
    workspaceId: "workspace-1",
    firstName: "Fatema",
    lastName: "Ben",
    livingStatus: "living",
    familyGroup: "Ahmedabad"
  },
  {
    id: "person-2",
    workspaceId: "workspace-1",
    firstName: "Husain",
    lastName: "Bhai",
    livingStatus: "living",
    familyGroup: "Mumbai"
  },
  {
    id: "person-3",
    workspaceId: "workspace-1",
    firstName: "Marhoom Abbas",
    lastName: "Bhai",
    livingStatus: "deceased",
    familyGroup: "Surat"
  }
];

export const sampleImportantDates: ImportantDate[] = [
  {
    id: "date-1",
    workspaceId: "workspace-1",
    personId: "person-1",
    type: "birthday",
    gregorianDate: makeLocalDate(1995, 5, 29),
    showYear: true,
    reminderDaysBefore: [7, 5, 2, 1, 0]
  },
  {
    id: "date-2",
    workspaceId: "workspace-1",
    personId: "person-2",
    type: "hijri_birthday_waras",
    hijriDay: 8,
    hijriMonth: 7,
    hijriYear: 1412,
    dateSource: "confirmed",
    reminderDaysBefore: [7, 5, 2, 1, 0]
  },
  {
    id: "date-3",
    workspaceId: "workspace-1",
    personId: "person-3",
    type: "passing_anniversary",
    gregorianDate: makeLocalDate(2020, 5, 23),
    reminderDaysBefore: [7, 5, 2, 1, 0]
  }
];
