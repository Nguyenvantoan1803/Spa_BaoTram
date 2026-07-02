import { useEffect, useMemo, useState } from "react";
import { getBookings, updateBooking, deleteItem, getStaff, createBookingReview, createBooking, getCustomers } from "../../adminApi";
import { getCombos, getServices, getInfo } from "../../api";
import { buildServiceOptions } from "../../servicesData";

/* Cấu hình trạng thái xử lý lịch hẹn */
const STATUS = {
  moi: { label: "Đang chờ", cls: "st-moi" },
  dang_dung: { label: "Đang phục vụ", cls: "st-serving" },
  da_dung: { label: "Đã sử dụng DV", cls: "st-dung" },
  doi_dv: { label: "Đổi DV (khách)", cls: "st-doi" },
  huy: { label: "Đã huỷ", cls: "st-huy" }
};
const STATUS_KEYS = ["moi", "dang_dung", "da_dung", "doi_dv", "huy"];
// Thanh tab: "active" = Đang chờ + Đang phục vụ; còn lại lọc theo từng trạng thái
const BK_TABS = [
  { key: "active", label: "Tất cả", ico: "📋", cls: "" },
  { key: "moi", label: "Đang chờ", ico: "🕒", cls: "st-moi" },
  { key: "dang_dung", label: "Đang phục vụ", ico: "💆", cls: "st-serving" },
  { key: "da_dung", label: "Đã sử dụng DV", ico: "✅", cls: "st-dung" },
  { key: "doi_dv", label: "Đổi DV", ico: "🔁", cls: "st-doi" },
  { key: "huy", label: "Đã huỷ", ico: "✖️", cls: "st-huy" }
];

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

// Luồng trạng thái cho phép từ trạng thái hiện tại (1 chiều)
const ALLOWED_NEXT = {
  moi: ["moi", "dang_dung", "doi_dv", "huy"],          // Đang chờ: KHÔNG cho thẳng "Đã sử dụng DV"
  dang_dung: ["dang_dung", "da_dung"],                  // Đang phục vụ: chỉ cho "Đã sử dụng DV"
  da_dung: ["da_dung"],                                 // Đã sử dụng: kết thúc
  doi_dv: ["doi_dv", "dang_dung", "huy"],
  huy: ["huy", "moi"]                                   // cho khôi phục lịch huỷ về chờ
};

// Tính thời lượng giữa 2 mốc (hoặc tới hiện tại nếu chưa xong)
const fmtDur = (start, end) => {
  if (!start) return null;
  const s = new Date(start), e = end ? new Date(end) : new Date();
  if (isNaN(s.getTime())) return null;
  const m = Math.max(0, Math.round((e - s) / 60000));
  if (m < 60) return m + " phút";
  const h = Math.floor(m / 60), r = m % 60;
  return h + "h" + (r ? ` ${r}p` : "");
};

const onlyDigits = (s) => (s || "").replace(/[^0-9]/g, "");

