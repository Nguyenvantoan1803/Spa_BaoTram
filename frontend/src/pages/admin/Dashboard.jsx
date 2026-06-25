import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listItems, getBookings, getContacts } from "../../adminApi";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      listItems("news"),
      listItems("combos"),
      listItems("services"),
      listItems("products"),
      getBookings(),
      getContacts()
    ]).then((r) => {
      const n = (i) => (r[i].status === "fulfilled" ? r[i].value.length : 0);
      setStats({
        news: n(0), combos: n(1), services: n(2),
        products: n(3), bookings: n(4), contacts: n(5)
      });
    });
  }, []);

  const cards = [
    { l: "Tin tức", k: "news", to: "/admin/tin-tuc" },
    { l: "Combo", k: "combos", to: "/admin/combo" },
    { l: "Dịch vụ", k: "services", to: "/admin/dich-vu" },
    { l: "Sản phẩm", k: "products", to: "/admin/san-pham" },
    { l: "Lượt đặt lịch", k: "bookings", to: "/admin/dat-lich" },
    { l: "Lượt liên hệ", k: "contacts", to: "/admin/lien-he" }
  ];

  return (
    <div>
      <div className="admin-toolbar"><h2>Tổng quan</h2></div>
      <div className="admin-stats">
        {cards.map((c) => (
          <Link key={c.k} to={c.to} className="stat-card">
            <div className="n">{stats ? stats[c.k] : "…"}</div>
            <div className="l">{c.l}</div>
          </Link>
        ))}
      </div>
      <div className="admin-msg ok" style={{ background: "#eef4ef", color: "#2b4a39" }}>
        👋 Chào mừng! Chọn mục bên trái để quản lý nội dung. Mọi thay đổi sẽ hiển thị ngay
        trên website. Nhớ đảm bảo <b>backend đang chạy</b> và đã <b>kết nối MongoDB</b>.
      </div>
    </div>
  );
}
