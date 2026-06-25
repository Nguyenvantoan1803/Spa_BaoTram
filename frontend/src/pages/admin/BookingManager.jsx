import { useEffect, useMemo, useState } from "react";
import { getBookings, updateBooking, deleteItem } from "../../adminApi";
import { getCombos, getServices, getInfo } from "../../api";
import { buildServiceOptions } from "../../servicesData";

/* Cấu hình trạng thái xử lý lịch hẹn */
const STATUS = {
  moi: { label: "Mới", cls: "st-moi" },
  da_dung: { label: "Đã dùng DV", cls: "st-dung" },
  doi_dv: { label: "Đổi DV (khách)", cls: "st-doi" },
  huy: { label: "Đã huỷ", cls: "st-huy" }
};
const STATUS_KEYS = ["moi", "da_dung", "doi_dv", "huy"];

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

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

export default function BookingManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState("");
  const [savingId, setSavingId] = useState("");
  // Sửa lịch hẹn
  const [opts, setOpts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [edit, setEdit] = useState(null);
  const [ef, setEf] = useState({ name: "", phone: "", service: "", branch: "", date: "", time: "", note: "" });
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
  }, []);

  const openEdit = (b) => {
    let date = "", time = "";
    if (b.date && /^\d{4}-\d{2}-\d{2}/.test(b.date)) {
      const [dd, tt] = b.date.split("T");
      date = dd; time = tt ? tt.slice(0, 5) : "";
    }
    setEf({
      name: b.name || "", phone: b.phone || "", service: b.service || "",
      branch: b.branch || "", date, time,
      note: b.note || ""
    });
    setEmsg(null);
    setEdit(b);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!ef.name.trim() || !ef.phone.trim() || !ef.service) {
      setEmsg("Vui lòng nhập tên, SĐT và chọn dịch vụ.");
      return;
    }
    setEsaving(true); setEmsg(null);
    const dateVal = ef.date ? (ef.time ? `${ef.date}T${ef.time}` : ef.date) : "";
    try {
      const updated = await updateBooking(edit.id, {
        name: ef.name.trim(), phone: ef.phone.trim(), service: ef.service,
        branch: ef.branch || "", date: dateVal, note: ef.note || ""
      });
      setItems((arr) => arr.map((x) => (x.id === edit.id ? { ...x, ...updated } : x)));
      setEdit(null);
    } catch {
      setEmsg("Lưu thất bại, thử lại nhé.");
    } finally { setEsaving(false); }
  };

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return items.filter((b) => {
      if (statusFilter !== "all" && (b.status || "moi") !== statusFilter) return false;
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
    setSavingId(b.id);
    // cập nhật lạc quan
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

  const remove = async (b) => {
    if (!window.confirm(`Xoá lịch của "${b.name}"?`)) return;
    try { await deleteItem("booking", b.id); setItems((a) => a.filter((x) => x.id !== b.id)); }
    catch { alert("Xoá thất bại."); }
  };

  const counts = useMemo(() => {
    const c = { all: items.length, moi: 0, da_dung: 0, doi_dv: 0, huy: 0 };
    items.forEach((b) => { c[b.status || "moi"] = (c[b.status || "moi"] || 0) + 1; });
    return c;
  }, [items]);

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Đặt lịch {!loading && <span className="tag-pill">{filtered.length}/{items.length}</span>}</h2>
        <button className="btn-add" onClick={load}>⟳ Tải lại</button>
      </div>

      <div className="bk-tools">
        <input
          className="bk-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Tìm theo tên, SĐT, ngày hẹn, dịch vụ..."
        />
        <div className="bk-filters">
          <button className={statusFilter === "all" ? "on" : ""} onClick={() => setStatusFilter("all")}>
            Tất cả ({counts.all})
          </button>
          {STATUS_KEYS.map((k) => (
            <button key={k} className={statusFilter === k ? "on" : ""} onClick={() => setStatusFilter(k)}>
              {STATUS[k].label} ({counts[k] || 0})
            </button>
          ))}
        </div>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">{q || statusFilter !== "all" ? "Không tìm thấy lịch phù hợp." : "Chưa có lượt đặt lịch nào."}</div>
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
                    <td>{b.service || "—"}</td>
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
                        {STATUS_KEYS.map((k) => (
                          <option key={k} value={k}>{STATUS[k].label}</option>
                        ))}
                      </select>
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

      {edit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <form className="modal" onSubmit={saveEdit}>
            <div className="modal-head">
              <h3>✏️ Sửa lịch hẹn</h3>
              <button type="button" onClick={() => setEdit(null)}>×</button>
            </div>
            <div className="modal-body">
              {emsg && <div className="admin-msg err">{emsg}</div>}
              <div className="fld">
                <label>Họ tên *</label>
                <input value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} required />
              </div>
              <div className="fld">
                <label>Số điện thoại *</label>
                <input value={ef.phone} onChange={(e) => setEf({ ...ef, phone: e.target.value })} required />
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
