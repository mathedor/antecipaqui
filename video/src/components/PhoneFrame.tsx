import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: 480,
        height: 980,
        borderRadius: 70,
        background: "#0a0e1a",
        padding: 16,
        boxShadow:
          "0 50px 100px rgba(15,23,42,0.4), 0 0 0 2px rgba(0,0,0,0.6)",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: 180,
          height: 36,
          background: "#0a0e1a",
          borderRadius: 24,
          zIndex: 20,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 56,
          background: "white",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 60,
            padding: "20px 50px 0 50px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            zIndex: 10,
          }}
        >
          <span>9:41</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span>●●●</span>
            <span>📶</span>
            <span
              style={{
                width: 32,
                height: 16,
                border: "2px solid #0f172a",
                borderRadius: 3,
                padding: 1,
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  background: "#0f172a",
                  borderRadius: 1,
                }}
              />
            </span>
          </div>
        </div>
        <div style={{ position: "absolute", inset: 0, paddingTop: 60 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
