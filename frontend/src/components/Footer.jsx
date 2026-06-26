import { Link } from "react-router-dom";
import { IcPhone, IcZalo, IcMessenger, IcMap } from "./Icons.jsx";

const PHONE = "0327 322 722";

export default function Footer() {
  return (
    <footer>
      <div className="footer-bar">
        <div className="container">
          <div className="grid">
            <a href={`tel:${PHONE.replace(/\s/g, "")}`} aria-label="Gọi điện tới Bảo Trâm Spa">
              <span className="ic" aria-hidden="true"><IcPhone /></span>
              <span>
                <span className="t">Gọi ngay</span><br />
                <span className="s">{PHONE}</span>
              </span>
            </a>
            <a href="https://zalo.me/0327322722" target="_blank" rel="noreferrer" aria-label="Nhắn Zalo">
              <span className="ic" aria-hidden="true"><IcZalo /></span>
              <span>
                <span className="t">Nhắn Zalo</span><br />
                <span className="s">Tư vấn nhanh</span>
              </span>
            </a>
            <a href="https://m.me/spabaotram" target="_blank" rel="noreferrer" aria-label="Chat Messenger">
              <span className="ic" aria-hidden="true"><IcMessenger /></span>
              <span>
                <span className="t">Messenger</span><br />
                <span className="s">Chat ngay</span>
              </span>
            </a>
            <a href="#he-thong" aria-label="Chỉ đường đến chi nhánh">
              <span className="ic" aria-hidden="true"><IcMap /></span>
              <span>
                <span className="t">Chỉ đường</span><br />
                <span className="s">Đến chi nhánh</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-copy" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px" }}>
        <div>
          © 2026 Bảo Trâm Salon &amp; Spa · Châu Thành, Bến Tre · Thảo dược tự nhiên 100%
        </div>
        <nav aria-label="Footer links" style={{ fontSize: 13, opacity: 0.8 }}>
          <Link to="/chinh-sach-bao-mat" style={{ color: "inherit", marginRight: 12 }}>Chính sách bảo mật</Link>
          <span aria-hidden="true">·</span>
          <Link to="/dieu-khoan" style={{ color: "inherit", marginLeft: 12, marginRight: 12 }}>Điều khoản sử dụng</Link>
          <span aria-hidden="true">·</span>
          <Link to="/lien-he" style={{ color: "inherit", marginLeft: 12 }}>Liên hệ</Link>
        </nav>
      </div>
    </footer>
  );
}
