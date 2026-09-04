import { ImageResponse } from "next/og";

export const alt = "Discretionary — UK restaurant service charge checker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Simple, dependency-free card in the site's own palette (see
// globals.css :root) — no external font fetch, so this stays fast and
// build-safe wherever it renders.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#14101b",
          padding: 60,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#f5f3e8",
            color: "#241b2e",
            padding: "70px 80px",
            boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#5b5265",
            }}
          >
            A crowdsourced UK directory
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 108,
              fontWeight: 900,
              lineHeight: 1,
              margin: "20px 0 30px",
              color: "#241b2e",
            }}
          >
            Discretionary.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              lineHeight: 1.4,
              color: "#5a3e8c",
              maxWidth: 900,
            }}
          >
            Check whether a UK restaurant adds a discretionary service
            charge — before you book, not after the bill arrives.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
