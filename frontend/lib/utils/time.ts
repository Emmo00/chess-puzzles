export const SECONDS_PER_DAY = 86400;

export const getUnixTimestampSeconds = (date: Date = new Date()): number => {
  return Math.floor(date.getTime() / 1000);
};

export const getUtcDayNumber = (date: Date = new Date()): number => {
  return Math.floor(getUnixTimestampSeconds(date) / SECONDS_PER_DAY);
};

export const getDateFromUtcDayNumber = (utcDay: number): Date => {
  return new Date(utcDay * SECONDS_PER_DAY * 1000);
};

export const getUtcDayRange = (
  utcDay: number
): { start: Date; end: Date } => {
  const start = getDateFromUtcDayNumber(utcDay);
  const end = new Date((utcDay + 1) * SECONDS_PER_DAY * 1000 - 1);

  return { start, end };
};

export const getDateAfterSeconds = (seconds: number, from: Date = new Date()): Date => {
  return new Date(from.getTime() + seconds * 1000);
};

export const getDateAfterMinutes = (minutes: number, from: Date = new Date()): Date => {
  return getDateAfterSeconds(minutes * 60, from);
};
