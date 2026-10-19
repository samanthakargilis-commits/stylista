"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { useData } from "./data";
import { Field, inputClass, SectionTitle } from "./ui";

type TextKey = "name" | "body_type" | "best_shapes" | "fabric_loves" | "fabric_avoids" | "style_notes";

const FIELDS: { key: TextKey; label: string; placeholder: string; long?: boolean }[] = [
  { key: "name", label: "Name", placeholder: "What should Stylista call you?" },
  { key: "body_type", label: "Body type", placeholder: "e.g. Dramatic: broad shoulders, small waist, slim hips" },
  { key: "best_shapes", label: "Shapes that look best on you", placeholder: "e.g. wide-leg long pants, halters, thick straps, tanks", long: true },
  { key: "fabric_loves", label: "Fabrics you love", placeholder: "e.g. modal/silk blends, Pima cotton" },
  { key: "fabric_avoids", label: "Fabrics or pieces you can't wear", placeholder: "e.g. polyester, regular jeans" },
  { key: "style_notes", label: "Anything else", placeholder: "Colors you love, things you never wear, your vibe…", long: true },
];

export function AboutSection() {
  const { data, updateProfile } = useData();
  return (
    <div>
      <SectionTitle sub="The more Stylista knows, the more every look feels like you.">About you</SectionTitle>
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <SavedText key={f.key} field={f} profile={data.profile} onSave={(v) => updateProfile({ [f.key]: v })} />
        ))}
      </div>
    </div>
  );
}

function SavedText({
  field,
  profile,
  onSave,
}: {
  field: (typeof FIELDS)[number];
  profile: Profile;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(profile[field.key]);
  const props = {
    className: field.long ? `${inputClass} min-h-20` : inputClass,
    placeholder: field.placeholder,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(e.target.value),
    onBlur: () => value !== profile[field.key] && onSave(value),
  };
  return <Field label={field.label}>{field.long ? <textarea {...props} /> : <input {...props} />}</Field>;
}
