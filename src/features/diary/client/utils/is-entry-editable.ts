export const isEntryEditable = (
  dateISO: string,
  todayISO: string,
  graceMinutes: number | null,
  nowISO: string,
  clientTodayISO: string,
  clientNow: number,
) => {
  if (dateISO === todayISO || dateISO === clientTodayISO) {
    return true;
  }

  if (!graceMinutes || graceMinutes <= 0) {
    return false;
  }

  const target = new Date(`${dateISO}T23:59:59Z`).getTime();
  const nowServer = new Date(nowISO).getTime();
  const now = Number.isNaN(clientNow) ? nowServer : clientNow;
  const diffMinutes = Math.abs(target - now) / 60000;
  return diffMinutes <= graceMinutes;
};

export type IsEntryEditableParams = Parameters<typeof isEntryEditable>;
