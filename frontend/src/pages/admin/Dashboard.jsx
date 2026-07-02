import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listItems, getBookings, getContacts, getCustomers, getChatUnread } from "../../adminApi";

const pad = (n) => String(n).padStart(2, "0");
const fmtMoney = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const fmtShort = (n) => {
  const x = Number(n) || 0;
  if (x >= 1e9) return (x / 1e9).toFixed(1) + "B";
  if (x >= 1e6) return (x / 1e6).toFixed(1) + "tr";
  if (x >= 1e3) return Math.round(x / 1e3) + "k";
  return String(x);
};
const dateKey = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");

const STATUS = {
  moi: { label: "Mới", cls: "st-moi" },
  dang_dung: { label: "Đang phục vụ", cls: "st-serving" },
  da_dung: { label: "Hoàn tất", cls: "st-dung" },
  doi_dv: { label: "Đổi DV", cls: "st-doi" },
  huy: { label: "Đã huỷ", cls: "st-huy" }
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      getBookings(), getCustomers(), getContacts(),
      listItems("news"), listItems("combos"), listItems("services"), listItems("products")
    ]).then((r) => {
      const val = (i) => (r[i].status === "fulfilled" && Array.isArray(r[i].value) ? r[i].value : []);
      setData({
        bookings: val(0), customers: val(1), contacts: val(2),
        news: val(3).length, combos: val(4).length, services: val(5).length, products: val(6).length
      });
    });
    getChatUnread().then(setChatUnread).catch(() => {});
  }, []);

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const monthKey = todayKey.slice(0, 7);
  const dateStr = now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const m = useMemo(() => {
    if (!data) return null;
    const bk = data.bookings;
    const todayCount = bk.filter((b) => dateKey(b.date) === todayKey).length;
    const newCount = bk.filter((b) => (b.status || "moi") === "moi").length;
    const monthRevenue = bk.reduce((s, b) => {
      if (b.status !== "da_dung") return s;
      const k = dateKey(b.date) || (b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "");
      return k.startsWith(monthKey) ? s + (b.amount || 0) : s;
    }, 0);
    const recent = [...bk].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);
    return { todayCount, newCount, monthRevenue, recent };
  }, [data, todayKey, monthKey]);

  const metrics = m ? [
    { l: "Lịch hẹn hôm nay", v: m.todayCount, ico: "📅", color: "#1f5c3d", to: "/admin/dat-lich" },
    { l: "Lịch mới chưa xử lý", v: m.newCount, ico: "🆕", color: "#c9a55c", to: "/admin/dat-lich" },
    { l: "Doanh thu tháng này", v: fmtShort(m.monthRevenue), ico: "💰", color: "#1e7a3e", to: "/admin/thong-ke", title: fmtMoney(m.monthRevenue) },
    { l: "Tổng khách hàng", v: data.customers.length, ico: "🧑", color: "#1c5fb0", to: "/admin/khach-hang" }
  ] : [];

  const contentLinks = data ? [
    { l: "Tin tức", v: data.news, to: "/admin/tin-tuc" },
    { l: "Combo", v: data.combos, to: "/admin/combo" },
    { l: "Dịch vụ", v: data.services, to: "/admin/dich-vu" },
    { l: "Sản phẩm", v: data.products, to: "/admin/san-pham" }
  ] : [];

  const alerts = m ? [
    { ico: "🆕", l: "Lịch mới cần xử lý", v: m.newCount, to: "/admin/dat-lich", hot: m.newCount > 0 },
    { ico: "💬", l: "Tin nhắn chưa đọc", v: chatUnread, to: "/admin/tin-nhan", hot: chatUnread > 0 },
    { ico: "📅", l: "Lịch hẹn hôm nay", v: m.todayCount, to: "/admin/dat-lich", hot: false },
    { ico: "✉️", l: "Lượt liên hệ", v: data.contacts.length, to: "/admin/lien-he", hot: false }
  ] : [];

  const shortcuts = [
    { ico: "📅", l: "Quản lý đặt lịch", to: "/admin/dat-lich" },
    { ico: "💝", l: "Chăm sóc khách", to: "/admin/cham-soc" },
    { ico: "📈", l: "Xem doanh thu", to: "/admin/thong-ke" },
    { ico: "🏷️", l: "Tạo voucher", to: "/admin/voucher" }
  ];

  return (
    <div>
      <div className="dash-hero">
        <div>
          <h2>Xin chào 👋</h2>
          <p className="dash-date">Hôm nay là {dateStr}</p>
        </div>
        <Link to="/" target="_blank" className="dash-hero-btn">🌐 Xem website ↗</Link>
      </div>

      {!m ? (
        <div className="admin-empty">Đang tải số liệu...</div>
      ) : (
        <>
          <div className="dash-metrics">
            {metrics.map((c) => (
              <Link key={c.l} to={c.to} className="dash-metric" title={c.title || ""} style={{ "--mc": c.color }}>
                <span className="dash-metric-ico">{c.ico}</span>
                <span className="dash-metric-v">{c.v}</span>
                <span className="dash-metric-l">{c.l}</span>
              </Link>
            ))}
          </div>

          <div className="dash-grid">
            <div className="chart-card">
              <div className="chart-head"><h3>Lịch đặt mới nhất</h3><Link to="/admin/dat-lich" className="dash-seeall">Xem tất cả →</Link></div>
              {m.recent.length === 0 ? (
                <div className="admin-empty">Chưa có lượt đặt lịch nào.</div>
              ) : (
                <div className="dash-list">
                  {m.recent.map((b) => {
                    const st = STATUS[b.status] || STATUS.moi;
                    return (
                      <Link to="/admin/dat-lich" key={b.id} className="dash-bk">
                        <div className="dash-bk-main">
                          <b>{b.name || "—"}</b>
                          <span className="dash-bk-svc">{b.service || "—"}</span>
                        </div>
                        <div className="dash-bk-meta">
                          <span className="dash-bk-date">{b.date || "Chưa chọn"}</span>
                          <span className={"st-pill " + st.cls}>{st.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="dash-side">
              <div className="chart-card">
                <div className="chart-head"><h3>Cần chú ý</h3></div>
                <div className="dash-alerts">
                  {alerts.map((a) => (
                    <Link key={a.l} to={a.to} className={"dash-alert" + (a.hot ? " hot" : "")}>
                      <span className="dash-alert-ico">{a.ico}</span>
                      <span className="dash-alert-l">{a.l}</span>
                      <span className="dash-alert-v">{a.v}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-head"><h3>Lối tắt</h3></div>
                <div className="dash-shortcuts">
                  {shortcuts.map((s) => (
                    <Link key={s.l} to={s.to} className="dash-shortcut">
                      <span>{s.ico}</span>{s.l}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-head"><h3>Nội dung website</h3></div>
            <div className="dash-content-links">
              {contentLinks.map((c) => (
                <Link key={c.l} to={c.to} className="dash-cl">
                  <span className="dash-cl-v">{c.v}</span>
                  <span className="dash-cl-l">{c.l}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
