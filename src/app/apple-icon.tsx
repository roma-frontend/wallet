import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981, #0d9488)",
          borderRadius: 42,
        }}
      >
        <div
          style={{
            width: 40,
            height: 28,
            borderRadius: 6,
            background: "rgba(255,255,255,0.95)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 3,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#10b981",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
