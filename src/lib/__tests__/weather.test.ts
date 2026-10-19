import { describe, expect, it } from "vitest";
import { summarizeWindow } from "../weather";

const hours = Array.from({ length: 24 }, (_, h) => h);
const hourly = {
  time: hours.map((h) => `2026-10-20T${String(h).padStart(2, "0")}:00`),
  temperature_2m: hours.map((h) => 52 + (h >= 12 && h < 17 ? 10 : 0)),
  apparent_temperature: hours.map((h) => 46 + (h >= 12 && h < 17 ? 10 : 0)),
  precipitation_probability: hours.map((h) => (h >= 19 ? 40 : 5)),
  wind_speed_10m: hours.map((h) => (h >= 14 && h < 18 ? 18 : 6)),
  weather_code: hours.map((h) => (h < 11 ? 45 : 1)),
};

describe("summarizeWindow", () => {
  it("describes a foggy SF morning", () => {
    expect(summarizeWindow(hourly, 7, 10)).toBe("52°F, feels like 46°, foggy");
  });
  it("flags wind and temperature range in the afternoon", () => {
    expect(summarizeWindow(hourly, 10, 18)).toBe("52–62°F, feels like 46°, foggy then partly cloudy, windy (gusts to 18 mph)");
  });
  it("flags rain in the evening", () => {
    expect(summarizeWindow(hourly, 18, 23)).toContain("40% chance of rain");
  });
});
