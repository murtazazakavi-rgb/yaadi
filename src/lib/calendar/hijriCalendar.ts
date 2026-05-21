import { HijriDate } from "./hijriDate";
import { fromInternalHijriMonth, toInternalHijriMonth } from "./hijriMonths";

export type CalendarDay = {
  hijri: {
    year: number;
    month: number;
    day: number;
  };
  gregorian: {
    year: number;
    month: number;
    day: number;
  };
  ajd: number;
  filler?: true;
};

const MIN_CALENDAR_YEAR = 1000;
const MAX_CALENDAR_YEAR = 3000;

export class HijriCalendar {
  constructor(
    public readonly year: number,
    private readonly internalMonth: number,
    private readonly iso8601 = false
  ) {}

  static fromPublic(year: number, month: number, iso8601 = false): HijriCalendar {
    return new HijriCalendar(year, toInternalHijriMonth(month), iso8601);
  }

  static getMinYear(): number {
    return MIN_CALENDAR_YEAR;
  }

  static getMaxYear(): number {
    return MAX_CALENDAR_YEAR;
  }

  getYear(): number {
    return this.year;
  }

  getMonth(): number {
    return this.internalMonth;
  }

  getPublicMonth(): number {
    return fromInternalHijriMonth(this.internalMonth);
  }

  isISO(): boolean {
    return this.iso8601;
  }

  dayOfWeek(day: number): number {
    const hijriDate = new HijriDate(this.year, this.internalMonth, day);
    const offset = this.iso8601 ? 0.5 : 1.5;
    return (hijriDate.toAJD() + offset) % 7;
  }

  days(): CalendarDay[] {
    return Array.from({ length: HijriDate.daysInMonth(this.year, this.internalMonth) }, (_, index) => {
      const hijriDate = new HijriDate(this.year, this.internalMonth, index + 1);
      return dayHash(hijriDate, hijriDate.toGregorian());
    });
  }

  weeks(): Array<Array<CalendarDay | null>> {
    return chunk([...this.previousDays(), ...this.days(), ...this.nextDays()], 7);
  }

  previousDays(): Array<CalendarDay | null> {
    const previousMonth = this.previousMonth();
    const daysInPreviousMonth = HijriDate.daysInMonth(previousMonth.getYear(), previousMonth.getMonth());
    const dayAtStartOfMonth = this.dayOfWeek(1);

    if (this.internalMonth === 0 && this.year === MIN_CALENDAR_YEAR) {
      return Array.from({ length: 6 - dayAtStartOfMonth }, () => null);
    }

    return Array.from({ length: dayAtStartOfMonth }, (_, day) => {
      const hijriDate = new HijriDate(
        previousMonth.getYear(),
        previousMonth.getMonth(),
        daysInPreviousMonth - dayAtStartOfMonth + day + 1
      );
      return dayHash(hijriDate, hijriDate.toGregorian(), true);
    });
  }

  nextDays(): Array<CalendarDay | null> {
    const nextMonth = this.nextMonth();
    const daysInMonth = HijriDate.daysInMonth(this.year, this.internalMonth);
    const dayAtEndOfMonth = this.dayOfWeek(daysInMonth);

    if (nextMonth.getYear() === this.year && nextMonth.getMonth() === this.internalMonth) {
      return Array.from({ length: 6 - dayAtEndOfMonth }, () => null);
    }

    return Array.from({ length: 6 - dayAtEndOfMonth }, (_, day) => {
      const hijriDate = new HijriDate(nextMonth.getYear(), nextMonth.getMonth(), day + 1);
      return dayHash(hijriDate, hijriDate.toGregorian(), true);
    });
  }

  previousMonth(): HijriCalendar {
    const year = this.internalMonth === 0 && this.year > MIN_CALENDAR_YEAR ? this.year - 1 : this.year;
    let month: number;

    if (this.internalMonth === 0 && this.year === MIN_CALENDAR_YEAR) {
      month = this.internalMonth;
    } else if (this.internalMonth === 0) {
      month = 11;
    } else {
      month = this.internalMonth - 1;
    }

    return new HijriCalendar(year, month, this.iso8601);
  }

  nextMonth(): HijriCalendar {
    const year = this.internalMonth === 11 && this.year < MAX_CALENDAR_YEAR ? this.year + 1 : this.year;
    let month: number;

    if (this.internalMonth === 11 && this.year === MAX_CALENDAR_YEAR) {
      month = this.internalMonth;
    } else if (this.internalMonth === 11) {
      month = 0;
    } else {
      month = this.internalMonth + 1;
    }

    return new HijriCalendar(year, month, this.iso8601);
  }

  previousYear(): HijriCalendar {
    const year = this.year === MIN_CALENDAR_YEAR ? MIN_CALENDAR_YEAR : this.year - 1;
    return new HijriCalendar(year, this.internalMonth, this.iso8601);
  }

  nextYear(): HijriCalendar {
    const year = this.year === MAX_CALENDAR_YEAR ? MAX_CALENDAR_YEAR : this.year + 1;
    return new HijriCalendar(year, this.internalMonth, this.iso8601);
  }
}

function dayHash(hijriDate: HijriDate, gregorianDate: Date, isFiller?: boolean): CalendarDay {
  return {
    hijri: {
      year: hijriDate.getYear(),
      month: fromInternalHijriMonth(hijriDate.getMonth()),
      day: hijriDate.getDate()
    },
    gregorian: {
      year: gregorianDate.getFullYear(),
      month: gregorianDate.getMonth() + 1,
      day: gregorianDate.getDate()
    },
    ajd: hijriDate.toAJD(),
    filler: isFiller ? true : undefined
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
