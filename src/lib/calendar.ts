import ical, { type VEvent } from "node-ical";
import { dayBounds, formatTime } from "./time";

/**
 * Today's events from private calendar links (Google "Secret address in iCal format",
 * Apple iCloud public calendar links, Outlook ICS links), as short readable lines.
 */
export async function calendarForDay(urls: string[], date: string, timeZone: string): Promise<string[]> {
  const { start, end } = dayBounds(date, timeZone);
  const lists = await Promise.all(
    urls.filter(Boolean).map(async (raw) => {
      try {
        const res = await fetch(raw.replace(/^webcal:\/\//i, "https://"), { cache: "no-store" });
        if (!res.ok) return [];
        return eventsBetween(await res.text(), start, end, timeZone);
      } catch {
        return [];
      }
    }),
  );
  return lists
    .flat()
    .sort((a, b) => a.at - b.at)
    .map((e) => e.line);
}

export function eventsBetween(ics: string, start: Date, end: Date, timeZone: string) {
  const parsed = ical.sync.parseICS(ics);
  const out: { at: number; line: string }[] = [];
  for (const component of Object.values(parsed)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    const instances = event.rrule
      ? ical.expandRecurringEvent(event, { from: start, to: end, expandOngoing: true })
      : [{ start: event.start, end: event.end ?? event.start, summary: event.summary, isFullDay: event.datetype === "date" }];
    for (const inst of instances) {
      const s = new Date(inst.start as Date);
      const e = new Date((inst.end ?? inst.start) as Date);
      if (s > end || e < start) continue;
      const title = typeof inst.summary === "string" ? inst.summary : String((inst.summary as { val?: string })?.val ?? "Event");
      const location = typeof event.location === "string" && event.location ? ` @ ${event.location}` : "";
      out.push({
        at: s.getTime(),
        line: inst.isFullDay ? `All day: ${title}${location}` : `${formatTime(s, timeZone)}: ${title}${location}`,
      });
    }
  }
  return out;
}
