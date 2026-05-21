import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HijriCalendar } from "../hijriCalendar";
import { HijriDate } from "../hijriDate";
import {
  calculateGregorianAge,
  calculateHijriAge,
  calculateYearsSincePassing,
  daysUntil,
  getNextGregorianBirthdayOccurrence,
  getNextHijriBirthdayWarasOccurrence,
  getNextPassingAnniversaryOccurrence,
  gregorianToHijri,
  hijriToGregorian,
  makeLocalDate
} from "../dateConversion";

describe("HijriDate upstream conversion behavior", () => {
  it("detects Julian dates using the Mumineen Calendar rules", () => {
    assert.equal(HijriDate.isJulian(new Date(1581, 11, 31)), true);
    assert.equal(HijriDate.isJulian(new Date(1582, 9, 4)), true);
    assert.equal(HijriDate.isJulian(new Date(1582, 9, 5)), false);
    assert.equal(HijriDate.isJulian(new Date(1583, 0, 1)), false);
  });

  it("converts Gregorian date to AJD", () => {
    assert.equal(HijriDate.gregorianToAJD(new Date(2011, 2, 25)), 2455645.5);
  });

  it("converts AJD to Gregorian date", () => {
    assert.equal(toYmd(HijriDate.ajdToGregorian(2455645.5)), "2011-03-25");
  });

  it("detects Kabisa years and Hijri month lengths", () => {
    assert.equal(HijriDate.isKabisa(1434), true);
    assert.equal(HijriDate.isKabisa(1432), false);
    assert.equal(HijriDate.daysInMonth(1432, 8), 30);
    assert.equal(HijriDate.daysInMonth(1432, 11), 29);
    assert.equal(HijriDate.daysInMonth(1434, 11), 30);
  });

  it("calculates Hijri day of year", () => {
    assert.equal(new HijriDate(1432, 0, 10).dayOfYear(), 10);
    assert.equal(new HijriDate(1432, 8, 10).dayOfYear(), 246);
    assert.equal(new HijriDate(1434, 11, 30).dayOfYear(), 355);
  });

  it("converts AJD to Hijri date", () => {
    const date = HijriDate.fromAJD(2455645.5);
    assert.deepEqual([date.getYear(), date.getMonth(), date.getDate()], [1432, 3, 20]);
  });

  it("converts Hijri date to AJD", () => {
    assert.equal(new HijriDate(1432, 3, 20).toAJD(), 2455645.5);
  });

  it("converts Gregorian to Hijri using public 1-based month output", () => {
    assert.deepEqual(pickHijri(gregorianToHijri(new Date(2011, 2, 25))), {
      year: 1432,
      month: 4,
      day: 20,
      monthName: "Rabi al-Aakhar"
    });
  });

  it("converts Hijri to Gregorian using public 1-based month input", () => {
    assert.equal(toYmd(hijriToGregorian({ hijriYear: 1432, hijriMonth: 4, hijriDay: 20 })), "2011-03-25");
  });

  it("round trips known Mumineen Calendar dates", () => {
    const gregorian = makeLocalDate(2011, 3, 25);
    const hijri = gregorianToHijri(gregorian);
    const roundTrip = hijriToGregorian({
      hijriYear: hijri.year,
      hijriMonth: hijri.month,
      hijriDay: hijri.day
    });

    assert.equal(toYmd(roundTrip), "2011-03-25");
  });
});

describe("HijriCalendar upstream month behavior", () => {
  it("calculates day of week", () => {
    assert.equal(new HijriCalendar(1432, 3).dayOfWeek(20), 5);
    assert.equal(new HijriCalendar(1432, 3, true).dayOfWeek(20), 4);
  });

  it("returns month days with Gregorian and Hijri payloads", () => {
    const days = new HijriCalendar(1432, 4).days();
    assert.equal(Array.isArray(days), true);
    assert.equal(days[0].hijri.day, 1);
    assert.equal(days[days.length - 1].hijri.day, days.length);
    assert.equal(typeof days[0].gregorian.year, "number");
    assert.equal(typeof days[0].ajd, "number");
  });

  it("chunks weeks into rows of seven", () => {
    const weeks = new HijriCalendar(1432, 3).weeks();
    assert.equal(weeks.length > 4, true);
    assert.equal(weeks.length < 7, true);
    weeks.forEach((week) => assert.equal(week.length, 7));
  });

  it("moves between months and years with upstream bounds", () => {
    assert.equal(new HijriCalendar(1432, 3).previousMonth().getMonth(), 2);
    assert.equal(new HijriCalendar(1432, 0).previousMonth().getMonth(), 11);
    assert.equal(new HijriCalendar(1432, 0).previousMonth().getYear(), 1431);
    assert.equal(new HijriCalendar(1432, 11).nextMonth().getMonth(), 0);
    assert.equal(new HijriCalendar(1432, 11).nextMonth().getYear(), 1433);
    assert.equal(new HijriCalendar(1432, 3).previousYear().getYear(), 1431);
    assert.equal(new HijriCalendar(1432, 3).nextYear().getYear(), 1433);
  });
});

describe("Yaadi date occurrence behavior", () => {
  it("gets the next Gregorian birthday occurrence", () => {
    assert.equal(
      toYmd(
        getNextGregorianBirthdayOccurrence({
          month: 6,
          day: 1,
          today: makeLocalDate(2026, 5, 22)
        })
      )
    , "2026-06-01");

    assert.equal(
      toYmd(
        getNextGregorianBirthdayOccurrence({
          month: 5,
          day: 1,
          today: makeLocalDate(2026, 5, 22)
        })
      )
    , "2027-05-01");
  });

  it("gets the next Hijri Birthday (Waras) occurrence", () => {
    assert.equal(
      toYmd(
        getNextHijriBirthdayWarasOccurrence({
          hijriMonth: 4,
          hijriDay: 20,
          today: makeLocalDate(2011, 3, 24)
        })
      )
    , "2011-03-25");
  });

  it("returns null Hijri age when Hijri birth year is missing", () => {
    assert.equal(calculateHijriAge({ currentHijriYear: 1447 }), null);
    assert.equal(calculateHijriAge({ hijriBirthYear: 1410, currentHijriYear: 1447 }), 37);
  });

  it("gets Anniversary of their passing by Gregorian date", () => {
    assert.equal(
      toYmd(
        getNextPassingAnniversaryOccurrence({
          gregorianDate: makeLocalDate(2020, 5, 23),
          today: makeLocalDate(2026, 5, 22)
        })
      )
    , "2026-05-23");
  });

  it("gets Anniversary of their passing by Hijri date", () => {
    assert.equal(
      toYmd(
        getNextPassingAnniversaryOccurrence({
          hijriMonth: 4,
          hijriDay: 20,
          today: makeLocalDate(2011, 3, 24)
        })
      )
    , "2011-03-25");
  });

  it("calculates age, years since passing, and days until", () => {
    assert.equal(calculateGregorianAge(makeLocalDate(1995, 6, 1), makeLocalDate(2026, 5, 22)), 30);
    assert.equal(calculateGregorianAge(makeLocalDate(1995, 5, 1), makeLocalDate(2026, 5, 22)), 31);
    assert.equal(calculateYearsSincePassing(makeLocalDate(2020, 5, 23), makeLocalDate(2026, 5, 22)), 5);
    assert.equal(daysUntil(makeLocalDate(2026, 5, 29), makeLocalDate(2026, 5, 22)), 7);
  });
});

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pickHijri(input: ReturnType<typeof gregorianToHijri>) {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    monthName: input.monthName
  };
}
