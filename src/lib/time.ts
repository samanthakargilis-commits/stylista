/** Date, time and weekday as seen in `timeZone` at `at`. */
export function localParts(timeZone: string, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday,
  };
}

/** Offset (ms) of `timeZone` from UTC at instant `at`. */
function offsetMs(timeZone: string, at: Date) {
  const p = localParts(timeZone, at);
  const asUtc = Date.UTC(
    Number(p.date.slice(0, 4)),
    Number(p.date.slice(5, 7)) - 1,
    Number(p.date.slice(8, 10)),
    Number(p.time.slice(0, 2)),
    Number(p.time.slice(3, 5)),
  );
  return asUtc - Math.floor(at.getTime() / 60000) * 60000;
}

/** UTC instants for the start and end of local calendar day `date` in `timeZone`. */
export function dayBounds(date: string, timeZone: string) {
  const midnightUtc = new Date(`${date}T00:00:00Z`);
  const start = new Date(midnightUtc.getTime() - offsetMs(timeZone, midnightUtc));
  const nextUtc = new Date(midnightUtc.getTime() + 86_400_000);
  const end = new Date(nextUtc.getTime() - offsetMs(timeZone, nextUtc) - 1);
  return { start, end };
}

export function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
}
