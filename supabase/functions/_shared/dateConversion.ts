import { GregorianDateResult, HijriDate, HijriDateResult } from "./hijriDate.ts";
import { getHijriShortMonthName, toInternalHijriMonth } from "./hijriMonths.ts";

export type HijriDateInput = {
  year?: number;
  month: number;
  day: number;
};

export type GregorianDateInput = {
  year: number;
  month: number;
  day: number;
};

export function gregorianToHijri(date: Date): HijriDateResult {
  return HijriDate.fromGregorian(date).toPublicResult();
}

export function hijriToGregorian(input: {
  hijriYear: number;
  hijriMonth: number;
  hijriDay: number;
}): Date {
  assertValidHijriDate(input.hijriYear, input.hijriMonth, input.hijriDay);
  return HijriDate.fromPublic(input.hijriYear, input.hijriMonth, input.hijriDay).toGregorian();
}

export function getTodayInBothCalendars(date = new Date()): {
  gregorian: GregorianDateResult;
  hijri: HijriDateResult;
} {
  return {
    gregorian: toGregorianResult(date),
    hijri: gregorianToHijri(date)
  };
}

export function getNextGregorianBirthdayOccurrence(input: {
  month: number;
  day: number;
  today?: Date;
}): Date {
  const today = startOfLocalDay(input.today ?? new Date());
  let occurrence = makeLocalDate(today.getFullYear(), input.month, input.day);

  if (occurrence < today) {
    occurrence = makeLocalDate(today.getFullYear() + 1, input.month, input.day);
  }

  return occurrence;
}

export function getNextHijriBirthdayWarasOccurrence(input: {
  hijriMonth: number;
  hijriDay: number;
  today?: Date;
}): Date {
  const today = startOfLocalDay(input.today ?? new Date());
  const currentHijri = gregorianToHijri(today);

  for (let offset = 0; offset <= 4; offset += 1) {
    const hijriYear = currentHijri.year + offset;
    if (!isValidHijriDate(hijriYear, input.hijriMonth, input.hijriDay)) {
      continue;
    }

    const occurrence = startOfLocalDay(
      hijriToGregorian({
        hijriYear,
        hijriMonth: input.hijriMonth,
        hijriDay: input.hijriDay
      })
    );

    if (occurrence >= today) {
      return occurrence;
    }
  }

  throw new RangeError("Could not find the next Hijri Birthday (Waras) occurrence within upcoming Hijri years.");
}

export function getNextPassingAnniversaryOccurrence(input: {
  gregorianDate?: Date;
  hijriDay?: number;
  hijriMonth?: number;
  today?: Date;
}): Date {
  const occurrences: Date[] = [];

  if (input.gregorianDate) {
    occurrences.push(
      getNextGregorianBirthdayOccurrence({
        month: input.gregorianDate.getMonth() + 1,
        day: input.gregorianDate.getDate(),
        today: input.today
      })
    );
  }

  if (input.hijriMonth && input.hijriDay) {
    occurrences.push(
      getNextHijriBirthdayWarasOccurrence({
        hijriMonth: input.hijriMonth,
        hijriDay: input.hijriDay,
        today: input.today
      })
    );
  }

  if (occurrences.length === 0) {
    throw new Error("A Gregorian or Hijri Date of Passing is required.");
  }

  return occurrences.sort((a, b) => a.getTime() - b.getTime())[0];
}

export function getNextWeddingAnniversaryOccurrence(input: {
  weddingDate: Date;
  today?: Date;
}): Date {
  return getNextGregorianBirthdayOccurrence({
    month: input.weddingDate.getMonth() + 1,
    day: input.weddingDate.getDate(),
    today: input.today
  });
}

export function calculateGregorianAge(dateOfBirth: Date, today = new Date()): number {
  const current = startOfLocalDay(today);
  let age = current.getFullYear() - dateOfBirth.getFullYear();
  const birthdayThisYear = makeLocalDate(current.getFullYear(), dateOfBirth.getMonth() + 1, dateOfBirth.getDate());

  if (birthdayThisYear > current) {
    age -= 1;
  }

  return age;
}

export function calculateHijriAge(input: {
  hijriBirthYear?: number;
  currentHijriYear: number;
}): number | null {
  if (!input.hijriBirthYear) {
    return null;
  }

  return input.currentHijriYear - input.hijriBirthYear;
}

export function calculateYearsSincePassing(dateOfPassing: Date, today = new Date()): number {
  return calculateGregorianAge(dateOfPassing, today);
}

export function calculateYearsMarried(weddingDate: Date, anniversaryDate = new Date()): number {
  return calculateGregorianAge(weddingDate, anniversaryDate);
}

export function daysUntil(date: Date, today = new Date()): number {
  const target = startOfLocalDay(date);
  const current = startOfLocalDay(today);
  return Math.round((target.getTime() - current.getTime()) / 86400000);
}

export function formatHijriDayMonth(month: number, day: number): string {
  return `${day} ${getHijriShortMonthName(month)}`;
}

export function toGregorianResult(date: Date): GregorianDateResult {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

export function makeLocalDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new RangeError(`Invalid Gregorian date: ${year}-${month}-${day}.`);
  }
  return startOfLocalDay(date);
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isValidHijriDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(day) || day < 1) {
    return false;
  }

  try {
    const internalMonth = toInternalHijriMonth(month);
    return day <= HijriDate.daysInMonth(year, internalMonth);
  } catch {
    return false;
  }
}

function assertValidHijriDate(year: number, month: number, day: number): void {
  if (!isValidHijriDate(year, month, day)) {
    throw new RangeError(`Invalid Hijri date: ${year}-${month}-${day}.`);
  }
}
