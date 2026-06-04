import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Դրամապանակ — Անձնական ֆինանսների կառավարիչ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Dynamically generated Open Graph / social share image with the brand mark. */
export default async function Image() {
  const font = await readFile(
    join(process.cwd(), "src/assets/fonts/noto-arm-700.woff"),
  );

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
          background: "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
          fontFamily: "Noto Sans Armenian",
          position: "relative",
        }}
      >
        {/* Brand wallet/card mark */}
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 44,
            background: "rgba(255,255,255,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 44,
            border: "2px solid rgba(255,255,255,0.35)",
          }}
        >
          <div
            style={{
              width: 104,
              height: 76,
              borderRadius: 16,
              background: "#ffffff",
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

        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          Դրամապանակ
        </div>
        <div
          style={{
            fontSize: 36,
            color: "rgba(255,255,255,0.92)",
            marginTop: 12,
          }}
        >
          Անձնական ֆինանսների կառավարիչ
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Noto Sans Armenian",
          data: font,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
