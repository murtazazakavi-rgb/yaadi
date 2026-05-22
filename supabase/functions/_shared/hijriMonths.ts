export type HijriMonth = {
  value: number;
  longName: string;
  shortName: string;
};

const LONG_MONTH_NAMES = [
  "Moharram al-Haraam",
  "Safar al-Muzaffar",
  "Rabi al-Awwal",
  "Rabi al-Aakhar",
  "Jumada al-Ula",
  "Jumada al-Ukhra",
  "Rajab al-Asab",
  "Shabaan al-Karim",
  "Ramadaan al-Moazzam",
  "Shawwal al-Mukarram",
  "Zilqadah al-Haraam",
  "Zilhaj al-Haraam"
] as const;

const SHORT_MONTH_NAMES = [
  "Moharram",
  "Safar",
  "Rabi I",
  "Rabi II",
  "Jumada I",
  "Jumada II",
  "Rajab",
  "Shabaan",
  "Ramadaan",
  "Shawwal",
  "Zilqadah",
  "Zilhaj"
] as const;

export const hijriMonths: HijriMonth[] = LONG_MONTH_NAMES.map((longName, index) => ({
  value: index + 1,
  longName,
  shortName: SHORT_MONTH_NAMES[index]
}));

export function getHijriMonthName(month: number): string {
  assertHijriMonth(month);
  return LONG_MONTH_NAMES[month - 1];
}

export function getHijriShortMonthName(month: number): string {
  assertHijriMonth(month);
  return SHORT_MONTH_NAMES[month - 1];
}

export function assertHijriMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Hijri month must be an integer from 1 to 12. Received ${month}.`);
  }
}

export function toInternalHijriMonth(month: number): number {
  assertHijriMonth(month);
  return month - 1;
}

export function fromInternalHijriMonth(month: number): number {
  if (!Number.isInteger(month) || month < 0 || month > 11) {
    throw new RangeError(`Internal Hijri month must be an integer from 0 to 11. Received ${month}.`);
  }
  return month + 1;
}
