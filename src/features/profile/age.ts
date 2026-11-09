// Your age on a day from your birth date ("1996-11-20"): a year more from
// the birthday itself.
export function ageOn(birthDate: string, day: Date): number {
  const [year, month, date] = birthDate.split('-').map(Number);
  const beforeBirthday =
    day.getMonth() + 1 < month || (day.getMonth() + 1 === month && day.getDate() < date);
  return day.getFullYear() - year - (beforeBirthday ? 1 : 0);
}
