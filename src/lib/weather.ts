import type { Place, WorkMode } from "./types";

type Hourly = {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  wind_speed_10m: number[];
  weather_code: number[];
};

/** WMO weather codes → words (https://open-meteo.com/en/docs). */
function describeCode(code: number): string {
  if (code === 0) return "clear";
  if (code <= 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "foggy";
  if (code >= 51 && code <= 57) return "drizzly";
  if (code >= 61 && code <= 67) return "rainy";
  if (code >= 71 && code <= 77) return "snowy";
  if (code >= 80 && code <= 82) return "showery";
  if (code >= 95) return "stormy";
  return "mixed";
}

async function fetchHourly(place: Place, timezone: string, date: string): Promise<Hourly> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone,
    start_date: date,
    end_date: date,
  }).toString();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
  return ((await res.json()) as { hourly: Hourly }).hourly;
}

/** Summarize hours [from, to) of one day's forecast. */
export function summarizeWindow(h: Hourly, from: number, to: number): string {
  const idx = h.time.map((t, i) => [Number(t.slice(11, 13)), i] as const).filter(([hr]) => hr >= from && hr < to).map(([, i]) => i);
  if (idx.length === 0) return "no forecast";
  const temps = idx.map((i) => h.temperature_2m[i]);
  const feels = idx.map((i) => h.apparent_temperature[i]);
  const rain = Math.max(...idx.map((i) => h.precipitation_probability[i] ?? 0));
  const wind = Math.max(...idx.map((i) => h.wind_speed_10m[i]));
  const codes = idx.map((i) => describeCode(h.weather_code[i]));
  const sky = [...new Set(codes)].slice(0, 2).join(" then ");
  const lo = Math.round(Math.min(...temps));
  const hi = Math.round(Math.max(...temps));
  const feelLo = Math.round(Math.min(...feels));
  return [
    lo === hi ? `${lo}°F` : `${lo}–${hi}°F`,
    feelLo < lo - 2 ? `feels like ${feelLo}°` : "",
    sky,
    wind >= 12 ? `windy (gusts to ${Math.round(wind)} mph)` : "",
    rain >= 30 ? `${rain}% chance of rain` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * A weather read shaped around the day: home in the morning and evening, and the
 * office during work hours when they're going in.
 */
export async function weatherForDay(opts: {
  home: Place | null;
  work: Place | null;
  workMode: WorkMode;
  timezone: string;
  date: string;
}): Promise<string> {
  const { home, work, workMode, timezone, date } = opts;
  if (!home) return "";
  const goingIn = (workMode === "office" || workMode === "either") && work;
  const [homeH, workH] = await Promise.all([
    fetchHourly(home, timezone, date),
    goingIn ? fetchHourly(work, timezone, date) : Promise.resolve(null),
  ]);
  const lines = [`Morning at ${home.label}: ${summarizeWindow(homeH, 7, 10)}`];
  if (workH && work) {
    lines.push(`Workday at ${work.label}: ${summarizeWindow(workH, 10, 18)}`);
  } else {
    lines.push(`Daytime at ${home.label}: ${summarizeWindow(homeH, 10, 18)}`);
  }
  lines.push(`Evening: ${summarizeWindow(workH ?? homeH, 18, 23)}`);
  return lines.join("\n");
}

/** Look up a neighborhood or address with Open-Meteo's free geocoder. */
export async function geocode(query: string): Promise<Place | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" }).toString();
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: { name: string; admin1?: string; latitude: number; longitude: number }[] };
  const hit = data.results?.[0];
  if (!hit) return null;
  return { label: query, lat: hit.latitude, lon: hit.longitude };
}
