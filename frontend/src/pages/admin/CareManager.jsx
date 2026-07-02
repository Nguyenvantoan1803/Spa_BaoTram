import { useEffect, useState } from "react";
import {
  getReminders, sendReminder, getSleeping, getBirthdays, sendBirthday,
  getReviewRequests, sendReviewRequest,
  scheduleBirthday, getScheduled, cancelScheduled, getVouchers,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaignNow, previewAudience
} from "../../adminApi";

const onlyDigits = (s) => (s || "").replace(/[^0-9]/g, "");
const fmtMoney = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("vi-VN");
};
const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const zaloLink = (phone) => `https://zalo.me/${onlyDigits(phone)}`;
// Mặc định: ngày sinh nhật (hôm nay + inDays) lúc 09:00, dạng cho input datetime-local
const defaultSendAt = (inDays) => {
  const d = new Date();
  d.setDate(d.getDate() + (Number(inDays) || 0));
  d.setHours(9, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TABS = [
  { key: "reminders", label: "🔔 Nhắc lịch hẹn" },
  { key: "sleeping", label: "💤 Khách lâu chưa quay lại" },
  { key: "birthdays", label: "🎂 Sinh nhật" },
  { key: "campaigns", label: "🎁 Khuyến mãi" },
  { key: "scheduled", label: "📨 Đã hẹn gửi" },
  { key: "reviews", label: "⭐ Xin đánh giá" }
];
const AUDIENCE = {
  all: "Tất cả khách hàng",
  top: "Khách dùng nhiều nhất",
  random: "Khách ngẫu nhiên"
};
const CAMP_STATUS = {
  pending: { label: "Chờ gửi", cls: "tier-moi" },
  sent: { label: "Đã gửi", cls: "tier-vang" },
  failed: { label: "Lỗi", cls: "st-huy" }
};
const CHANNELS = [
  { key: "email", label: "Email" },
  { key: "zalo", label: "Zalo" },
  { key: "sms", label: "SMS" }
];

const SCHED_STATUS = {
  pending: { label: "Chờ gửi", cls: "tier-moi" },
  sent: { label: "Đã gửi", cls: "tier-vang" },
  failed: { label: "Lỗi", cls: "st-huy" },
  canceled: { label: "Đã huỷ", cls: "tier-bac" }
};

export default function CareManager() {
  const [tab, setTab] = useState("reminders");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState({});
  const [days, setDays] = useState({ reminders: 1, sleeping: 30, birthdays: 7 });
  const [vouchers, setVouchers] = useState([]);
  // Modal hẹn gửi sinh nhật: { customer } | null
  const [sched, setSched] = useState(null);
  const [sf, setSf] = useState({ sendAt: "", voucherMode: "create", voucherValue: 20, voucherExpiryDays: 30, voucherCode: "" });
  const [sfBusy, setSfBusy] = useState(false);
  const [sfMsg, setSfMsg] = useState("");
  // Chiến dịch khuyến mãi
  const [camp, setCamp] = useState(null); // modal tạo/sửa phiếu
  const [campEditId, setCampEditId] = useState(null); // id khi sửa
  const [cf, setCf] = useState(null);
  const [cfBusy, setCfBusy] = useState(false);
  const [cfMsg, setCfMsg] = useState("");
  const [preview, setPreview] = useState(null); // { total, withEmail }
  const [recipView, setRecipView] = useState(null); // chiến dịch đang xem danh sách

  const load = () => {
    setLoading(true); setErr("");
    const fetcher =
      tab === "reminders" ? getReminders(days.reminders)
      : tab === "sleeping" ? getSleeping(days.sleeping)
      : tab === "birthdays" ? getBirthdays(days.birthdays)
      : tab === "scheduled" ? getScheduled()
      : tab === "campaigns" ? getCampaigns()
      : getReviewRequests();
    fetcher
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [tab, days]);

  // Tải voucher CÒN DÙNG ĐƯỢC (đang bật, chưa hết hạn, chưa hết lượt) để chọn
  useEffect(() => {
    const usable = (v) => {
      if (v.active === false) return false;
      if (v.expiry && new Date(v.expiry) < new Date(new Date().toDateString())) return false;
      if (v.usageLimit && (v.usedCount || 0) >= v.usageLimit) return false;
      return true;
    };
    getVouchers().then((d) => setVouchers(Array.isArray(d) ? d.filter(usable) : [])).catch(() => {});
  }, []);

  const doSendReminder = async (b) => {
    setBusy(b.id);
    try {
      const r = await sendReminder(b.id);
      setDone((d) => ({ ...d, [b.id]: r.emailSent ? "✓ Đã gửi email" : "✓ Đã đánh dấu (khách chưa có email)" }));
    } catch { setDone((d) => ({ ...d, [b.id]: "✗ Lỗi gửi" })); }
    finally { setBusy(""); }
  };

  const doSendReview = async (b) => {
    setBusy(b.id);
    try {
      const r = await sendReviewRequest(b.id);
      setDone((d) => ({ ...d, [b.id]: r.emailSent ? "✓ Đã gửi email mời đánh giá" : "✓ Đã đánh dấu (dùng nút Zalo)" }));
    } catch { setDone((d) => ({ ...d, [b.id]: "✗ Lỗi gửi" })); }
    finally { setBusy(""); }
  };
  const reviewMsg = (b) => encodeURIComponent(`Bảo Trâm Spa cảm ơn bạn! Mời bạn đánh giá dịch vụ tại: ${b.link}`);

  // Mở modal hẹn gửi cho 1 khách sinh nhật
  const openSchedule = (c) => {
    setSf({
      sendAt: defaultSendAt(c.inDays),
      voucherMode: "create", voucherValue: 20, voucherExpiryDays: 30, voucherCode: vouchers[0]?.code || ""
    });
    setSfMsg("");
    setSched(c);
  };

  const buildVoucherBody = () => ({
    voucherMode: sf.voucherMode,
    voucherType: "percent",
    voucherValue: Number(sf.voucherValue) || 20,
    voucherExpiryDays: Number(sf.voucherExpiryDays) || 30,
    voucherCode: sf.voucherCode
  });

  // Lưu lịch hẹn gửi
  const saveSchedule = async (e) => {
    e.preventDefault();
    if (!sf.sendAt) { setSfMsg("Vui lòng chọn thời gian gửi."); return; }
    if (sf.voucherMode === "existing" && !sf.voucherCode) { setSfMsg("Vui lòng chọn voucher có sẵn."); return; }
    setSfBusy(true); setSfMsg("");
    try {
      await scheduleBirthday(sched.id, { sendAt: new Date(sf.sendAt).toISOString(), ...buildVoucherBody() });
      setSched(null);
      if (tab === "scheduled") load();
      else setDone((d) => ({ ...d, [sched.id]: "✓ Đã hẹn gửi lúc " + fmtDateTime(sf.sendAt) }));
    } catch (e2) {
      setSfMsg(e2?.response?.data?.error || "Lưu lịch thất bại.");
    } finally { setSfBusy(false); }
  };

  // Gửi ngay (không chờ lịch)
  const sendNow = async () => {
    if (sf.voucherMode === "existing" && !sf.voucherCode) { setSfMsg("Vui lòng chọn voucher có sẵn."); return; }
    setSfBusy(true); setSfMsg("");
    try {
      const body = sf.voucherMode === "create"
        ? { createVoucher: true, type: "percent", value: Number(sf.voucherValue) || 20, expiryDays: Number(sf.voucherExpiryDays) || 30 }
        : sf.voucherMode === "existing"
        ? { voucherCode: sf.voucherCode, voucherDesc: (vouchers.find((v) => v.code === sf.voucherCode)?.description) || "" }
        : {};
      const r = await sendBirthday(sched.id, body);
      const codeNote = r.voucherCode ? ` · mã 🎟️ ${r.voucherCode}` : "";
      setDone((d) => ({ ...d, [sched.id]: (r.emailSent ? "✓ Đã gửi email chúc mừng" : "✓ Đã tạo (gửi mã qua Zalo)") + codeNote }));
      setSched(null);
    } catch (e2) {
      setSfMsg(e2?.response?.data?.error || "Gửi thất bại.");
    } finally { setSfBusy(false); }
  };

  const doCancel = async (s) => {
    if (!window.confirm("Huỷ lịch gửi này?")) return;
    try { await cancelScheduled(s.id); setData((a) => a.filter((x) => x.id !== s.id)); }
    catch { alert("Huỷ thất bại."); }
  };

  /* ----- Chiến dịch khuyến mãi ----- */
  const refreshPreview = (audience, count) => {
    previewAudience(audience, count).then(setPreview).catch(() => setPreview(null));
  };
  const openCampaign = () => {
    const init = {
      name: "", message: "", channels: ["email"], sendAt: defaultSendAt(0),
      voucherMode: "create", voucherCode: "",
      voucherType: "percent", voucherValue: 20, voucherExpiryDays: 30, audience: "all", count: 0
    };
    setCampEditId(null); setCf(init); setCfMsg(""); setCamp(true);
    refreshPreview(init.audience, init.count);
  };
  const openEditCampaign = (c) => {
    const d = new Date(c.sendAt);
    const p = (n) => String(n).padStart(2, "0");
    const local = isNaN(d.getTime()) ? defaultSendAt(0)
      : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    setCampEditId(c.id);
    setCf({
      name: c.name || "", message: c.message || "", channels: c.channels?.length ? c.channels : ["email"],
      sendAt: local, voucherMode: c.voucherMode || "create", voucherCode: c.voucherCode || "",
      voucherType: c.voucherType || "percent", voucherValue: c.voucherValue || 20,
      voucherExpiryDays: c.voucherExpiryDays || 30, audience: c.audience || "all", count: c.count || 0
    });
    setCfMsg(""); setCamp(true);
    refreshPreview(c.audience || "all", c.count || 0);
  };
  const toggleChannel = (key) => setCf((f) => {
    const has = f.channels.includes(key);
    return { ...f, channels: has ? f.channels.filter((c) => c !== key) : [...f.channels, key] };
  });
  const setAudience = (audience) => {
    const count = audience === "all" ? 0 : (cf.count || 10);
    setCf((f) => ({ ...f, audience, count }));
    refreshPreview(audience, count);
  };
  const setCount = (count) => { setCf((f) => ({ ...f, count })); refreshPreview(cf.audience, count); };

  const saveCampaign = async (e) => {
    e.preventDefault();
    if (!cf.name.trim()) { setCfMsg("Nhập tên chương trình khuyến mãi."); return; }
    if (!cf.sendAt) { setCfMsg("Chọn thời gian gửi."); return; }
    if (!cf.channels.length) { setCfMsg("Chọn ít nhất 1 kênh gửi."); return; }
    if (cf.voucherMode === "existing" && !cf.voucherCode) { setCfMsg("Chọn mã khuyến mãi có sẵn."); return; }
    setCfBusy(true); setCfMsg("");
    const body = {
      name: cf.name.trim(), message: cf.message, channels: cf.channels,
      sendAt: new Date(cf.sendAt).toISOString(),
      voucherMode: cf.voucherMode, voucherCode: cf.voucherCode,
      voucherType: cf.voucherType, voucherValue: Number(cf.voucherValue) || 10,
      voucherExpiryDays: Number(cf.voucherExpiryDays) || 30,
      audience: cf.audience, count: Number(cf.count) || 0
    };
    try {
      if (campEditId) await updateCampaign(campEditId, body);
      else await createCampaign(body);
      setCamp(null);
      if (tab === "campaigns") load(); else setTab("campaigns");
    } catch (e2) { setCfMsg(e2?.response?.data?.error || "Lưu thất bại."); }
    finally { setCfBusy(false); }
  };

  const doSendCampNow = async (c) => {
    if (!window.confirm(`Gửi ngay chương trình "${c.name}"?`)) return;
    setBusy(c.id);
    try { await sendCampaignNow(c.id); load(); }
    catch (e2) { alert(e2?.response?.data?.error || "Gửi thất bại."); }
    finally { setBusy(""); }
  };
  const delCampaign = async (c) => {
    if (!window.confirm(`Xoá chương trình "${c.name}"?`)) return;
    try { await deleteCampaign(c.id); setData((a) => a.filter((x) => x.id !== c.id)); }
    catch { alert("Xoá thất bại."); }
  };

  const daysOptions = {
    reminders: [{ v: 1, t: "Hôm nay & mai" }, { v: 3, t: "3 ngày tới" }, { v: 7, t: "7 ngày tới" }],
    sleeping: [{ v: 30, t: "> 30 ngày" }, { v: 60, t: "> 60 ngày" }, { v: 90, t: "> 90 ngày" }],
    birthdays: [{ v: 2, t: "2 ngày tới" }, { v: 7, t: "7 ngày tới" }, { v: 30, t: "30 ngày tới" }]
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Chăm sóc khách hàng {!loading && <span className="tag-pill">{data.length}</span>}</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {tab === "campaigns" && (
            <button className="btn-add" onClick={openCampaign}>+ Tạo phiếu khuyến mãi</button>
          )}
          <button className="btn-add" onClick={load}>⟳ Tải lại</button>
        </div>
      </div>

      <div className="care-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bk-tools" style={{ alignItems: "center" }}>
        {daysOptions[tab] && (
          <div className="care-dayfilter">
            <span>Lọc:</span>
            {daysOptions[tab].map((o) => (
              <button
                key={o.v}
                className={days[tab] === o.v ? "on" : ""}
                onClick={() => setDays((d) => ({ ...d, [tab]: o.v }))}
              >{o.t}</button>
            ))}
          </div>
        )}
        {tab === "birthdays" && (
          <span style={{ fontSize: 13, color: "#6b736b" }}>
            Bấm <b>⏰ Hẹn gửi</b> để đặt giờ & chọn voucher — tới giờ hệ thống tự gửi.
          </span>
        )}
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="admin-empty">
            {tab === "reminders" ? "Không có lịch hẹn nào cần nhắc."
              : tab === "sleeping" ? "Không có khách nào lâu chưa quay lại."
              : tab === "birthdays" ? "Không có sinh nhật nào trong khoảng này."
              : tab === "scheduled" ? "Chưa có lịch gửi nào được hẹn."
              : tab === "campaigns" ? "Chưa có chương trình khuyến mãi nào. Bấm “Tạo phiếu khuyến mãi”."
              : "Chưa có lịch hoàn tất nào cần xin đánh giá."}
          </div>
        ) : tab === "reminders" ? (
          <table className="admin-table">
            <thead>
              <tr><th>Khách</th><th>Điện thoại</th><th>Dịch vụ</th><th>Hẹn lúc</th><th>Cơ sở</th><th>Email</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id}>
                  <td><b>{b.name}</b></td>
                  <td>{b.phone}</td>
                  <td>{b.service || "—"}</td>
                  <td><span className="appt today">{b.date || "—"}</span></td>
                  <td>{b.branch || "—"}</td>
                  <td>{b.email ? "✅" : "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-mini btn-book" disabled={busy === b.id} onClick={() => doSendReminder(b)}>
                        {busy === b.id ? "..." : "📧 Gửi nhắc"}
                      </button>
                      <a className="btn-mini btn-edit" href={zaloLink(b.phone)} target="_blank" rel="noreferrer">Zalo</a>
                      {done[b.id] && <span className="care-done">{done[b.id]}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "sleeping" ? (
          <table className="admin-table">
            <thead>
              <tr><th>Khách</th><th>Điện thoại</th><th>Hạng</th><th>Lượt đến</th><th>Tổng chi tiêu</th><th>Lần gần nhất</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name || "—"}</b></td>
                  <td>{c.phone || "—"}</td>
                  <td><span className="tier-badge tier-moi">{c.tierLabel || "Thành viên"}</span></td>
                  <td style={{ textAlign: "center" }}>{c.visits || 0}</td>
                  <td>{fmtMoney(c.totalSpent)}</td>
                  <td>{fmtDate(c.lastVisitAt)}</td>
                  <td>
                    <div className="row-actions">
                      <a className="btn-mini btn-book" href={zaloLink(c.phone)} target="_blank" rel="noreferrer">💬 Nhắn Zalo kéo về</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "birthdays" ? (
          <table className="admin-table">
            <thead>
              <tr><th>Khách</th><th>Điện thoại</th><th>Ngày sinh</th><th>Còn</th><th>Email</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name || "—"}</b></td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.birthday || "—"}</td>
                  <td>{c.inDays === 0 ? <b style={{ color: "#c0392b" }}>🎉 Hôm nay</b> : `${c.inDays} ngày`}</td>
                  <td>{c.email ? "✅" : "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-mini btn-book" onClick={() => openSchedule(c)}>⏰ Hẹn gửi</button>
                      <a className="btn-mini btn-edit" href={zaloLink(c.phone)} target="_blank" rel="noreferrer">Zalo</a>
                      {done[c.id] && <span className="care-done">{done[c.id]}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "scheduled" ? (
          <table className="admin-table">
            <thead>
              <tr><th>Khách</th><th>Điện thoại</th><th>Gửi lúc</th><th>Voucher</th><th>Email</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {data.map((s) => {
                const st = SCHED_STATUS[s.status] || SCHED_STATUS.pending;
                const vText = s.voucherMode === "create" ? `Tạo giảm ${s.voucherValue}% (HSD ${s.voucherExpiryDays}n)`
                  : s.voucherMode === "existing" ? `Mã ${s.voucherCode || "—"}`
                  : "Không kèm";
                return (
                  <tr key={s.id}>
                    <td><b>{s.name || "—"}</b></td>
                    <td>{s.phone || "—"}</td>
                    <td>{fmtDateTime(s.sendAt)}</td>
                    <td>{s.status === "sent" && s.voucherCode ? <b className="vc-code">{s.voucherCode}</b> : vText}</td>
                    <td>{s.email ? "✅" : "—"}</td>
                    <td><span className={"st-pill " + st.cls}>{st.label}</span></td>
                    <td>
                      <div className="row-actions">
                        {s.status === "pending"
                          ? <button className="btn-mini btn-del" onClick={() => doCancel(s)}>Huỷ</button>
                          : <span style={{ color: "#8a8f88", fontSize: 12 }}>{s.sentAt ? fmtDateTime(s.sentAt) : "—"}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : tab === "campaigns" ? (
          <table className="admin-table">
            <thead>
              <tr><th>Chương trình</th><th>Gửi lúc</th><th>Kênh</th><th>Đối tượng</th><th>Ưu đãi</th><th>Mã</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {data.map((c) => {
                const st = CAMP_STATUS[c.status] || CAMP_STATUS.pending;
                const offer = c.voucherType === "amount" ? `Giảm ${fmtMoney(c.voucherValue)}` : `Giảm ${c.voucherValue}%`;
                return (
                  <tr key={c.id}>
                    <td><b>{c.name}</b>{c.message ? <div className="bk-note">{c.message}</div> : null}</td>
                    <td>{fmtDateTime(c.sendAt)}</td>
                    <td>{(c.channels || []).join(", ")}</td>
                    <td>{AUDIENCE[c.audience] || c.audience}{c.count ? ` (${c.count})` : ""}</td>
                    <td>{offer} · HSD {c.voucherExpiryDays}n</td>
                    <td>{c.voucherCode ? <b className="vc-code">{c.voucherCode}</b> : "—"}</td>
                    <td>
                      <span className={"st-pill " + st.cls}>{st.label}</span>
                      {c.status === "sent" && (
                        <div className="bk-note">{c.recipients?.length || 0} khách · email {c.emailSentCount || 0}</div>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {c.status === "sent" ? (
                          <button className="btn-mini btn-edit" onClick={() => setRecipView(c)}>📋 Xem {c.recipients?.length || 0} khách</button>
                        ) : (
                          <>
                            <button className="btn-mini btn-book" disabled={busy === c.id} onClick={() => doSendCampNow(c)}>{busy === c.id ? "..." : "Gửi ngay"}</button>
                            <button className="btn-mini btn-edit" onClick={() => openEditCampaign(c)}>Sửa</button>
                          </>
                        )}
                        <button className="btn-mini btn-del" onClick={() => delCampaign(c)}>Xoá</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Khách</th><th>Điện thoại</th><th>Dịch vụ</th><th>KTV</th><th>Email</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id}>
                  <td><b>{b.name}</b></td>
                  <td>{b.phone}</td>
                  <td>{b.service || "—"}</td>
                  <td>{b.staff || "—"}</td>
                  <td>{b.email ? "✅" : "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-mini btn-book" disabled={busy === b.id} onClick={() => doSendReview(b)}>
                        {busy === b.id ? "..." : "⭐ Gửi lời mời"}
                      </button>
                      <a className="btn-mini btn-edit" href={`https://zalo.me/${onlyDigits(b.phone)}?text=${reviewMsg(b)}`} target="_blank" rel="noreferrer">Zalo</a>
                      <a className="btn-mini btn-edit" href={b.link} target="_blank" rel="noreferrer">Mở link</a>
                      {done[b.id] && <span className="care-done">{done[b.id]}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal hẹn gửi sinh nhật + chọn voucher */}
      {sched && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSched(null)}>
          <form className="modal" style={{ maxWidth: 460 }} onSubmit={saveSchedule}>
            <div className="modal-head">
              <h3>⏰ Hẹn gửi chúc sinh nhật</h3>
              <button type="button" onClick={() => setSched(null)}>×</button>
            </div>
            <div className="modal-body">
              {sfMsg && <div className="admin-msg err">{sfMsg}</div>}
              <p style={{ marginBottom: 12, color: "#555" }}>
                Khách <b>{sched.name || sched.phone}</b> · sinh nhật {sched.birthday}
                {sched.email ? "" : <span style={{ color: "#c0392b" }}> · chưa có email (gửi mã qua Zalo)</span>}
              </p>
              <div className="fld">
                <label>Thời gian gửi *</label>
                <input type="datetime-local" value={sf.sendAt}
                  onChange={(e) => setSf({ ...sf, sendAt: e.target.value })} required />
              </div>
              <div className="fld">
                <label>Voucher tặng kèm</label>
                <select value={sf.voucherMode} onChange={(e) => setSf({ ...sf, voucherMode: e.target.value })}>
                  <option value="create">Tạo voucher mới (tự sinh mã)</option>
                  <option value="existing">Chọn voucher có sẵn</option>
                  <option value="none">Không kèm voucher</option>
                </select>
              </div>
              {sf.voucherMode === "create" && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div className="fld" style={{ flex: 1 }}>
                    <label>Giảm (%)</label>
                    <input type="number" min="1" max="100" value={sf.voucherValue}
                      onChange={(e) => setSf({ ...sf, voucherValue: e.target.value })} />
                  </div>
                  <div className="fld" style={{ flex: 1 }}>
                    <label>Hạn dùng (ngày)</label>
                    <input type="number" min="1" value={sf.voucherExpiryDays}
                      onChange={(e) => setSf({ ...sf, voucherExpiryDays: e.target.value })} />
                  </div>
                </div>
              )}
              {sf.voucherMode === "existing" && (
                <div className="fld">
                  <label>Chọn voucher</label>
                  <select value={sf.voucherCode} onChange={(e) => setSf({ ...sf, voucherCode: e.target.value })}>
                    <option value="">-- Chọn mã --</option>
                    {vouchers.map((v) => (
                      <option key={v.id} value={v.code}>{v.code} — {v.description || (v.type === "percent" ? `giảm ${v.value}%` : `giảm ${fmtMoney(v.value)}`)}</option>
                    ))}
                  </select>
                  {vouchers.length === 0 && <small style={{ color: "#8a8f88" }}>Chưa có voucher nào. Tạo ở mục Voucher hoặc chọn “Tạo voucher mới”.</small>}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setSched(null)}>Huỷ</button>
              <button type="button" className="btn-edit" style={{ padding: "10px 16px", borderRadius: 8 }} disabled={sfBusy} onClick={sendNow}>
                Gửi ngay
              </button>
              <button type="submit" className="btn-save" disabled={sfBusy}>{sfBusy ? "..." : "Lưu lịch gửi"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal tạo phiếu khuyến mãi */}
      {camp && cf && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCamp(null)}>
          <form className="modal" style={{ maxWidth: 480 }} onSubmit={saveCampaign}>
            <div className="modal-head">
              <h3>🎁 {campEditId ? "Sửa phiếu khuyến mãi" : "Tạo phiếu khuyến mãi"}</h3>
              <button type="button" onClick={() => setCamp(null)}>×</button>
            </div>
            <div className="modal-body">
              {cfMsg && <div className="admin-msg err">{cfMsg}</div>}
              <div className="fld">
                <label>Tên chương trình / dịp *</label>
                <input value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })}
                  placeholder="VD: Mừng 8/3, Sinh nhật Spa..." autoFocus />
              </div>
              <div className="fld">
                <label>Lời nhắn (tuỳ chọn)</label>
                <textarea rows={2} value={cf.message} onChange={(e) => setCf({ ...cf, message: e.target.value })}
                  placeholder="VD: Nhân dịp 8/3, Bảo Trâm Spa gửi tặng bạn ưu đãi đặc biệt!" />
              </div>
              <div className="fld">
                <label>Kênh gửi</label>
                <div style={{ display: "flex", gap: 14 }}>
                  {CHANNELS.map((ch) => (
                    <label key={ch.key} style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                      <input type="checkbox" checked={cf.channels.includes(ch.key)} onChange={() => toggleChannel(ch.key)} />
                      {ch.label}
                    </label>
                  ))}
                </div>
                <small style={{ color: "#8a8f88" }}>Email gửi tự động. Zalo/SMS: hệ thống tạo sẵn danh sách + mã để gửi tay.</small>
              </div>
              <div className="fld">
                <label>Thời gian gửi *</label>
                <input type="datetime-local" value={cf.sendAt} onChange={(e) => setCf({ ...cf, sendAt: e.target.value })} required />
              </div>
              <div className="fld">
                <label>Mã khuyến mãi</label>
                <select value={cf.voucherMode} onChange={(e) => setCf({ ...cf, voucherMode: e.target.value })}>
                  <option value="create">Tạo mã mới cho chương trình</option>
                  <option value="existing">Dùng mã có sẵn</option>
                </select>
              </div>
              {cf.voucherMode === "existing" ? (
                <div className="fld">
                  <label>Chọn mã</label>
                  <select value={cf.voucherCode} onChange={(e) => setCf({ ...cf, voucherCode: e.target.value })}>
                    <option value="">-- Chọn voucher --</option>
                    {vouchers.map((v) => (
                      <option key={v.id} value={v.code}>{v.code} — {v.description || (v.type === "percent" ? `giảm ${v.value}%` : `giảm ${fmtMoney(v.value)}`)}</option>
                    ))}
                  </select>
                  {vouchers.length === 0 && <small style={{ color: "#8a8f88" }}>Chưa có voucher nào. Tạo ở mục Voucher hoặc chọn “Tạo mã mới”.</small>}
                </div>
              ) : (
                <div className="fld">
                  <label>Mức giảm</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" min="1" style={{ flex: 1 }} value={cf.voucherValue}
                      onChange={(e) => setCf({ ...cf, voucherValue: e.target.value })} />
                    <select style={{ width: 90 }} value={cf.voucherType} onChange={(e) => setCf({ ...cf, voucherType: e.target.value })}>
                      <option value="percent">%</option>
                      <option value="amount">đồng</option>
                    </select>
                    <span style={{ color: "#6b736b" }}>· HSD</span>
                    <input type="number" min="1" style={{ width: 80 }} value={cf.voucherExpiryDays}
                      onChange={(e) => setCf({ ...cf, voucherExpiryDays: e.target.value })} />
                    <span style={{ color: "#6b736b" }}>ngày</span>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <div className="fld" style={{ flex: 1 }}>
                  <label>Gửi cho</label>
                  <select value={cf.audience} onChange={(e) => setAudience(e.target.value)}>
                    <option value="all">Tất cả khách hàng</option>
                    <option value="top">Khách dùng nhiều nhất</option>
                    <option value="random">Khách ngẫu nhiên</option>
                  </select>
                </div>
                {cf.audience !== "all" && (
                  <div className="fld" style={{ flex: 1 }}>
                    <label>Số lượng khách</label>
                    <input type="number" min="1" value={cf.count} onChange={(e) => setCount(e.target.value)} />
                  </div>
                )}
              </div>
              {preview && (
                <div className="admin-msg" style={{ background: "#eef4ef", color: "#2b4a39" }}>
                  📋 Sẽ gửi cho <b>{preview.total}</b> khách ({preview.withEmail} khách có email).
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setCamp(null)}>Huỷ</button>
              <button type="submit" className="btn-save" disabled={cfBusy}>{cfBusy ? "..." : "Lưu phiếu (hẹn giờ)"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal xem danh sách khách của 1 chiến dịch */}
      {recipView && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRecipView(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h3>🎁 {recipView.name} — {recipView.recipients?.length || 0} khách</h3>
              <button type="button" onClick={() => setRecipView(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="admin-msg" style={{ background: "#fffaf0", color: "#8a6a00" }}>
                Mã ưu đãi: <b className="vc-code">{recipView.voucherCode}</b> · gửi qua {(recipView.channels || []).join(", ")}.
                {(recipView.channels || []).some((c) => c !== "email") && " Dùng nút Zalo để gửi tay cho khách chưa có email."}
              </div>
              <div className="day-list" style={{ marginTop: 10 }}>
                {(recipView.recipients || []).map((r, i) => (
                  <div key={i} className="day-row">
                    <div className="day-info">
                      <b>{r.name || "—"}</b> <span className="day-phone">{r.phone}</span>
                      <div className="day-svc">{r.email || "không có email"}</div>
                    </div>
                    {r.phone && <a className="btn-mini btn-edit" href={zaloLink(r.phone)} target="_blank" rel="noreferrer">Zalo</a>}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setRecipView(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
