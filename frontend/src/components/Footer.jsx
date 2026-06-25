import { IcPhone, IcZalo, IcMessenger, IcMap } from "./Icons.jsx";

const PHONE = "0327 322 722";

export default function Footer() {
  return (
    <footer>
      <div className="footer-bar">
        <div className="container">
          <div className="grid">
            <a href={`tel:${PHONE.replace(/\s/g, "")}`}>
              <span className="ic"><IcPhone /></span>
              <span>
                <span className="t">Gọi ngay</span><br />
                <span className="s">{PHONE}</span>
              </span>
            </a>
            <a href="https://zalo.me/0327322722" target="_blank" rel="noreferrer">
              <span className="ic"><IcZalo /></span>
              <span>
                <span className="t">Nhắn Zalo</span><br />
                <span className="s">Tư vấn nhanh</span>
              </span>
            </a>
            <a href="https://m.me/spabaotram" target="_blank" rel="noreferrer">
              <span className="ic"><IcMessenger /></span>
              <span>
                <span className="t">Messenger</span><br />
                <span className="s">Chat ngay</span>
              </span>
            </a>
            <a href="#he-thong">
              <span className="ic"><IcMap /></span>
              <span>
                <span className="t">Chỉ đường</span><br />
                <span className="s">Đến chi nhánh</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-copy">
        © 2026 Bảo Trâm Salon &amp; Spa · Châu Thành, Bến Tre · Thảo dược tự nhiên 100%
      </div>
    </footer>
  );
}
