import {
  calculateGregorianAge,
  calculateHijriAge,
  calculateYearsMarried,
  calculateYearsSincePassing,
  daysUntil,
  formatHijriDayMonth,
  getNextGregorianBirthdayOccurrence,
  getNextHijriBirthdayWarasOccurrence,
  getNextPassingAnniversaryOccurrence,
  getNextWeddingAnniversaryOccurrence,
  gregorianToHijri,
  startOfLocalDay
} from "./dateConversion.ts";
import { FamilyWorkspace, ImportantDate, Person, ReminderChannel, ReminderLog } from "./domain.ts";

const DEFAULT_REMINDER_DAYS = [7, 5, 2, 1, 0] as const;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["trial", "active"]);
const DEFAULT_CHANNELS: ReminderChannel[] = ["app", "email"];

export type ReminderCandidate = {
  workspace: FamilyWorkspace;
  importantDate: ImportantDate;
  person: Person;
  participantPeople: Person[];
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
      const participantPeople = getParticipantPeople(importantDate, person, peopleById);

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
          participantPeople,
          occurrenceDate,
          reminderDaysBefore: offset,
          channel,
          message: buildReminderMessage({
            importantDate,
            person,
            participantPeople,
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
      throw new Error("Gregorian Birthday requires a Gregorian date of birth.");
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

  if (importantDate.type === "wedding_anniversary") {
    if (importantDate.gregorianDate) {
      return getNextWeddingAnniversaryOccurrence({
        weddingDate: importantDate.gregorianDate,
        today
      });
    }

    if (!importantDate.hijriMonth || !importantDate.hijriDay) {
      throw new Error("Wedding Anniversary requires a Gregorian or Hijri wedding date.");
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
  participantPeople?: Person[];
  occurrenceDate: Date;
  reminderDaysBefore: number;
  today?: Date;
}): string {
  const displayName = getPersonDisplayName(input.person);
  const timing = formatReminderTiming(input.reminderDaysBefore);

  if (input.importantDate.type === "birthday") {
    const age = input.importantDate.gregorianDate
      ? calculateGregorianAge(input.importantDate.gregorianDate, input.occurrenceDate)
      : null;
    const eventName = age ? `${displayName}'s ${formatOrdinal(age)} Gregorian Birthday` : `${displayName}'s Gregorian Birthday`;

    return input.reminderDaysBefore === 0 ? `This is ${eventName}.` : `${eventName} is ${timing}.`;
  }

  if (input.importantDate.type === "hijri_birthday_waras") {
    const hijriDate = gregorianToHijri(input.occurrenceDate);
    const age = calculateHijriAge({
      hijriBirthYear: input.importantDate.hijriYear,
      currentHijriYear: hijriDate.year
    });
    const eventName = age ? `${displayName}'s ${formatOrdinal(age)} Hijri Birthday (Waras)` : `${displayName}'s Hijri Birthday (Waras)`;
    const hijriDateText = formatHijriDayMonth(hijriDate.month, hijriDate.day);

    return input.reminderDaysBefore === 0
      ? `This is ${eventName} — ${hijriDateText}.`
      : `${eventName} is ${timing} — ${hijriDateText}.`;
  }

  if (input.importantDate.type === "wedding_anniversary") {
    const participants = input.participantPeople && input.participantPeople.length > 0
      ? input.participantPeople
      : [input.person];
    const coupleName = participants.slice(0, 2).map(getPersonDisplayName).join(" and ");
    const occurrenceHijri = gregorianToHijri(input.occurrenceDate);
    const years = input.importantDate.gregorianDate
      ? calculateYearsMarried(input.importantDate.gregorianDate, input.occurrenceDate)
      : calculateHijriAge({ hijriBirthYear: input.importantDate.hijriYear, currentHijriYear: occurrenceHijri.year });
    const eventName = years ? `${coupleName}'s ${formatOrdinal(years)} Wedding Anniversary` : `${coupleName}'s Wedding Anniversary`;
    const hijriDateText = input.importantDate.gregorianDate ? "" : ` — ${formatHijriDayMonth(occurrenceHijri.month, occurrenceHijri.day)}`;

    return input.reminderDaysBefore === 0 ? `This is ${eventName}${hijriDateText}.` : `${eventName} is ${timing}${hijriDateText}.`;
  }

  const yearsSincePassing = input.importantDate.gregorianDate
    ? calculateYearsSincePassing(input.importantDate.gregorianDate, input.occurrenceDate)
    : null;
  const eventName = yearsSincePassing === null
    ? `Anniversary of ${displayName}'s passing`
    : `the ${formatOrdinal(yearsSincePassing)} Anniversary of ${displayName}'s passing`;

  return input.reminderDaysBefore === 0 ? `This is ${eventName}.` : `${capitalizeFirst(eventName)} is ${timing}.`;
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

export function formatOrdinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getParticipantPeople(importantDate: ImportantDate, person: Person, peopleById: Map<string, Person>): Person[] {
  const participantIds = importantDate.participantPersonIds && importantDate.participantPersonIds.length > 0
    ? importantDate.participantPersonIds
    : [person.id];

  return participantIds
    .map((personId) => peopleById.get(personId))
    .filter((participant): participant is Person => Boolean(participant));
}
