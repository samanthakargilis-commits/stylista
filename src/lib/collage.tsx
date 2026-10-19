import { ImageResponse } from "next/og";

export function renderCollage(opts: {
  date: string;
  headline: string;
  label: string;
  pieces: { name: string; photo: string }[];
  pack: string;
}) {
  const size = 900;
  const n = opts.pieces.length;
  const cols = n === 3 || n > 4 ? 3 : 2;
  const rows = Math.ceil(opts.pieces.length / cols);
  const cell = Math.floor((size - 80 - (cols - 1) * 20) / cols);
  const photoH = Math.min(Math.floor(cell * 1.15), Math.floor((size - 260 - (rows - 1) * 20) / rows) - 30);
  const day = new Date(`${opts.date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", flexDirection: "column", background: "#f5f0e6", padding: 40, color: "#1f1b16" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 6, color: "#7a7064" }}>
          <span>STYLISTA</span>
          <span style={{ letterSpacing: 0 }}>{day}</span>
        </div>
        <div style={{ fontSize: 34, marginTop: 14, lineHeight: 1.2 }}>{opts.label}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 24, flex: 1, alignContent: "flex-start" }}>
          {opts.pieces.map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", width: cell, alignItems: "center" }}>
              <div style={{ display: "flex", width: cell, height: photoH, background: "#ffffff", borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                  <img src={p.photo} style={{ maxWidth: cell - 20, maxHeight: photoH - 20, objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 22, color: "#7a7064" }}>{p.name}</span>
                )}
              </div>
              <span style={{ fontSize: 20, marginTop: 8, color: "#7a7064", maxWidth: cell, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
        {opts.pack && (
          <div style={{ display: "flex", fontSize: 22, background: "#1f3d34", color: "#f5f0e6", borderRadius: 16, padding: "12px 18px" }}>
            Pack: {opts.pack}
          </div>
        )}
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=3600" } },
  );
}
