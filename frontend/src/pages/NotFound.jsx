import { Link } from "react-router-dom";

/* Trang 404 cho các đường dẫn không tồn tại. */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
        gap: 12
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 800, color: "#B06B6E", lineHeight: 1 }}>404</div>
      <h1 style={{ margin: 0, fontSize: 24 }}>Không tìm thấy trang</h1>
      <p style={{ color: "#666", maxWidth: 420 }}>
        Trang bạn tìm không tồn tại hoặc đã được di chuyển. Bạn quay lại trang chủ nhé.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          background: "#B06B6E",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: 999,
          textDecoration: "none",
          fontWeight: 600
        }}
      >
        ← Về trang chủ
      </Link>
    </div>
  );
}
