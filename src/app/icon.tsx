import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          borderRadius: 120,
        }}
      >
        <div
          style={{
            width: 110,
            height: 80,
            borderRadius: 16,
            background: "rgba(255,255,255,0.95)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 10,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
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
