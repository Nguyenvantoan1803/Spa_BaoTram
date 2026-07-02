import { useEffect, useMemo, useState } from "react";
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerHistory
} from "../../adminApi";

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const onlyDigits = (s) => (s || "").replace(/[^0-9]/g, "");
const fmtMoney = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
};

/* Cấu hình hạng thành viên (đồng bộ với backend) */
const TIER_CLS = {
  kim_cuong: "tier-kc",
  vang: "tier-vang",
  bac: "tier-bac",
  moi: "tier-moi"
};
const TIER_OPTS = [
  { key: "moi", label: "Thành viên" },
  { key: "bac", label: "Bạc" },
  { key: "vang", label: "Vàng" },
  { key: "kim_cuong", label: "Kim cương" }
];

const STATUS_LABEL = {
  moi: "Mới", da_dung: "Đã dùng DV", doi_dv: "Đổi DV", huy: "Đã huỷ"
};

const BLANK = { name: "", phone: "", email: "", address: "", birthday: "", note: "", tier: "moi" };

/* Quản lý khách hàng: tự tạo khi có lịch hẹn, nhân viên bổ sung thông tin. */
export default function CustomerManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // bản ghi đang sửa, hoặc {} khi thêm mới
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  // Lịch sử khách
  const [history, setHistory] = useState(null); // { customer, bookings } | "loading"

  const load = () => {
    setLoading(true);
    getCustomers()
      .then((d) => { setItems(Array.isArray(d) ? d : []); setErr(""); })
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return items;
    return items.filter((c) =>
      norm([c.name, c.phone, c.email, c.address, c.note].join(" ")).includes(nq) ||
      onlyDigits(c.phone).includes(onlyDigits(q))
    );
  }, [items, q]);

  const openNew = () => { setForm(BLANK); setEdit({}); };
  const openEdit = (c) => {
    setForm({
      name: c.name || "", phone: c.phone || "", email: c.email || "",
      address: c.address || "", birthday: c.birthday || "", note: c.note || "",
      tier: c.tier || "moi"
    });
    setEdit(c);
  };

  const openHistory = async (c) => {
    setHistory("loading");
    try {
      const data = await getCustomerHistory(c.id);
      setHistory(data);
    } catch {
      setHistory({ customer: c, bookings: [], error: true });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.phone.trim() && !form.name.trim()) { alert("Nhập ít nhất tên hoặc SĐT."); return; }
    setSaving(true);
    try {
      if (edit && edit.id) await updateCustomer(edit.id, form);
      else await createCustomer(form);
      setEdit(null);
      load();
    } catch { alert("Lưu thất bại."); }
    finally { setSaving(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Xoá khách hàng "${c.name || c.phone}"?`)) return;
    try { await deleteCustomer(c.id); setItems((a) => a.filter((x) => x.id !== c.id)); }
    catch { alert("Xoá thất bại."); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Khách hàng {!loading && <span className="tag-pill">{filtered.length}/{items.length}</span>}</h2>
        <button className="btn-add" onClick={openNew}>+ Thêm khách</button>
      </div>

      <div className="bk-tools">
        <input
          className="bk-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Tìm theo tên, SĐT, email..."
        />
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">{q ? "Không tìm thấy khách phù hợp." : "Chưa có khách hàng nào."}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Điện thoại</th>
                <th>Hạng</th>
                <th>Lượt đến</th>
                <th>Tổng chi tiêu</th>
                <th>Điểm</th>
                <th>Lần gần nhất</th>
                <th>Ngày sinh</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name || "—"}</b></td>
                  <td>{c.phone || "—"}</td>
                  <td><span className={"tier-badge " + (TIER_CLS[c.tier] || "tier-moi")}>{c.tierLabel || "Thành viên"}</span></td>
                  <td style={{ textAlign: "center" }}>{c.visits || 0}</td>
                  <td><b>{fmtMoney(c.totalSpent)}</b></td>
                  <td style={{ textAlign: "center" }}>{c.points || 0}</td>
                  <td>{fmtDate(c.lastVisitAt)}</td>
                  <td>{c.birthday || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-mini btn-book" onClick={() => openHistory(c)}>Lịch sử</button>
                      <button className="btn-mini btn-edit" onClick={() => openEdit(c)}>Sửa</button>
                      <button className="btn-mini btn-del" onClick={() => remove(c)}>Xoá</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal lịch sử khách hàng */}
      {history && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setHistory(null)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-head">
              <h3>📋 Lịch sử khách hàng</h3>
              <button type="button" onClick={() => setHistory(null)}>×</button>
            </div>
            <div className="modal-body">
              {history === "loading" ? (
                <div className="admin-empty">Đang tải...</div>
              ) : (
                <>
                  <div className="hist-summary">
                    <div><b style={{ fontSize: 16 }}>{history.customer.name || history.customer.phone || "Khách"}</b>
                      <span className={"tier-badge " + (TIER_CLS[history.customer.tier] || "tier-moi")} style={{ marginLeft: 8 }}>
                        {history.customer.tierLabel || "Thành viên"}
                      </span>
                    </div>
                    <div className="hist-stats">
                      <span>📞 {history.customer.phone || "—"}</span>
                      <span>🔁 {history.customer.visits || 0} lượt</span>
                      <span>💰 {fmtMoney(history.customer.totalSpent)}</span>
                      <span>⭐ {history.customer.points || 0} điểm</span>
                    </div>
                  </div>
                  <h4 style={{ margin: "14px 0 8px", color: "#1f5c3d" }}>Các lần đặt lịch ({history.bookings.length})</h4>
                  {history.bookings.length === 0 ? (
                    <div className="admin-empty">Chưa có lịch nào.</div>
                  ) : (
                    <div className="hist-list">
                      {history.bookings.map((b) => (
                        <div key={b.id} className="hist-row">
                          <div className="hist-date">{b.date || "—"}</div>
                          <div className="hist-svc">
                            <b>{b.service || "—"}</b>
                            {b.branch ? <span className="hist-branch"> · {b.branch}</span> : null}
                            {b.note ? <div className="hist-note">📝 {b.note}</div> : null}
                          </div>
                          <div className="hist-meta">
                            {b.amount > 0 && <span className="hist-amount">{fmtMoney(b.amount)}</span>}
                            <span className="hist-status">{STATUS_LABEL[b.status] || "Mới"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setHistory(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <form className="modal" onSubmit={save}>
            <div className="modal-head">
              <h3>{edit.id ? "Sửa khách hàng" : "Thêm khách hàng"}</h3>
              <button type="button" onClick={() => setEdit(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fld">
                <label>Họ tên</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="fld">
                <label>Số điện thoại</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="fld">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="fld">
                <label>Địa chỉ</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="fld">
                <label>Ngày sinh</label>
                <input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
              </div>
              <div className="fld">
                <label>Hạng thành viên</label>
                <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                  {TIER_OPTS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Ghi chú</label>
                <textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Sở thích, tình trạng da/tóc, ghi chú chăm sóc..." />
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setEdit(null)}>Huỷ</button>
              <button type="submit" className="btn-save" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
