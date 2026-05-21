import { create } from "zustand";
import { sampleImportantDates, samplePeople, samplePlans, sampleWorkspace } from "./sampleData";
import { FamilyWorkspace, ImportantDate, Person, Plan } from "../types/domain";

type YaadiState = {
  workspace: FamilyWorkspace;
  people: Person[];
  importantDates: ImportantDate[];
  plans: Plan[];
  selectedPersonId?: string;
  setSelectedPersonId: (personId: string) => void;
  peopleCount: () => number;
  importantDatesCount: () => number;
};

export const useYaadiStore = create<YaadiState>((set, get) => ({
  workspace: sampleWorkspace,
  people: samplePeople,
  importantDates: sampleImportantDates,
  plans: samplePlans,
  selectedPersonId: samplePeople[0]?.id,
  setSelectedPersonId: (personId) => set({ selectedPersonId: personId }),
  peopleCount: () => get().people.length,
  importantDatesCount: () => get().importantDates.length
}));
