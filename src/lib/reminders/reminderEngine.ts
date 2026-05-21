import {
  calculateGregorianAge,
  calculateYearsSincePassing,
  daysUntil,
  formatHijriDayMonth,
  getNextGregorianBirthdayOccurrence,
  getNextHijriBirthdayWarasOccurrence,
  getNextPassingAnniversaryOccurrence,
  gregorianToHijri,
  startOfLocalDay
} from "../calendar/dateConversion";
import { FamilyWorkspace, ImportantDate, Person, ReminderChannel, ReminderLog } from "../../types/domain";

const DEFAULT_REMINDER_DAYS = [7, 5, 2, 1, 0] as const;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["trial", "active"]);
const DEFAULT_CHANNELS: ReminderChannel[] = ["app", "email"];

export type ReminderCandidate = {
  workspace: FamilyWorkspace;
  importantDate: ImportantDate;
  person: Person;
  occurrenceDate: Date;
  reminderDaysBefore: number;
  channel: ReminderChannel;
  message: string;
};

export type ReminderRepository = {
  loadActiveWorkspaces(): Promise<FamilyWorkspace[]>;
  loadImportantDates(workspaceId: string): Promise<ImportantDate[]>;
  loadPeople(workspaceId: string): Promise<Person[]>;
  hasReminderLog(input: {
    workspaceId: string;
    importantDateId: string;
    reminderForDate: Date;
    reminderDaysBefore: number;
    channel: ReminderChannel;
  }): Promise<boolean>;
  createReminderLog(input: Omit<ReminderLog, "id" | "createdAt">): Promise<ReminderLog>;
};

export type ReminderRunResult = {
  checkedWorkspaces: number;
  skippedWorkspaces: number;
  createdLogs: ReminderLog[];
  candidates: ReminderCandidate[];
};

export async function runReminderEngine(input: {
  repository: ReminderRepository;
  today?: Date;
  channels?: ReminderChannel[];
}): Promise<ReminderRunResult> {
  const today = startOfLocalDay(input.today ?? new Date());
  const channels = input.channels ?? DEFAULT_CHANNELS;
  const workspaces = await input.repository.loadActiveWorkspaces();
  const createdLogs: ReminderLog[] = [];
  const candidates: ReminderCandidate[] = [];
  let skippedWorkspaces = 0;

  for (const workspace of workspaces) {
    if (!shouldProcessWorkspace(workspace, today)) {
      skippedWorkspaces += 1;
      continue;
    }

    const [importantDates, people] = await Promise.all([
      input.repository.loadImportantDates(workspace.id),
      input.repository.loadPeople(workspace.id)
    ]);
    const peopleById = new Map(people.map((person) => [person.id, person]));

    for (const importantDate of importantDates) {
      const person = peopleById.get(importantDate.personId);
      if (!person) {
        continue;
      }

      const occurrenceDate = getOccurrenceDate(importantDate, today);
      const offset = daysUntil(occurrenceDate, today);
      const reminderOffsets =
        importantDate.reminderDaysBefore.length > 0 ? importantDate.reminderDaysBefore : [...DEFAULT_REMINDER_DAYS];

      if (!reminderOffsets.includes(offset)) {
        continue;
      }

      for (const channel of channels) {
        const alreadyLogged = await input.repository.hasReminderLog({
          workspaceId: workspace.id,
          importantDateId: importantDate.id,
          reminderForDate: occurrenceDate,
          reminderDaysBefore: offset,
          channel
        });

        if (alreadyLogged) {
          continue;
        }

        const candidate: ReminderCandidate = {
          workspace,
          importantDate,
          person,
          occurrenceDate,
          reminderDaysBefore: offset,
          channel,
          message: buildReminderMessage({
            importantDate,
            person,
            occurrenceDate,
            reminderDaysBefore: offset,
            today
          })
        };

        const log = await input.repository.createReminderLog({
          workspaceId: workspace.id,
          importantDateId: importantDate.id,
          reminderForDate: occurrenceDate,
          reminderDaysBefore: offset,
          channel,
          status: "pending"
        });

        candidates.push(candidate);
        createdLogs.push(log);
      }
    }
  }

  return {
    checkedWorkspaces: workspaces.length,
    skippedWorkspaces,
    createdLogs,
    candidates
  };
}

export function getOccurrenceDate(importantDate: ImportantDate, today = new Date()): Date {
  if (importantDate.type === "birthday") {
    if (!importantDate.gregorianDate) {
      throw new Error("Birthday requires a Gregorian date of birth.");
    }

    return getNextGregorianBirthdayOccurrence({
      month: importantDate.gregorianDate.getMonth() + 1,
      day: importantDate.gregorianDate.getDate(),
      today
    });
  }

  if (importantDate.type === "hijri_birthday_waras") {
    if (!importantDate.hijriMonth || !importantDate.hijriDay) {
      throw new Error("Hijri Birthday (Waras) requires Hijri month and day.");
    }

    return getNextHijriBirthdayWarasOccurrence({
      hijriMonth: importantDate.hijriMonth,
      hijriDay: importantDate.hijriDay,
      today
    });
  }

  return getNextPassingAnniversaryOccurrence({
    gregorianDate: importantDate.gregorianDate,
    hijriMonth: importantDate.hijriMonth,
    hijriDay: importantDate.hijriDay,
    today
  });
}

export function buildReminderMessage(input: {
  importantDate: ImportantDate;
  person: Person;
  occurrenceDate: Date;
  reminderDaysBefore: number;
  today?: Date;
}): string {
  const displayName = getPersonDisplayName(input.person);
  const timing = formatReminderTiming(input.reminderDaysBefore);

  if (input.importantDate.type === "birthday") {
    const ageSuffix =
      input.importantDate.gregorianDate && input.importantDate.showYear !== false
        ? ` They will turn ${calculateGregorianAge(input.importantDate.gregorianDate, input.occurrenceDate)}.`
        : "";

    return `${displayName}'s Birthday is ${timing}.${ageSuffix}`;
  }

  if (input.importantDate.type === "hijri_birthday_waras") {
    const hijriDate = gregorianToHijri(input.occurrenceDate);
    return `${displayName}'s Hijri Birthday (Waras) is ${timing} - ${formatHijriDayMonth(hijriDate.month, hijriDate.day)}.`;
  }

  const yearsSincePassing = input.importantDate.gregorianDate
    ? calculateYearsSincePassing(input.importantDate.gregorianDate, input.occurrenceDate)
    : null;
  const yearsSuffix = yearsSincePassing === null ? "" : ` Years since passing: ${yearsSincePassing}.`;

  return `Anniversary of ${displayName}'s passing is ${timing}.${yearsSuffix}`;
}

export function getPersonDisplayName(person: Person): string {
  return person.displayName || [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function shouldProcessWorkspace(workspace: FamilyWorkspace, today: Date): boolean {
  if (workspace.status !== "active") {
    return false;
  }

  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(workspace.subscriptionStatus)) {
    return false;
  }

  if (workspace.subscriptionStatus === "trial" && workspace.trialEndsAt && startOfLocalDay(workspace.trialEndsAt) < today) {
    return false;
  }

  return true;
}

function formatReminderTiming(daysBefore: number): string {
  if (daysBefore === 0) {
    return "today";
  }

  if (daysBefore === 1) {
    return "tomorrow";
  }

  return `in ${daysBefore} days`;
}