/* Định dạng ngày hẹn (có thể kèm giờ) + cờ hôm nay/sắp tới */
function fmtAppt(v) {
  if (!v) return null;
  const hasTime = typeof v === "string" && v.includes("T");
  const d = new Date(v);
  if (isNaN(d.getTime())) return { text: v, flag: null };
  const opts = hasTime
    ? { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const sameDay = d.toDateString() === now.toDateString();
  const diff = d - now;
  let flag = null;
  if (sameDay) flag = "today";
  else if (diff > 0 && diff <= 3 * dayMs) flag = "soon";
  else if (diff < 0) flag = "past";
  return { text: d.toLocaleString("vi-VN", opts), flag };
}

function fmtSent(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("vi-VN");
}

/* ----- Helper cho chế độ Lịch ----- */
// Lấy phần ngày "YYYY-MM-DD" từ chuỗi date (bỏ phần giờ nếu có)
const dateKey = (v) => {
  if (!v || typeof v !== "string") return "";
  const m = v.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
};
// Lấy giờ "HH:MM" nếu có
const timeOf = (v) => {
  if (typeof v === "string" && v.includes("T")) return v.split("T")[1].slice(0, 5);
  return "";
};
// Khoá ngày theo y/m/d (m: 0-11)
const ymd = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

export default function BookingManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [copied, setCopied] = useState("");
  const [savingId, setSavingId] = useState("");
  // Chế độ hiển thị: danh sách | lịch
  const [view, setView] = useState("list");
  // Tháng đang xem trong lịch (m: 0-11)
  const [cal, setCal] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  // Khoá ngày đang mở chi tiết (popup cả ngày)
  const [dayView, setDayView] = useState("");
  // Modal bắt đầu phục vụ (gán KTV): { booking, staff } | null
  const [servingModal, setServingModal] = useState(null);
  // Modal hoàn tất: tiền + KTV + đánh giá 5 sao
  const [completeModal, setCompleteModal] = useState(null);
  const [cmBusy, setCmBusy] = useState(false);
  // Sửa lịch hẹn
  const [opts, setOpts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [custList, setCustList] = useState([]);   // khách hàng đã có (để gợi ý)
  const [showCust, setShowCust] = useState(false); // hiện gợi ý khách
  const [edit, setEdit] = useState(null);
  const [ef, setEf] = useState({ name: "", phone: "", service: "", branch: "", staff: "", date: "", time: "", note: "", now: false });
  const [esaving, setEsaving] = useState(false);
  const [emsg, setEmsg] = useState(null);

  const load = () => {
    setLoading(true);
    getBookings()
      .then((d) => { setItems(Array.isArray(d) ? d : []); setErr(""); })
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Tải combo/dịch vụ + cơ sở để chọn khi sửa
  useEffect(() => {
    Promise.all([getCombos().catch(() => []), getServices().catch(() => [])]).then(([c, s]) => {
      const combos = (Array.isArray(c) ? c : []).map((x) => `Combo: ${x.name}`);
      setOpts([...combos, ...buildServiceOptions(Array.isArray(s) ? s : [])]);
    });
    getInfo().then((d) => setBranches(Array.isArray(d?.branches) ? d.branches : [])).catch(() => {});
    getStaff().then((d) => setStaffList(Array.isArray(d) ? d.filter((s) => s.active !== false) : [])).catch(() => {});
    getCustomers().then((d) => setCustList(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Gợi ý khách đã có theo tên/SĐT đang gõ
  const custSuggest = useMemo(() => {
    const q = norm((ef.name || "").trim());
    const qd = onlyDigits(ef.phone);
    if (q.length < 1 && qd.length < 3) return [];
    return custList.filter((c) => {
      const byName = q && norm(c.name || "").includes(q);
      const byPhone = qd && onlyDigits(c.phone || "").includes(qd);
      return byName || byPhone;
    }).slice(0, 6);
  }, [custList, ef.name, ef.phone]);

  const pickCust = (c) => {
    setEf((f) => ({ ...f, name: c.name || "", phone: c.phone || "" }));
    setShowCust(false);
  };

  // Chuỗi thời gian hiện tại dạng cho lưu (YYYY-MM-DDTHH:MM)
  const nowLocalStr = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const openNew = () => {
    setEf({ name: "", phone: "", service: "", branch: "", staff: "", date: "", time: "", note: "", now: false });
    setEmsg(null); setShowCust(false);
    setEdit({}); // {} = tạo mới
  };

  const openEdit = (b) => {
    let date = "", time = "";
    if (b.date && /^\d{4}-\d{2}-\d{2}/.test(b.date)) {
      const [dd, tt] = b.date.split("T");
      date = dd; time = tt ? tt.slice(0, 5) : "";
    }
    setEf({
      name: b.name || "", phone: b.phone || "", service: b.service || "",
      branch: b.branch || "", staff: b.staff || "", date, time,
      note: b.note || "", now: false
    });
    setEmsg(null); setShowCust(false);
    setEdit(b);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!ef.name.trim() || !ef.phone.trim() || !ef.service) {
      setEmsg("Vui lòng nhập tên, SĐT và chọn dịch vụ.");
      return;
    }
    setEsaving(true); setEmsg(null);
    const dateVal = ef.now ? nowLocalStr() : (ef.date ? (ef.time ? `${ef.date}T${ef.time}` : ef.date) : "");
    const body = {
      name: ef.name.trim(), phone: ef.phone.trim(), service: ef.service,
      branch: ef.branch || "", staff: ef.staff || "", date: dateVal, note: ef.note || ""
    };
    try {
      if (edit.id) {
        const updated = await updateBooking(edit.id, body);
        setItems((arr) => arr.map((x) => (x.id === edit.id ? { ...x, ...updated } : x)));
      } else {
        await createBooking(body); // tạo lịch thủ công
        load();
      }
      setEdit(null);
    } catch {
      setEmsg("Lưu thất bại, thử lại nhé.");
    } finally { setEsaving(false); }
  };

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return items.filter((b) => {
      const st = b.status || "moi";
      if (statusFilter === "active") {
        if (st !== "moi" && st !== "dang_dung") return false;
      } else if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!nq) return true;
      const hay = norm([b.name, b.phone, b.service, b.date, b.note].join(" "));
      return hay.includes(nq) || onlyDigits(b.phone).includes(onlyDigits(q));
    });
  }, [items, q, statusFilter]);

  const copyPhone = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(phone);
      setTimeout(() => setCopied(""), 1300);
    } catch {
      alert("Không copy được. Số: " + phone);
    }
  };

  const changeStatus = async (b, status) => {
    // "Đang phục vụ" -> mở modal gán KTV; "Hoàn tất" -> modal tiền + đánh giá
    if (status === "dang_dung") {
      setServingModal({ booking: b, staff: b.staff || "" });
      return;
    }
    if (status === "da_dung") {
      setCompleteModal({ booking: b, staff: b.staff || "", rating: 5, comment: "" });
      return;
    }
    setSavingId(b.id);
    setItems((arr) => arr.map((x) => (x.id === b.id ? { ...x, status } : x)));
    try {
      await updateBooking(b.id, { status });
    } catch {
      alert("Cập nhật trạng thái thất bại.");
      load();
    } finally {
      setSavingId("");
    }
  };

  // Xác nhận bắt đầu phục vụ + gán KTV
  const confirmServing = async (e) => {
    e.preventDefault();
    const b = servingModal.booking;
    const staff = servingModal.staff || "";
    setSavingId(b.id);
    try {
      const updated = await updateBooking(b.id, { status: "dang_dung", staff });
      setItems((arr) => arr.map((x) => (x.id === b.id ? { ...x, ...updated } : x)));
      setServingModal(null);
    } catch {
      alert("Cập nhật thất bại."); load();
    } finally { setSavingId(""); }
  };

  // Xác nhận hoàn tất: lưu tiền + KTV, kèm đánh giá (nếu có)
  const confirmDone = async (e) => {
    e.preventDefault();
    const cm = completeModal;
    const b = cm.booking;
    setCmBusy(true);
    try {
      const updated = await updateBooking(b.id, { status: "da_dung", staff: cm.staff || "" });
      await createBookingReview(b.id, { rating: cm.rating, comment: cm.comment });
      setItems((arr) => arr.map((x) => (x.id === b.id ? { ...x, ...updated } : x)));
      setCompleteModal(null);
    } catch {
      alert("Cập nhật thất bại."); load();
    } finally { setCmBusy(false); }
  };

  const remove = async (b) => {
    if (!window.confirm(`Xoá lịch của "${b.name}"?`)) return;
    try { await deleteItem("booking", b.id); setItems((a) => a.filter((x) => x.id !== b.id)); }
    catch { alert("Xoá thất bại."); }
  };

  const counts = useMemo(() => {
    const c = { all: items.length, moi: 0, dang_dung: 0, da_dung: 0, doi_dv: 0, huy: 0 };
    items.forEach((b) => { c[b.status || "moi"] = (c[b.status || "moi"] || 0) + 1; });
    c.active = c.moi + c.dang_dung; // "Tất cả" = đang chờ + đang phục vụ
    return c;
  }, [items]);

  /* ===== Dữ liệu cho chế độ Lịch ===== */
  // Gom lịch theo ngày "YYYY-MM-DD" (chỉ lịch khớp tìm kiếm & lọc trạng thái)
  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach((b) => {
      const k = dateKey(b.date);
      if (!k) return;
      (map[k] = map[k] || []).push(b);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (timeOf(a.date) || "99:99").localeCompare(timeOf(b.date) || "99:99"))
    );
    return map;
  }, [filtered]);

  // Lịch chưa chọn ngày (không hiện được trên lưới)
  const noDate = useMemo(() => filtered.filter((b) => !dateKey(b.date)), [filtered]);

  // Các ô của lưới tháng (null = ô trống đầu/cuối), tuần bắt đầu từ Thứ 2
  const cells = useMemo(() => {
    const first = new Date(cal.y, cal.m, 1);
    const startDow = (first.getDay() + 6) % 7; // CN=0 -> 6, T2=1 -> 0
    const daysInMonth = new Date(cal.y, cal.m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cal]);

  // Tổng số lịch trong tháng đang xem
  const monthCount = useMemo(() => {
    const prefix = `${cal.y}-${String(cal.m + 1).padStart(2, "0")}`;
    return filtered.reduce((n, b) => (dateKey(b.date).startsWith(prefix) ? n + 1 : n), 0);
  }, [filtered, cal]);

  const todayKey = (() => {
    const n = new Date();
    return ymd(n.getFullYear(), n.getMonth(), n.getDate());
  })();

  const shiftMonth = (delta) =>
    setCal((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const goToday = () => {
    const n = new Date();
    setCal({ y: n.getFullYear(), m: n.getMonth() });
  };
  const onMonthPick = (e) => {
    const [yy, mm] = (e.target.value || "").split("-").map(Number);
    if (yy && mm) setCal({ y: yy, m: mm - 1 });
  };

  // Danh sách lịch của ngày đang mở popup (đã sắp theo giờ)
  const dayItems = dayView ? (byDay[dayView] || []) : [];

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Đặt lịch {!loading && <span className="tag-pill">{filtered.length}/{items.length}</span>}</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="basis-switch">
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
              ☰ Danh sách
            </button>
            <button className={view === "calendar" ? "on" : ""} onClick={() => setView("calendar")}>
              📅 Lịch
            </button>
          </div>
          <button className="btn-add" onClick={openNew}>+ Tạo lịch</button>
          <button className="btn-add" onClick={load}>⟳ Tải lại</button>
        </div>
      </div>

      {/* Thanh tab theo luồng phục vụ */}
      <div className="bk-stage-tabs">
        {BK_TABS.map((t) => (
          <button key={t.key} className={"bk-stage " + t.cls + (statusFilter === t.key ? " on" : "")}
            onClick={() => setStatusFilter(t.key)}>
            <span className="bk-stage-ico">{t.ico}</span>
            <span className="bk-stage-lbl">{t.label}</span>
            <span className="bk-stage-n">{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="bk-tools">
        <input
          className="bk-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Tìm theo tên, SĐT, ngày hẹn, dịch vụ..."
        />
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      {view === "list" && (
      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">{q ? "Không tìm thấy lịch phù hợp." : "Không có lịch nào trong mục này."}</div>
        ) : (
          <table className="admin-table bk-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Điện thoại</th>
                <th>Dịch vụ</th>
                <th>Cơ sở</th>
                <th>Ngày & giờ hẹn</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Gửi lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const appt = fmtAppt(b.date);
                const st = b.status || "moi";
                return (
                  <tr key={b.id}>
                    <td><b>{b.name}</b></td>
                    <td>
                      <div className="bk-phone">
                        <span>{b.phone}</span>
                        <button className="ic-btn" title="Copy số" onClick={() => copyPhone(b.phone)}>
                          {copied === b.phone ? "✓" : "📋"}
                        </button>
                        <a
                          className="ic-btn zalo"
                          title="Nhắn Zalo"
                          href={`https://zalo.me/${onlyDigits(b.phone)}`}
                          target="_blank" rel="noreferrer"
                        >Zalo</a>
                      </div>
                    </td>
                    <td>
                      {b.service || "—"}
                      {b.staff && <div className="bk-staff">🧑‍🔧 {b.staff}</div>}
                    </td>
                    <td>{b.branch || "—"}</td>
                    <td>
                      {appt ? (
                        <span className={"appt " + (appt.flag || "")}>
                          {appt.flag === "today" && "🔔 "}
                          {appt.text}
                        </span>
                      ) : <span className="appt none">Chưa chọn</span>}
                    </td>
                    <td className="bk-note">{b.note || "—"}</td>
                    <td>
                      <select
                        className={"st-select " + STATUS[st].cls}
                        value={st}
                        disabled={savingId === b.id}
                        onChange={(e) => changeStatus(b, e.target.value)}
                      >
                        {(ALLOWED_NEXT[st] || STATUS_KEYS).map((k) => (
                          <option key={k} value={k}>{STATUS[k].label}</option>
                        ))}
                      </select>
                      {st === "dang_dung" && b.startedAt && (
                        <div className="bk-dur serving">⏱️ Đang làm ~{fmtDur(b.startedAt)}</div>
                      )}
                      {st === "da_dung" && b.startedAt && b.completedAt && (
                        <div className="bk-dur">⏱️ Làm {fmtDur(b.startedAt, b.completedAt)}</div>
                      )}
                      {st === "da_dung" && b.amount > 0 && (
                        <div className="bk-amount">💰 {Number(b.amount).toLocaleString("vi-VN")}đ</div>
                      )}
                    </td>
                    <td className="bk-sent">{fmtSent(b.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-mini btn-edit" onClick={() => openEdit(b)}>Sửa</button>
                        <button className="btn-mini btn-del" onClick={() => remove(b)}>Xoá</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      )}

      {view === "calendar" && (
        <div className="cal-wrap">
          <div className="cal-head">
            <div className="cal-nav">
              <button title="Tháng trước" onClick={() => shiftMonth(-1)}>‹</button>
              <span className="cal-title">{MONTHS_VI[cal.m]} / {cal.y}</span>
              <button title="Tháng sau" onClick={() => shiftMonth(1)}>›</button>
            </div>
            <button className="cal-today-btn" onClick={goToday}>Hôm nay</button>
            <input
              type="month"
              value={`${cal.y}-${String(cal.m + 1).padStart(2, "0")}`}
              onChange={onMonthPick}
            />
            <span className="cal-spacer" />
            <span className="cal-count">{monthCount} lịch trong tháng</span>
          </div>

          <div className="appt-legend">
            {STATUS_KEYS.map((k) => (
              <span key={k} className="lg-item">
                <i className={"lg-dot " + STATUS[k].cls} /> {STATUS[k].label}
              </span>
            ))}
          </div>

          <div className="cal-grid">
            {DOW.map((d, i) => (
              <div key={d} className={"cal-dow" + (i >= 5 ? " we" : "")}>{d}</div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={"b" + i} className="cal-cell blank" />;
              const key = ymd(cal.y, cal.m, d);
              const list = byDay[key] || [];
              const isToday = key === todayKey;
              const shown = list.slice(0, 3);
              const extra = list.length - shown.length;
              return (
                <div key={key} className={"cal-cell" + (isToday ? " today" : "")}>
                  <span className="cal-daynum">{d}</span>
                  {shown.map((b) => {
                    const tm = timeOf(b.date);
                    const st = b.status || "moi";
                    return (
                      <button
                        key={b.id}
                        className={"cal-chip " + STATUS[st].cls}
                        onClick={() => openEdit(b)}
                        title={`${tm ? tm + " — " : ""}${b.name}${b.service ? " — " + b.service : ""}`}
                      >
                        <span className="cn">{tm && <b>{tm} </b>}{b.name}</span>
                        {b.service && <span className="cs">{b.service}</span>}
                      </button>
                    );
                  })}
                  {extra > 0 && (
                    <button className="cal-more" onClick={() => setDayView(key)}>+{extra} khách nữa…</button>
                  )}
                </div>
              );
            })}
          </div>

          {noDate.length > 0 && (
            <div className="cal-nodate">
              <h4>⚠️ {noDate.length} lịch chưa chọn ngày (không hiện trên lịch)</h4>
              <div className="cal-nodate-chips">
                {noDate.map((b) => (
                  <button
                    key={b.id}
                    className={"cal-chip " + STATUS[(b.status || "moi")].cls}
                    onClick={() => openEdit(b)}
                    title="Bấm để thêm ngày hẹn"
                  >
                    <span className="cn">{b.name}</span>
                    {b.service && <span className="cs">{b.service}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popup chi tiết 1 ngày */}
      {dayView && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDayView("")}>
          <div className="modal">
            <div className="modal-head">
              <h3>📅 Lịch ngày {dayView.split("-").reverse().join("/")} ({dayItems.length})</h3>
              <button type="button" onClick={() => setDayView("")}>×</button>
            </div>
            <div className="modal-body">
              {dayItems.length === 0 ? (
                <div className="admin-empty">Không có lịch.</div>
              ) : (
                <div className="day-list">
                  {dayItems.map((b) => {
                    const tm = timeOf(b.date);
                    const st = b.status || "moi";
                    return (
                      <div key={b.id} className="day-row">
                        <span className="day-time">{tm || "—"}</span>
                        <div className="day-info">
                          <b>{b.name}</b> <span className="day-phone">{b.phone}</span>
                          <div className="day-svc">{b.service || "—"}{b.branch ? ` · ${b.branch}` : ""}</div>
                          {b.note && <div className="day-note">📝 {b.note}</div>}
                        </div>
                        <span className={"st-pill " + STATUS[st].cls}>{STATUS[st].label}</span>
                        <button className="btn-mini btn-edit" onClick={() => { setDayView(""); openEdit(b); }}>Sửa</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setDayView("")}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal bắt đầu phục vụ - gán KTV */}
      {servingModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setServingModal(null)}>
          <form className="modal" style={{ maxWidth: 420 }} onSubmit={confirmServing}>
            <div className="modal-head">
              <h3>💆 Bắt đầu phục vụ</h3>
              <button type="button" onClick={() => setServingModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, color: "#555" }}>
                Khách <b>{servingModal.booking.name}</b> — {servingModal.booking.service || "—"}
              </p>
              <div className="fld">
                <label>Nhân viên / KTV phụ trách</label>
                <select value={servingModal.staff} autoFocus
                  onChange={(e) => setServingModal({ ...servingModal, staff: e.target.value })}>
                  <option value="">-- Chọn KTV --</option>
                  {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}{s.role ? ` (${s.role})` : ""}</option>)}
                  {servingModal.staff && !staffList.some((s) => s.name === servingModal.staff) && <option value={servingModal.staff}>{servingModal.staff}</option>}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setServingModal(null)}>Huỷ</button>
              <button type="submit" className="btn-save" disabled={savingId === servingModal.booking.id}>
                {savingId === servingModal.booking.id ? "..." : "Bắt đầu phục vụ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal hoàn tất: tiền + KTV + đánh giá 5 sao */}
      {completeModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCompleteModal(null)}>
          <form className="modal" style={{ maxWidth: 440 }} onSubmit={confirmDone}>
            <div className="modal-head">
              <h3>✅ Hoàn tất dịch vụ</h3>
              <button type="button" onClick={() => setCompleteModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, color: "#555" }}>
                Khách <b>{completeModal.booking.name}</b> — {completeModal.booking.service || "—"}
              </p>
              <div className="fld">
                <label>Nhân viên / KTV phụ trách</label>
                <select value={completeModal.staff}
                  onChange={(e) => setCompleteModal({ ...completeModal, staff: e.target.value })}>
                  <option value="">-- Chọn KTV --</option>
                  {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}{s.role ? ` (${s.role})` : ""}</option>)}
                  {completeModal.staff && !staffList.some((s) => s.name === completeModal.staff) && <option value={completeModal.staff}>{completeModal.staff}</option>}
                </select>
              </div>
              <div className="cm-review">
                <label className="cm-review-toggle">⭐ Đánh giá của khách</label>
                <div className="cm-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={"cm-star" + (completeModal.rating >= s ? " on" : "")}
                      onClick={() => setCompleteModal({ ...completeModal, rating: s })}>★</span>
                  ))}
                </div>
                <textarea rows={5} value={completeModal.comment}
                  onChange={(e) => setCompleteModal({ ...completeModal, comment: e.target.value })}
                  placeholder="Nhận xét của khách (có thể bỏ trống)..." />
                <small style={{ color: "#8a8f88" }}>Đánh giá ≥ 4 sao sẽ tự hiển thị lên website.</small>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setCompleteModal(null)}>Huỷ</button>
              <button type="submit" className="btn-save" disabled={cmBusy}>
                {cmBusy ? "Đang lưu..." : "Xác nhận hoàn tất"}
              </button>
            </div>
          </form>
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <form className="modal" onSubmit={saveEdit}>
            <div className="modal-head">
              <h3>{edit.id ? "✏️ Sửa lịch hẹn" : "➕ Tạo lịch mới"}</h3>
              <button type="button" onClick={() => setEdit(null)}>×</button>
            </div>
            <div className="modal-body">
              {emsg && <div className="admin-msg err">{emsg}</div>}
              <div className="fld">
                <label>Họ tên *</label>
                <input value={ef.name}
                  onChange={(e) => { setEf({ ...ef, name: e.target.value }); setShowCust(true); }} required />
              </div>
              {!edit.id && showCust && custSuggest.length > 0 && (
                <div className="cust-suggest">
                  <div className="cust-suggest-head">👤 Khách đã có — bấm để điền nhanh:</div>
                  {custSuggest.map((c) => (
                    <button type="button" key={c.id} className="cust-suggest-item" onClick={() => pickCust(c)}>
                      <b>{c.name || "—"}</b>
                      <span className="cs-phone">{c.phone || "—"}</span>
                      {c.tierLabel && <span className="cs-tier">{c.tierLabel}</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="fld">
                <label>Số điện thoại *</label>
                <input value={ef.phone}
                  onChange={(e) => { setEf({ ...ef, phone: e.target.value }); setShowCust(true); }} required />
              </div>
              <div className="fld">
                <label>Combo / Dịch vụ *</label>
                <select value={ef.service} onChange={(e) => setEf({ ...ef, service: e.target.value })} required>
                  <option value="">-- Chọn combo / dịch vụ --</option>
                  {opts.map((n) => <option key={n} value={n}>{n}</option>)}
                  {ef.service && !opts.includes(ef.service) && <option value={ef.service}>{ef.service}</option>}
                </select>
              </div>
              <div className="fld">
                <label>Cơ sở</label>
                <select value={ef.branch} onChange={(e) => setEf({ ...ef, branch: e.target.value })}>
                  <option value="">-- Chọn cơ sở --</option>
                  {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                  {ef.branch && !branches.includes(ef.branch) && <option value={ef.branch}>{ef.branch}</option>}
                </select>
              </div>
              <div className="fld">
                <label>Nhân viên / KTV phụ trách</label>
                <select value={ef.staff} onChange={(e) => setEf({ ...ef, staff: e.target.value })}>
                  <option value="">-- Chưa gán --</option>
                  {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}{s.role ? ` (${s.role})` : ""}</option>)}
                  {ef.staff && !staffList.some((s) => s.name === ef.staff) && <option value={ef.staff}>{ef.staff}</option>}
                </select>
              </div>
              <div className="fld">
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontWeight: 600 }}>
                  <input type="checkbox" checked={ef.now} onChange={(e) => setEf({ ...ef, now: e.target.checked })} />
                  ⏱️ Ngay bây giờ (lấy thời gian hiện tại)
                </label>
              </div>
              {!ef.now && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div className="fld" style={{ flex: 1 }}>
                    <label>Ngày hẹn</label>
                    <input type="date" value={ef.date} onChange={(e) => setEf({ ...ef, date: e.target.value })} />
                  </div>
                  <div className="fld" style={{ flex: 1 }}>
                    <label>Giờ hẹn</label>
                    <input type="time" value={ef.time} onChange={(e) => setEf({ ...ef, time: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="fld">
                <label>Ghi chú</label>
                <textarea rows={2} value={ef.note} onChange={(e) => setEf({ ...ef, note: e.target.value })} />
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setEdit(null)}>Huỷ</button>
              <button type="submit" className="btn-save" disabled={esaving}>{esaving ? "Đang lưu..." : "Lưu thay đổi"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
