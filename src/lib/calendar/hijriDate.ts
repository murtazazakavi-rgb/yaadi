import {
  fromInternalHijriMonth,
  getHijriMonthName,
  getHijriShortMonthName,
  toInternalHijriMonth
} from "./hijriMonths";

const KABISA_YEAR_REMAINDERS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29] as const;

const DAYS_IN_YEAR = [30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325] as const;

const DAYS_IN_30_YEARS = [
  354, 708, 1063, 1417, 1771, 2126, 2480, 2834, 3189, 3543, 3898, 4252, 4606, 4961,
  5315, 5669, 6024, 6378, 6732, 7087, 7441, 7796, 8150, 8504, 8859, 9213, 9567,
  9922, 10276, 10631
] as const;

export type HijriDateResult = {
  year: number;
  month: number;
  day: number;
  monthName: string;
  shortMonthName: string;
  ajd: number;
};

export type GregorianDateResult = {
  year: number;
  month: number;
  day: number;
};

export class HijriDate {
  constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number
  ) {}

  static fromPublic(year: number, month: number, day: number): HijriDate {
    return new HijriDate(year, toInternalHijriMonth(month), day);
  }

  static isJulian(date: Date): boolean {
    if (date.getFullYear() < 1582) {
      return true;
    }

    if (date.getFullYear() === 1582) {
      if (date.getMonth() < 9) {
        return true;
      }

      if (date.getMonth() === 9 && date.getDate() < 5) {
        return true;
      }
    }

    return false;
  }

  static gregorianToAJD(date: Date): number {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day =
      date.getDate() +
      date.getHours() / 24 +
      date.getMinutes() / 1440 +
      date.getSeconds() / 86400 +
      date.getMilliseconds() / 86400000;

    if (month < 3) {
      year -= 1;
      month += 12;
    }

    let b = 0;
    if (!HijriDate.isJulian(date)) {
      const a = Math.floor(year / 100);
      b = 2 - a + Math.floor(a / 4);
    }

    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
  }

  static ajdToGregorian(ajd: number): Date {
    const z = Math.floor(ajd + 0.5);
    const f = ajd + 0.5 - z;
    let a = z;

    if (z >= 2299161) {
      const alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(0.25 * alpha);
    }

    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);
    const day = b - d - Math.floor(30.6001 * e) + f;
    const hours = (day - Math.floor(day)) * 24;
    const minutes = (hours - Math.floor(hours)) * 60;
    const seconds = (minutes - Math.floor(minutes)) * 60;
    const milliseconds = (seconds - Math.floor(seconds)) * 1000;
    const month = e < 14 ? e - 2 : e - 14;
    const year = month < 2 ? c - 4715 : c - 4716;

    return new Date(year, month, day, hours, minutes, seconds, milliseconds);
  }

  static isKabisa(year: number): boolean {
    return KABISA_YEAR_REMAINDERS.some((remainder) => year % 30 === remainder);
  }

  static daysInMonth(year: number, internalMonth: number): number {
    return (internalMonth === 11 && HijriDate.isKabisa(year)) || internalMonth % 2 === 0 ? 30 : 29;
  }

  static daysInPublicMonth(year: number, month: number): number {
    return HijriDate.daysInMonth(year, toInternalHijriMonth(month));
  }

  static fromAJD(ajd: number): HijriDate {
    let i = 0;
    let left = Math.floor(ajd - 1948083.5);
    const y30 = Math.floor(left / 10631.0);

    left -= y30 * 10631;
    while (left > DAYS_IN_30_YEARS[i]) {
      i += 1;
    }

    const year = Math.round(y30 * 30.0 + i);
    if (i > 0) {
      left -= DAYS_IN_30_YEARS[i - 1];
    }

    i = 0;
    while (left > DAYS_IN_YEAR[i]) {
      i += 1;
    }

    const month = Math.round(i);
    const day = i > 0 ? Math.round(left - DAYS_IN_YEAR[i - 1]) : Math.round(left);

    return new HijriDate(year, month, day);
  }

  static fromGregorian(date: Date): HijriDate {
    return HijriDate.fromAJD(HijriDate.gregorianToAJD(date));
  }

  getYear(): number {
    return this.year;
  }

  getMonth(): number {
    return this.month;
  }

  getDate(): number {
    return this.day;
  }

  dayOfYear(): number {
    return this.month === 0 ? this.day : DAYS_IN_YEAR[this.month - 1] + this.day;
  }

  toAJD(): number {
    const y30 = Math.floor(this.year / 30.0);
    let ajd = 1948083.5 + y30 * 10631 + this.dayOfYear();

    if (this.year % 30 !== 0) {
      ajd += DAYS_IN_30_YEARS[this.year - y30 * 30 - 1];
    }

    return ajd;
  }

  toGregorian(): Date {
    return HijriDate.ajdToGregorian(this.toAJD());
  }

  toPublicResult(): HijriDateResult {
    const month = fromInternalHijriMonth(this.month);
    return {
      year: this.year,
      month,
      day: this.day,
      monthName: getHijriMonthName(month),
      shortMonthName: getHijriShortMonthName(month),
      ajd: this.toAJD()
    };
  }
}
