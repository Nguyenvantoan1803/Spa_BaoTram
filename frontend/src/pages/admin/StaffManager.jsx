import { useEffect, useState } from "react";
import {
  getStaff, createStaff, updateStaff, deleteStaff, getStaffPerformance
} from "../../adminApi";
import { fileToResizedDataURL } from "../../imageUtil";

const fmtMoney = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const BLANK = { name: "", phone: "", role: "", image: "", active: true };
// Chữ cái đầu làm avatar khi chưa có ảnh
const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();

export default function StaffManager() {
  const [items, setItems] = useState([]);
  const [perf, setPerf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getStaff(), getStaffPerformance().catch(() => [])])
      .then(([s, p]) => { setItems(Array.isArray(s) ? s : []); setPerf(Array.isArray(p) ? p : []); setErr(""); })
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const perfOf = (name) => perf.find((p) => p.staff === name) || { count: 0, revenue: 0 };

  const openNew = () => { setForm(BLANK); setEdit({}); };
  const openEdit = (s) => {
    setForm({ name: s.name || "", phone: s.phone || "", role: s.role || "", image: s.image || "", active: s.active !== false });
    setEdit(s);
  };

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataURL(file, 480, 0.72); // avatar nhỏ gọn
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err) { alert(err.message || "Không đọc được ảnh"); }
    finally { e.target.value = ""; }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Nhập tên nhân viên."); return; }
    setSaving(true);
    try {
      if (edit && edit.id) await updateStaff(edit.id, form);
      else await createStaff(form);
      setEdit(null); load();
    } catch { alert("Lưu thất bại."); }
    finally { setSaving(false); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Xoá nhân viên "${s.name}"?`)) return;
    try { await deleteStaff(s.id); setItems((a) => a.filter((x) => x.id !== s.id)); }
    catch { alert("Xoá thất bại."); }
  };

  // Doanh thu nhóm "(Chưa gán)" hiển thị riêng dưới bảng
  const unassigned = perf.find((p) => p.staff === "(Chưa gán)");

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Nhân viên / KTV {!loading && <span className="tag-pill">{items.length}</span>}</h2>
        <button className="btn-add" onClick={openNew}>+ Thêm nhân viên</button>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có nhân viên nào. Bấm “Thêm nhân viên” để bắt đầu.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên</th><th>Vai trò</th><th>Điện thoại</th>
                <th>Lịch đã làm</th><th>Doanh thu</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const p = perfOf(s.name);
                return (
                  <tr key={s.id} style={s.active === false ? { opacity: 0.55 } : undefined}>
                    <td>
                      <div className="staff-cell">
                        {s.image
                          ? <img className="staff-ava" src={s.image} alt={s.name} />
                          : <span className="staff-ava ph">{initial(s.name)}</span>}
                        <b>{s.name}</b>
                      </div>
                    </td>
                    <td>{s.role || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td style={{ textAlign: "center" }}>{p.count}</td>
                    <td><b style={{ color: "#1e7a3e" }}>{fmtMoney(p.revenue)}</b></td>
                    <td>
                      <span className={"st-pill " + (s.active !== false ? "tier-vang" : "tier-moi")}>
                        {s.active !== false ? "Đang làm" : "Nghỉ"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-mini btn-edit" onClick={() => openEdit(s)}>Sửa</button>
                        <button className="btn-mini btn-del" onClick={() => remove(s)}>Xoá</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {unassigned && unassigned.count > 0 && (
        <div className="admin-msg" style={{ background: "#fff7e6", color: "#8a5a00", marginTop: 14 }}>
          ⚠️ Có {unassigned.count} lịch hoàn tất ({fmtMoney(unassigned.revenue)}) <b>chưa gán nhân viên</b>.
          Vào mục Đặt lịch → Sửa để gán KTV phụ trách.
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <form className="modal" style={{ maxWidth: 440 }} onSubmit={save}>
            <div className="modal-head">
              <h3>{edit.id ? "Sửa nhân viên" : "Thêm nhân viên"}</h3>
              <button type="button" onClick={() => setEdit(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fld">
                <label>Tên nhân viên *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="fld">
                <label>Vai trò</label>
                <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="VD: KTV chăm sóc da, Thợ tóc, Lễ tân..." />
              </div>
              <div className="fld">
                <label>Số điện thoại</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="fld">
                <label>Ảnh đại diện</label>
                <div className="staff-upload">
                  {form.image
                    ? <img className="staff-ava lg" src={form.image} alt="preview" />
                    : <span className="staff-ava lg ph">{initial(form.name)}</span>}
                  <div className="staff-upload-btns">
                    <label className="btn-upload">
                      📷 Chọn ảnh
                      <input type="file" accept="image/*" hidden onChange={pickImage} />
                    </label>
                    {form.image && (
                      <button type="button" className="btn-mini btn-del" onClick={() => setForm({ ...form, image: "" })}>Xoá ảnh</button>
                    )}
                  </div>
                </div>
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Đang làm việc (hiện trong danh sách gán lịch)
              </label>
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
