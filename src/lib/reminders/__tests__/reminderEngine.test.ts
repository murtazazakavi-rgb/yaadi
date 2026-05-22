import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeLocalDate } from "../../calendar/dateConversion";
import { ReminderRepository, runReminderEngine } from "../reminderEngine";
import { FamilyWorkspace, ImportantDate, Person, ReminderChannel, ReminderLog } from "../../../types/domain";

describe("runReminderEngine", () => {
  it("creates reminders for configured offsets 7, 5, 2, 1, and 0 days", async () => {
    const repository = createRepository({
      importantDates: [7, 5, 2, 1, 0].map((offset) => ({
        ...baseImportantDate,
        id: `date-${offset}`,
        gregorianDate: makeLocalDate(1995, 5, 22 + offset)
      }))
    });

    const result = await runReminderEngine({
      repository,
      today: makeLocalDate(2026, 5, 22),
      channels: ["app"]
    });

    assert.equal(result.createdLogs.length, 5);
    assert.deepEqual(result.createdLogs.map((log) => log.reminderDaysBefore).sort((a, b) => a - b), [0, 1, 2, 5, 7]);
  });

  it("prevents duplicate reminder logs", async () => {
    const existingLog = {
      workspaceId: "workspace-1",
      importantDateId: "date-1",
      reminderForDate: makeLocalDate(2026, 5, 29),
      reminderDaysBefore: 7,
      channel: "app" as ReminderChannel,
      status: "pending" as const,
      sentAt: undefined,
      errorMessage: undefined
    };
    const repository = createRepository({
      importantDates: [
        {
          ...baseImportantDate,
          id: "date-1",
          gregorianDate: makeLocalDate(1995, 5, 29)
        }
      ],
      logs: [
        {
          ...existingLog,
          id: "existing",
          createdAt: makeLocalDate(2026, 5, 22)
        }
      ]
    });

    const result = await runReminderEngine({
      repository,
      today: makeLocalDate(2026, 5, 22),
      channels: ["app"]
    });

    assert.equal(result.createdLogs.length, 0);
  });

  it("skips expired trials", async () => {
    const repository = createRepository({
      workspaces: [
        {
          ...baseWorkspace,
          subscriptionStatus: "trial",
          trialEndsAt: makeLocalDate(2026, 5, 21)
        }
      ],
      importantDates: [
        {
          ...baseImportantDate,
          gregorianDate: makeLocalDate(1995, 5, 29)
        }
      ]
    });

    const result = await runReminderEngine({
      repository,
      today: makeLocalDate(2026, 5, 22),
      channels: ["app"]
    });

    assert.equal(result.skippedWorkspaces, 1);
    assert.equal(result.createdLogs.length, 0);
  });

  it("includes Birthday age even when the year is hidden", async () => {
    const result = await runReminderEngine({
      repository: createRepository({
        importantDates: [
          {
            ...baseImportantDate,
            showYear: false,
            gregorianDate: makeLocalDate(1995, 5, 29),
            reminderDaysBefore: [7]
          }
        ],
        people: [{ ...basePerson, gender: "female" }]
      }),
      today: makeLocalDate(2026, 5, 22),
      channels: ["email"]
    });

    assert.equal(result.candidates[0]?.message, "Fatema Ben's Birthday is in 7 days. She will turn 31.");
  });

  it("builds Wedding Anniversary reminders for both participants", async () => {
    const result = await runReminderEngine({
      repository: createRepository({
        importantDates: [
          {
            ...baseImportantDate,
            type: "wedding_anniversary",
            gregorianDate: makeLocalDate(2014, 5, 29),
            participantPersonIds: ["person-1", "person-2"],
            reminderDaysBefore: [7]
          }
        ],
        people: [
          basePerson,
          {
            ...basePerson,
            id: "person-2",
            firstName: "Murtaza",
            lastName: "Bhai"
          }
        ]
      }),
      today: makeLocalDate(2026, 5, 22),
      channels: ["email"]
    });

    assert.equal(
      result.candidates[0]?.message,
      "Fatema Ben and Murtaza Bhai's Wedding Anniversary is in 7 days. Years married: 12."
    );
  });
});

const baseWorkspace: FamilyWorkspace = {
  id: "workspace-1",
  name: "Murtaza Family",
  ownerUserId: "user-1",
  status: "active",
  subscriptionStatus: "active",
  timezone: "Asia/Kolkata",
  reminderSendTime: "09:00"
};

const basePerson: Person = {
  id: "person-1",
  workspaceId: "workspace-1",
  firstName: "Fatema",
  lastName: "Ben",
  livingStatus: "living"
};

const baseImportantDate: ImportantDate = {
  id: "date-1",
  workspaceId: "workspace-1",
  personId: "person-1",
  type: "birthday",
  gregorianDate: makeLocalDate(1995, 5, 29),
  showYear: true,
  reminderDaysBefore: [7, 5, 2, 1, 0]
};

function createRepository(input: {
  workspaces?: FamilyWorkspace[];
  people?: Person[];
  importantDates?: ImportantDate[];
  logs?: ReminderLog[];
}): ReminderRepository {
  const logs = [...(input.logs ?? [])];

  return {
    async loadActiveWorkspaces() {
      return input.workspaces ?? [baseWorkspace];
    },
    async loadImportantDates() {
      return input.importantDates ?? [baseImportantDate];
    },
    async loadPeople() {
      return input.people ?? [basePerson];
    },
    async hasReminderLog(candidate) {
      return logs.some(
        (log) =>
          log.workspaceId === candidate.workspaceId &&
          log.importantDateId === candidate.importantDateId &&
          toYmd(log.reminderForDate) === toYmd(candidate.reminderForDate) &&
          log.reminderDaysBefore === candidate.reminderDaysBefore &&
          log.channel === candidate.channel
      );
    },
    async createReminderLog(log) {
      const created: ReminderLog = {
        ...log,
        id: `log-${logs.length + 1}`,
        createdAt: makeLocalDate(2026, 5, 22)
      };
      logs.push(created);
      return created;
    }
  };
}

function toYmd(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
