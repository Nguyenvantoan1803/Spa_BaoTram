import { useState, useEffect } from "react";

// Banner xin dong y cookie - tuan thu Nghi dinh 13/2023/ND-CP
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("cookieConsent")) {
      // Doi 1s sau khi load trang moi hien banner (UX tot hon)
      const t = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    localStorage.setItem("cookieConsentAt", new Date().toISOString());
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem("cookieConsent", "declined");
    localStorage.setItem("cookieConsentAt", new Date().toISOString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Thông báo cookie"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(74, 63, 53, 0.97)",
        color: "white",
        padding: "16px 20px",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
        zIndex: 9999,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px",
        justifyContent: "center"
      }}
    >
      <div style={{ flex: "1 1 300px", fontSize: 14, lineHeight: 1.5 }}>
        🍪 Chúng tôi sử dụng cookie để cải thiện trải nghiệm của bạn.
        Xem chi tiết tại <a href="/chinh-sach-bao-mat" style={{ color: "#FFD700", textDecoration: "underline" }}>Chính sách bảo mật</a>.
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            background: "transparent",
            color: "white",
            border: "1px solid white",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          Từ chối
        </button>
        <button
          onClick={accept}
          style={{
            background: "#C9A961",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: "bold"
          }}
        >
          Đồng ý
        </button>
      </div>
    </div>
  );
}
