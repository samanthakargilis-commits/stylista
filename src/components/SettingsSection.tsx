"use client";

import { useState } from "react";
import type { Place } from "@/lib/types";
import { callApi, useData } from "./data";
import { Button, ErrorNote, Field, inputClass, SectionTitle, useAsync } from "./ui";

export function WeatherCalendarSection() {
  const { data, updateProfile } = useData();
  const [calendars, setCalendars] = useState(data.profile.calendar_urls.join("\n"));
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionTitle sub="Each morning's look checks the forecast where you'll be: home in the morning and evening, work on office days.">
          Weather
        </SectionTitle>
        <PlacePicker label="Home" value={data.profile.home_place} onPick={(p) => updateProfile({ home_place: p })} />
        <PlacePicker label="Work" value={data.profile.work_place} onPick={(p) => updateProfile({ work_place: p })} />
        <Field label="Time zone">
          <select
            className={inputClass}
            value={data.profile.timezone}
            onChange={(e) => updateProfile({ timezone: e.target.value })}
          >
            {Intl.supportedValuesOf("timeZone").map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </Field>
      </section>

      <section className="space-y-3">
        <SectionTitle sub="Paste a private calendar link, one per line. Stylista only reads it.">Calendars</SectionTitle>
        <textarea
          className={`${inputClass} min-h-24 font-mono text-xs`}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          value={calendars}
          onChange={(e) => setCalendars(e.target.value)}
          onBlur={() =>
            updateProfile({
              calendar_urls: calendars
                .split(/\s+/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
        <details className="rounded-2xl bg-card p-3 text-sm text-ink">
          <summary className="cursor-pointer font-medium">Where do I find my link?</summary>
          <p className="mt-2">
            <b>Google Calendar</b> (on a computer): Settings → click your calendar → Integrate calendar → copy the{" "}
            <i>Secret address in iCal format</i>.
          </p>
          <p className="mt-2">
            <b>Apple Calendar</b> (iCloud): in the Calendar app, tap ⓘ next to a calendar → turn on <i>Public Calendar</i> →
            Share Link → Copy. It looks private but anyone with the link can read it, so only paste it here.
          </p>
        </details>
      </section>
    </div>
  );
}

function PlacePicker({ label, value, onPick }: { label: string; value: Place | null; onPick: (p: Place) => void }) {
  const [query, setQuery] = useState(value?.label ?? "");
  const { busy, error, run } = useAsync();
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Neighborhood, city or ZIP"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          variant="secondary"
          disabled={busy || !query.trim() || query === value?.label}
          onClick={() =>
            run(async () => {
              const place = await callApi<Place>(`/api/places?q=${encodeURIComponent(query)}`, undefined, "GET");
              onPick(place);
            })
          }
        >
          {busy ? "…" : "Set"}
        </Button>
      </div>
      {value && query === value.label && (
        <span className="mt-1 block text-xs text-accent">
          ✓ Set ({value.lat.toFixed(3)}, {value.lon.toFixed(3)})
        </span>
      )}
      <ErrorNote message={error} />
    </Field>
  );
}

export function NotificationsSection() {
  const { data, updateProfile } = useData();
  const { busy, error, run, setError } = useAsync();
  const [phone, setPhone] = useState(data.profile.phone);
  const [status, setStatus] = useState("");

  const isIos = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent);
  const installed = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  const enablePush = () =>
    run(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error(
          isIos && !installed
            ? "On iPhone, first add Stylista to your Home Screen (Share → Add to Home Screen), then open it from there."
            : "This browser doesn't support notifications.",
        );
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in your phone's settings.");
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Notifications aren't set up on the server yet (missing VAPID key).");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
      await callApi("/api/push/subscribe", sub.toJSON());
      await updateProfile({ notify_push: true });
      setStatus("Notifications are on for this device.");
    });

  return (
    <div className="space-y-6">
      <SectionTitle sub="Your look arrives every morning. Glance at it and get dressed.">Morning notification</SectionTitle>

      <Field label="Send my look at">
        <input
          type="time"
          className={inputClass}
          value={data.profile.notify_time}
          onChange={(e) => e.target.value && updateProfile({ notify_time: e.target.value })}
        />
      </Field>

      <section className="space-y-2 rounded-2xl bg-card p-4">
        <h3 className="font-serif text-lg text-ink">App notification</h3>
        <p className="text-sm text-muted">
          {isIos
            ? "On iPhone it shows the headline; tap it for the collage. Add Stylista to your Home Screen first."
            : "Shows the headline and the outfit collage."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={enablePush} disabled={busy}>
            Turn on for this device
          </Button>
          {data.profile.notify_push && (
            <Button variant="secondary" onClick={() => updateProfile({ notify_push: false })}>
              Pause app notifications
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-4">
        <h3 className="font-serif text-lg text-ink">Telegram with the collage (free)</h3>
        <p className="text-sm text-muted">
          Your look arrives as a Telegram message with the outfit picture right in the notification, plus buttons for
          &ldquo;Wearing this&rdquo; and &ldquo;Next look&rdquo;. Install Telegram first, then connect.
        </p>
        {data.profile.telegram_chat_id ? (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={data.profile.notify_telegram}
              onChange={(e) => updateProfile({ notify_telegram: e.target.checked })}
            />
            Send my look on Telegram every morning
          </label>
        ) : (
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { url } = await callApi<{ url: string }>("/api/telegram/link");
                window.location.href = url;
              })
            }
          >
            Connect Telegram
          </Button>
        )}
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-4">
        <h3 className="font-serif text-lg text-ink">Text message with the collage</h3>
        <p className="text-sm text-muted">The outfit picture shows right in the text, even on iPhone.</p>
        <Field label="Mobile number">
          <input
            className={inputClass}
            type="tel"
            placeholder="+1 415 555 0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => phone !== data.profile.phone && updateProfile({ phone: toE164(phone) })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={data.profile.notify_sms}
            onChange={(e) => {
              if (e.target.checked && !phone.trim()) {
                setError("Add your number first.");
                return;
              }
              void updateProfile({ notify_sms: e.target.checked, phone: toE164(phone) });
            }}
          />
          Text me my look every morning
        </label>
      </section>

      <Button
        variant="secondary"
        disabled={busy}
        onClick={() =>
          run(async () => {
            const res = await callApi<{ pushed: number; texted: boolean; telegrammed: boolean }>("/api/push/test");
            setStatus(
              `Test sent: ${res.pushed} device notification${res.pushed === 1 ? "" : "s"}${res.texted ? ", a text" : ""}${res.telegrammed ? ", a Telegram message" : ""}.`,
            );
          })
        }
      >
        Send me a test
      </Button>
      {status && <p className="text-sm text-accent">{status}</p>}
      <ErrorNote message={error} />
    </div>
  );
}

function toE164(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
