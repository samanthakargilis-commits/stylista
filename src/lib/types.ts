export const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "jumpsuit",
  "set",
  "layer",
  "activewear",
  "shoes",
  "accessory",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Rows mirror supabase/migrations/0001_init.sql. */
export type Item = {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  category: Category;
  color: string;
  fabric: string;
  notes: string;
  photo_url: string;
  clean: boolean;
  last_worn: string | null;
  created_at: string;
};

export const WORK_MODES = ["office", "wfh", "either", "off"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export type DayRoutine = {
  work: WorkMode;
  /** Anything that needs a packed outfit, e.g. "Yoga after work". */
  activities: string;
  afterWork: string;
};

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type Place = { label: string; lat: number; lon: number };

export type Profile = {
  user_id: string;
  name: string;
  body_type: string;
  best_shapes: string;
  fabric_loves: string;
  fabric_avoids: string;
  style_notes: string;
  style_dna: string;
  week: DayRoutine[];
  gaps: Gap[];
  home_place: Place | null;
  work_place: Place | null;
  timezone: string;
  notify_time: string;
  calendar_urls: string[];
  phone: string;
  notify_push: boolean;
  notify_sms: boolean;
  notify_telegram: boolean;
  telegram_chat_id: number | null;
  telegram_link_code: string | null;
  last_laundry: string | null;
  last_notified_on: string | null;
};

export type StyleEvent = {
  id: string;
  user_id: string;
  title: string;
  /** ISO date for one-off events. */
  date: string | null;
  /** 0-6 (Sunday-Saturday) for weekly recurring events. */
  weekday: number | null;
  notes: string;
};

export type Inspiration = {
  id: string;
  user_id: string;
  photo_url: string;
  note: string;
  created_at: string;
};

export type Look = {
  /** Short name for the option, e.g. "Office polish" or "WFH, camera-ready". */
  label: string;
  itemIds: string[];
  /** Set when the look is one of their saved outfits. */
  outfitId: string | null;
  howToWear: string;
  why: string;
};

export type DayPlan = {
  date: string;
  dayType: string;
  /** One line for the notification, e.g. "58° and foggy → cream wide-legs + black halter". */
  headline: string;
  weather: string;
  calendar: string[];
  /** Two or three options, best first. The first one goes in the notification. */
  options: Look[];
  afterWork: { itemIds: string[]; note: string } | null;
  pack: { itemIds: string[]; note: string } | null;
  heads_up: string;
};

export type DayPlanRow = {
  id: string;
  user_id: string;
  date: string;
  plan: DayPlan;
  created_at: string;
};

export type Gap = {
  title: string;
  why: string;
  buy: string;
};

export type Outfit = {
  id: string;
  user_id: string;
  name: string;
  item_ids: string[];
  notes: string;
  created_at: string;
};

/** How many of the newest inspirations go into a style DNA read. */
export const DNA_SAMPLE = 24;
