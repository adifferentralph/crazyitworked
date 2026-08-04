import { ImageResponse } from "next/og";

export const alt = "Twenty-Two Parts — Find the right automotive part";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#070d19",
        color: "white",
        display: "flex",
        height: "100%",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "80px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#ea580c",
          borderRadius: "999px",
          filter: "blur(80px)",
          height: "360px",
          opacity: 0.34,
          position: "absolute",
          right: "-80px",
          top: "-100px",
          width: "360px",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "820px" }}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            gap: 18,
          }}
        >
          <span
            style={{
              alignItems: "center",
              background: "#ea580c",
              borderRadius: 18,
              display: "flex",
              height: 70,
              justifyContent: "center",
              width: 70,
            }}
          >
            22
          </span>
          Twenty-Two Parts
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 0.98,
            marginTop: 64,
          }}
        >
          Find the right part.
          <span style={{ color: "#fdba74", display: "block" }}>Keep everything moving.</span>
        </div>
      </div>
      <div
        style={{
          border: "2px solid rgba(255,255,255,.18)",
          borderRadius: 40,
          display: "flex",
          fontSize: 96,
          fontWeight: 800,
          height: 260,
          justifyContent: "center",
          alignItems: "center",
          width: 260,
        }}
      >
        22
      </div>
    </div>,
    size,
  );
}
