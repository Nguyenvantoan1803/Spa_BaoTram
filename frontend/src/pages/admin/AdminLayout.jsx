import { useEffect, useRef, useState } from "react";
import { Routes, Route, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { clearToken, getContacts, getChatUnread, getConversations } from "../../adminApi";
import { playDing, unlockAudio, requestNotifyPermission, showNotify } from "../../notifySound";
import CrudManager from "./CrudManager.jsx";
import Submissions from "./Submissions.jsx";
import Dashboard from "./Dashboard.jsx";
import Stats from "./Stats.jsx";
import BookingManager from "./BookingManager.jsx";
import ChatManager from "./ChatManager.jsx";
import CustomerManager from "./CustomerManager.jsx";
import CareManager from "./CareManager.jsx";
import VoucherManager from "./VoucherManager.jsx";
import StaffManager from "./StaffManager.jsx";
import ReviewManager from "./ReviewManager.jsx";

/* ----- Cấu hình form & cột cho từng loại nội dung ----- */
const NEWS = {
  path: "news",
  title: "Tin tức / Bài viết",
  fields: [
    { key: "title", label: "Tiêu đề", type: "text", placeholder: "Ưu đãi hè 2026..." },
    { key: "date", label: "Ngày đăng", type: "text", placeholder: "2026-06-01", hint: "Định dạng: NĂM-THÁNG-NGÀY" },
    { key: "image", label: "Ảnh (URL)", type: "image", placeholder: "https://..." },
    { key: "excerpt", label: "Mô tả ngắn", type: "textarea" },
    { key: "content", label: "Nội dung đầy đủ", type: "textarea" }
  ],
  columns: [
    { key: "image", label: "Ảnh", type: "image" },
    { key: "title", label: "Tiêu đề" },
    { key: "date", label: "Ngày" }
  ]
};

const COMBOS = {
  path: "combos",
  title: "Combo dịch vụ",
  fields: [
    { key: "name", label: "Tên combo", type: "text" },
    { key: "badge", label: "Nhãn", type: "text", placeholder: "HOT / BEST SELLER", hint: "Để trống nếu không hiển thị nhãn" },
    { key: "best", label: "Tô màu nhãn nổi bật (vàng)", type: "checkbox" },
    { key: "oldPrice", label: "Giá gốc", type: "text", placeholder: "199K" },
    { key: "price", label: "Giá ưu đãi", type: "text", placeholder: "99K" },
    { key: "image", label: "Ảnh (URL)", type: "image" },
    { key: "items", label: "Các mục (mỗi dòng 1 mục)", type: "list", placeholder: "Gội đầu thảo dược\nMassage cổ vai gáy" },
    { key: "gift", label: "Quà tặng", type: "text", placeholder: "Thư giãn 10 phút" }
  ],
  columns: [
    { key: "image", label: "Ảnh", type: "image" },
    { key: "name", label: "Tên" },
    { key: "price", label: "Giá" },
    { key: "badge", label: "Nhãn", type: "pill" }
  ]
};

const SERVICES = {
  path: "services",
  title: "Dịch vụ",
  fields: [
    { key: "name", label: "Tên dịch vụ", type: "text" },
    { key: "icon", label: "Icon (emoji)", type: "text", placeholder: "💆‍♀️" },
    { key: "description", label: "Mô tả", type: "textarea" },
    {
      key: "items",
      label: "Các gói dịch vụ",
      type: "service-items",
      hint: "Mỗi gói gồm: tên, thời lượng, giá và danh sách các bước."
    }
  ],
  columns: [
    { key: "icon", label: "Icon" },
    { key: "name", label: "Tên" },
    { key: "description", label: "Mô tả", type: "clip" }
  ]
};

const PRODUCTS = {
  path: "products",
  title: "Sản phẩm",
  fields: [
    { key: "name", label: "Tên sản phẩm", type: "text" },
    { key: "category", label: "Danh mục", type: "text", placeholder: "Chăm sóc tóc" },
    { key: "price", label: "Giá (VNĐ)", type: "number", placeholder: "180000" },
    { key: "image", label: "Ảnh (URL)", type: "image" },
    { key: "description", label: "Mô tả", type: "textarea" }
  ],
  columns: [
    { key: "image", label: "Ảnh", type: "image" },
    { key: "name", label: "Tên" },
    { key: "category", label: "Danh mục", type: "pill" },
    { key: "price", label: "Giá" }
  ]
};

const TESTIMONIALS = {
  path: "testimonials",
  title: "Đánh giá khách hàng",
  fields: [
    { key: "name", label: "Tên khách hàng", type: "text", placeholder: "Nguyễn Thị A" },
    { key: "rating", label: "Số sao (1 - 5)", type: "number", placeholder: "5" },
    { key: "loc", label: "Địa điểm", type: "text", placeholder: "Châu Thành, Bến Tre" },
    { key: "img", label: "Ảnh đại diện", type: "image" },
    { key: "comment", label: "Nội dung đánh giá", type: "textarea", placeholder: "Dịch vụ rất tốt, nhân viên thân thiện..." }
  ],
  columns: [
    { key: "img", label: "Ảnh", type: "image" },
    { key: "name", label: "Tên" },
    { key: "rating", label: "Sao" },
    { key: "comment", label: "Nội dung", type: "clip" }
  ]
};

// Menu gom theo nhóm cho gọn, dễ tìm
const MENU_SECTIONS = [
  {
    title: null, // nhóm đầu không cần tiêu đề
    items: [{ to: "/admin", end: true, ico: "📊", label: "Tổng quan" }]
  },
  {
    title: "Khách hàng & Lịch hẹn",
    items: [
      { to: "/admin/dat-lich", ico: "📅", label: "Đặt lịch" },
      { to: "/admin/khach-hang", ico: "🧑", label: "Khách hàng" },
      { to: "/admin/cham-soc", ico: "💝", label: "Chăm sóc KH" },
      { to: "/admin/danh-gia-dv", ico: "⭐", label: "Đánh giá DV" }
    ]
  },
  {
    title: "Kinh doanh",
    items: [
      { to: "/admin/thong-ke", ico: "📈", label: "Thống kê" },
      { to: "/admin/voucher", ico: "🏷️", label: "Voucher" },
      { to: "/admin/nhan-vien", ico: "🧑‍🔧", label: "Nhân viên" }
    ]
  },
  {
    title: "Liên lạc",
    items: [
      { to: "/admin/tin-nhan", ico: "💬", label: "Tin nhắn", badgeKey: "chat" },
      { to: "/admin/lien-he", ico: "✉️", label: "Liên hệ" }
    ]
  },
  {
    title: "Nội dung website",
    items: [
      { to: "/admin/tin-tuc", ico: "📝", label: "Tin tức" },
      { to: "/admin/combo", ico: "🎁", label: "Combo" },
      { to: "/admin/dich-vu", ico: "💆", label: "Dịch vụ" },
      { to: "/admin/san-pham", ico: "🛍️", label: "Sản phẩm" },
      { to: "/admin/danh-gia", ico: "🌟", label: "Đánh giá (web)" }
    ]
  }
];

// Mục nào đang được chọn -> để mở đúng nhóm chứa nó
const isItemActive = (m, pathname) =>
  m.end ? pathname === m.to : pathname === m.to || pathname.startsWith(m.to + "/");
const isSectionActive = (sec, pathname) => sec.items.some((m) => isItemActive(m, pathname));

export default function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  // Nhóm nào đang mở (accordion). Mặc định mở nhóm chứa trang hiện tại.
  const [openSecs, setOpenSecs] = useState(() => {
    const s = {};
    MENU_SECTIONS.forEach((sec, i) => { if (sec.title && isSectionActive(sec, loc.pathname)) s[i] = true; });
    return s;
  });
  const toggleSec = (i) => setOpenSecs((s) => ({ ...s, [i]: !s[i] }));

  // Khi chuyển trang, tự mở nhóm chứa trang đang xem (giữ nguyên nhóm user đã mở)
  useEffect(() => {
    setOpenSecs((prev) => {
      const next = { ...prev };
      MENU_SECTIONS.forEach((sec, i) => { if (sec.title && isSectionActive(sec, loc.pathname)) next[i] = true; });
      return next;
    });
  }, [loc.pathname]);
  const [chatUnread, setChatUnread] = useState(0);
  const [muted, setMuted] = useState(
    () => localStorage.getItem("baotram_chat_muted") === "1"
  );
  const prevUnreadRef = useRef(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Mở khoá âm thanh + xin quyền thông báo ngay khi admin tương tác lần đầu
  // (trình duyệt chặn âm thanh & thông báo cho tới khi có click/gõ phím).
  useEffect(() => {
    const onGesture = () => {
      unlockAudio();
      requestNotifyPermission();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  // Đếm tin nhắn chưa đọc -> hiện badge + kêu chuông + thông báo khi có tin mới
  useEffect(() => {
    const load = async () => {
      try {
        const n = await getChatUnread();
        setChatUnread(n);
        // Lần đầu chỉ ghi nhận, không báo; sau đó báo khi số tăng (có tin mới)
        if (prevUnreadRef.current !== null && n > prevUnreadRef.current) {
          if (!mutedRef.current) playDing();
          // Lấy tên khách mới nhất để hiện trong thông báo
          let who = "Khách";
          try {
            const list = await getConversations();
            if (Array.isArray(list) && list[0]) {
              who = list[0].name || (list[0].phone ? "SĐT " + list[0].phone : "Khách");
            }
          } catch { /* bỏ qua */ }
          // Hiện thông báo trình duyệt khi admin đang ở tab/ứng dụng khác
          if (document.hidden) {
            showNotify(
              "💬 Tin nhắn mới — Bảo Trâm Spa",
              `${who} vừa nhắn tin (${n} tin chưa đọc). Bấm để trả lời.`,
              () => nav("/admin/tin-nhan")
            );
          }
        }
        prevUnreadRef.current = n;
      } catch { /* bỏ qua */ }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [nav]);

  // Nhấp nháy tiêu đề tab khi có tin chưa đọc & admin đang ở tab khác
  useEffect(() => {
    const original = "Quản trị · Bảo Trâm Spa";
    if (chatUnread <= 0) { document.title = original; return; }
    let flip = false;
    const tick = () => {
      if (document.hidden) {
        flip = !flip;
        document.title = flip ? `(${chatUnread}) 💬 Tin nhắn mới` : original;
      } else {
        document.title = original; // đang xem tab admin thì để tiêu đề bình thường
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    const onVisible = () => { if (!document.hidden) document.title = original; };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      document.title = original;
    };
  }, [chatUnread]);

  const toggleMute = () => {
    const v = !muted;
    setMuted(v);
    localStorage.setItem("baotram_chat_muted", v ? "1" : "0");
    unlockAudio();             // bấm nút là cú tương tác -> mở khoá âm thanh
    requestNotifyPermission(); // và xin quyền hiện thông báo trình duyệt
    if (!v) playDing();        // bật tiếng thì kêu thử 1 cái
  };

  const logout = () => { clearToken(); nav("/admin/login", { replace: true }); };

  return (
    <div className="admin-root">
      <aside className={"admin-side" + (open ? " open" : "")}>
        <div className="brand">
          <b>BẢO TRÂM</b>
          <span>QUẢN TRỊ</span>
        </div>
        <nav className="admin-nav" onClick={() => setOpen(false)}>
          {MENU_SECTIONS.map((sec, i) => {
            const renderLink = (m) => (
              <NavLink key={m.to} to={m.to} end={m.end}
                className={({ isActive }) => (isActive ? "active" : "")}>
                <span className="ico">{m.ico}</span> {m.label}
                {m.badgeKey === "chat" && chatUnread > 0 && (
                  <span className="nav-badge">{chatUnread}</span>
                )}
              </NavLink>
            );
            // Nhóm không tiêu đề (Tổng quan) -> luôn hiện
            if (!sec.title) return <div className="nav-group" key={i}>{sec.items.map(renderLink)}</div>;
            const isOpen = !!openSecs[i];
            // Badge tin nhắn hiện cạnh tiêu đề khi nhóm đang thu lại
            const secBadge = !isOpen && sec.items.some((m) => m.badgeKey === "chat") && chatUnread > 0;
            return (
              <div className={"nav-group collapsible" + (isOpen ? " open" : "")} key={sec.title}>
                <button type="button" className="nav-group-title"
                  onClick={(e) => { e.stopPropagation(); toggleSec(i); }}>
                  <span>{sec.title}</span>
                  <span className="nav-caret">
                    {secBadge && <span className="nav-badge sm">{chatUnread}</span>}
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>
                {isOpen && sec.items.map(renderLink)}
              </div>
            );
          })}
        </nav>
        <button className="logout" onClick={logout}>Đăng xuất</button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="admin-burger" onClick={() => setOpen((o) => !o)}>☰</button>
            <h1>Trang quản trị</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="snd-toggle"
              onClick={toggleMute}
              title={muted ? "Đang tắt âm báo — bấm để bật" : "Đang bật âm báo — bấm để tắt"}
            >
              {muted ? "🔕" : "🔔"}
            </button>
            <Link to="/" className="view-site" target="_blank">🌐 Xem website ↗</Link>
          </div>
        </header>

        <div className="admin-content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="tin-tuc" element={<CrudManager {...NEWS} />} />
            <Route path="combo" element={<CrudManager {...COMBOS} />} />
            <Route path="dich-vu" element={<CrudManager {...SERVICES} />} />
            <Route path="san-pham" element={<CrudManager {...PRODUCTS} />} />
            <Route path="danh-gia" element={<CrudManager {...TESTIMONIALS} />} />
            <Route path="dat-lich" element={<BookingManager />} />
            <Route path="khach-hang" element={<CustomerManager />} />
            <Route path="cham-soc" element={<CareManager />} />
            <Route path="danh-gia-dv" element={<ReviewManager />} />
            <Route path="nhan-vien" element={<StaffManager />} />
            <Route path="voucher" element={<VoucherManager />} />
            <Route path="tin-nhan" element={<ChatManager />} />
            <Route path="thong-ke" element={<Stats />} />
            <Route path="lien-he" element={
              <Submissions title="Liên hệ" path="contact" fetch={getContacts}
                columns={[
                  { key: "name", label: "Họ tên" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Điện thoại" },
                  { key: "message", label: "Nội dung" },
                  { key: "createdAt", label: "Gửi lúc" }
                ]} />
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
}
