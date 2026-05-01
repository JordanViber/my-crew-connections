import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #f5efe4 0%, #f0c8b8 45%, #d1603d 100%)",
          borderRadius: 42,
          color: "#4a1f15",
          fontFamily: "Georgia, serif",
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: "-0.08em",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: 32,
            border: "4px solid rgba(74, 31, 21, 0.14)",
          }}
        />
        MC
      </div>
    ),
    size,
  );
}