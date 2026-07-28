import { ImageResponse } from "next/og";

export const alt = "DinSL – Hinner du nästa? Realtidsavgångar i Stockholm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(145deg, #07121f 0%, #0f2a44 55%, #163a5c 100%)",
          color: "#ffffff"
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#93c5fd",
            fontWeight: 600
          }}
        >
          DinSL
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
            Hinner du nästa?
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 820
            }}
          >
            Tydligt lämna-nu-besked och läsbara SL-avgångsskärmar för Stockholm.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.55)" }}>
          dinsl.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
