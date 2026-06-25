import { useEffect, useMemo, useState } from "react";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../../adminApi";

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const onlyDigits = (s) => (s || "").replace(/[^0-9]/g, "");

const BLANK = { name: "", phone: "", email: "", address: "", birthday: "", note: "" };

/* Quản lý khách hàng: tự tạo khi có lịch hẹn, nhân viên bổ sung thông tin. */
export default function CustomerManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // bản ghi đang sửa, hoặc {} khi thêm mới
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

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
      address: c.address || "", birthday: c.birthday || "", note: c.note || ""
    });
    setEdit(c);
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
                <th>Email</th>
                <th>Địa chỉ</th>
                <th>Ngày sinh</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name || "—"}</b></td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.address || "—"}</td>
                  <td>{c.birthday || "—"}</td>
                  <td className="bk-note">{c.note || "—"}</td>
                  <td>
                    <div className="row-actions">
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
