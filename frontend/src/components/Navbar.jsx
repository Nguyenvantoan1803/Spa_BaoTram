import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { IcLeaf, IcHands, IcTrophy, IcClock } from "./Icons.jsx";

const links = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/dich-vu", label: "Dịch vụ" },
  { to: "/#combo", label: "Combo ưu đãi", anchor: true },
  { to: "/san-pham", label: "Sản phẩm" },
  { to: "/#feedback", label: "Feedback", anchor: true },
  { to: "/#he-thong", label: "Hệ thống", anchor: true },
  { to: "/lien-he", label: "Liên hệ" }
];

// Tên trang hiển thị giữa thanh điều hướng trên điện thoại
const PAGE_TITLES = {
  "/": "Trang chủ",
  "/dich-vu": "Dịch vụ",
  "/san-pham": "Sản phẩm",
  "/gioi-thieu": "Giới thiệu",
  "/dao-tao": "Đào tạo",
  "/tin-tuc": "Tin tức",
  "/lien-he": "Liên hệ"
};

// Tên các mục neo trên trang chủ (đổi theo phần đang xem)
const SECTION_TITLES = {
  combo: "Combo ưu đãi",
  feedback: "Feedback",
  "he-thong": "Hệ thống"
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("");

  // Theo dõi đang cuộn tới section nào trên trang chủ để bật gạch cam tương ứng
  useEffect(() => {
    if (location.pathname !== "/") { setActiveSection(""); return; }
    const ids = ["combo", "feedback", "he-thong"];
    const onScroll = () => {
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.top <= 140 && r.bottom >= 140) current = id;
        }
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  // Cuộn tới section trên trang chủ (kể cả khi đang ở trang khác)
  const goAnchor = (e, to) => {
    e.preventDefault();
    setOpen(false);
    const id = to.split("#")[1];
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    if (location.pathname === "/") {
      scroll();
    } else {
      navigate("/");
      setTimeout(scroll, 350); // chờ trang chủ render xong rồi cuộn
    }
  };

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <div className="container">
          <span className="item"><IcLeaf /> Thảo dược tự nhiên 100%</span>
          <span className="item"><IcHands /> Kỹ thuật viên giàu kinh nghiệm</span>
          <span className="item"><IcTrophy /> Hơn 1000+ khách hàng tin tưởng</span>
          <span className="item"><IcClock /> Mở cửa: 8:00 - 21:00</span>
        </div>
      </div>

      {/* Navbar */}
      <header className="navbar">
        <div className="container">
          <Link to="/" className="logo" onClick={() => setOpen(false)}>
            <img src="/images/logo.jpg" alt="Bảo Trâm Salon & Spa" className="logo-img" />
          </Link>

          <span className="nav-current">
            {location.pathname === "/" && activeSection
              ? SECTION_TITLES[activeSection]
              : PAGE_TITLES[location.pathname] || ""}
          </span>

          <nav>
            <ul className={"nav-links" + (open ? " open" : "")}>
              {links.map((l) => {
                const id = l.anchor ? l.to.split("#")[1] : null;
                let active;
                if (l.anchor) active = location.pathname === "/" && activeSection === id;
                else if (l.to === "/") active = location.pathname === "/" && activeSection === "";
                else active = location.pathname === l.to;
                return (
                  <li key={l.to}>
                    {l.anchor ? (
                      <a href={l.to} className={active ? "active" : ""} onClick={(e) => goAnchor(e, l.to)}>
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <Link to="/lien-he" className="btn btn-green nav-cta">
            ĐẶT LỊCH NGAY
          </Link>

          <button
            className="nav-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </header>
    </>
  );
}
