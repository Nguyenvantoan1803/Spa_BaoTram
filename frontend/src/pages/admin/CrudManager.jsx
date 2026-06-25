import { useEffect, useState } from "react";
import { listItems, createItem, updateItem, deleteItem } from "../../adminApi";
import { fileToResizedDataURL } from "../../imageUtil";

/*
  Component quản lý CRUD dùng chung.
  Props:
    - path:    đường dẫn API (vd "news", "combos")
    - title:   tiêu đề
    - fields:  cấu hình form [{ key, label, type, placeholder, hint, options }]
               type: text | textarea | number | image | list | checkbox | select
    - columns: cột hiển thị trong bảng [{ key, label, type }]
               type: image | clip | pill | text (mặc định)
*/
export default function CrudManager({ path, title, fields, columns }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listItems(path)
      .then((d) => { setItems(d); setErr(""); })
      .catch(() =>
        setErr("Không tải được dữ liệu. Backend đã chạy & đã kết nối MongoDB chưa?")
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, [path]);

  const blank = () => {
    const f = {};
    fields.forEach((fl) => {
      if (fl.type === "checkbox") f[fl.key] = false;
      else if (fl.type === "service-items") f[fl.key] = [];
      else f[fl.key] = "";
    });
    return f;
  };

  // Thao tác với danh sách "gói dịch vụ" lồng bên trong 1 dịch vụ
  const addSvcItem = (key) =>
    setForm((f) => ({ ...f, [key]: [...(f[key] || []), { name: "", duration: "", price: "", steps: "" }] }));
  const removeSvcItem = (key, idx) =>
    setForm((f) => ({ ...f, [key]: (f[key] || []).filter((_, i) => i !== idx) }));
  const updateSvcItem = (key, idx, patch) =>
    setForm((f) => ({ ...f, [key]: (f[key] || []).map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const openNew = () => { setEditing(null); setForm(blank()); setOpen(true); };

  // Chọn ảnh từ máy cho field type "image": nén rồi lưu data URL vào form
  const onPickFieldImage = async (e, key) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataURL(file);
      setForm((f) => ({ ...f, [key]: dataUrl }));
    } catch {
      alert("Ảnh không hợp lệ.");
    }
  };

  const openEdit = (item) => {
    const f = { ...item };
    fields.forEach((fl) => {
      if (fl.type === "list" && Array.isArray(f[fl.key])) f[fl.key] = f[fl.key].join("\n");
      if (f[fl.key] == null) f[fl.key] = fl.type === "checkbox" ? false : "";
    });
    setEditing(item);
    setForm(f);
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const body = { ...form };
    fields.forEach((fl) => {
      if (fl.type === "list") {
        body[fl.key] = String(body[fl.key] || "")
          .split("\n").map((s) => s.trim()).filter(Boolean);
      }
      if (fl.type === "number" && body[fl.key] !== "") body[fl.key] = Number(body[fl.key]);
      if (fl.type === "service-items") {
        body[fl.key] = (body[fl.key] || []).map((it) => ({
          name: it.name || "",
          duration: it.duration || "",
          price: it.price === "" || it.price == null ? undefined : Number(it.price),
          steps: (Array.isArray(it.steps) ? it.steps.join("\n") : String(it.steps || ""))
            .split("\n").map((s) => s.trim()).filter(Boolean)
        }));
      }
    });
    try {
      if (editing) await updateItem(path, editing.id, body);
      else await createItem(path, body);
      setOpen(false);
      load();
    } catch (e2) {
      setErr(e2.response?.data?.error || "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  // Bật/tắt hiển thị mục trên website
  const toggleActive = async (item) => {
    const next = !(item.active !== false); // đang chạy -> dừng, đang dừng -> chạy
    setItems((arr) => arr.map((x) => (x.id === item.id ? { ...x, active: next } : x)));
    try {
      await updateItem(path, item.id, { active: next });
    } catch {
      alert("Đổi trạng thái thất bại.");
      load();
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xoá "${item.name || item.title || item.id}"?`)) return;
    try {
      await deleteItem(path, item.id);
      load();
    } catch {
      alert("Xoá thất bại.");
    }
  };

  const renderCell = (item, col) => {
    const v = item[col.key];
    if (col.type === "image") return v ? <img className="thumb" src={v} alt="" /> : "—";
    if (col.type === "pill") return v ? <span className="tag-pill">{v}</span> : "—";
    if (col.type === "clip") return <div className="cell-clip">{Array.isArray(v) ? v.join(", ") : v}</div>;
    return Array.isArray(v) ? v.join(", ") : (v ?? "—").toString();
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>{title}</h2>
        <button className="btn-add" onClick={openNew}>+ Thêm mới</button>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có dữ liệu. Bấm “Thêm mới” để tạo.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isActive = item.active !== false;
                return (
                <tr key={item.id} className={isActive ? "" : "row-off"}>
                  {columns.map((c) => <td key={c.key}>{renderCell(item, c)}</td>)}
                  <td>
                    <span className={"run-pill " + (isActive ? "on" : "off")}>
                      {isActive ? "Đang chạy" : "Đã dừng"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className={"btn-mini " + (isActive ? "btn-stop" : "btn-run")}
                        onClick={() => toggleActive(item)}
                      >
                        {isActive ? "Dừng" : "Chạy"}
                      </button>
                      <button className="btn-mini btn-edit" onClick={() => openEdit(item)}>Sửa</button>
                      <button className="btn-mini btn-del" onClick={() => remove(item)}>Xoá</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="modal" onSubmit={save}>
            <div className="modal-head">
              <h3>{editing ? "Sửa" : "Thêm"} {title.toLowerCase()}</h3>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="admin-msg err">{err}</div>}
              {fields.map((fl) => (
                <div className={"fld" + (fl.type === "checkbox" ? " fld-check" : "")} key={fl.key}>
                  {fl.type === "checkbox" ? (
                    <>
                      <input
                        type="checkbox"
                        id={fl.key}
                        checked={!!form[fl.key]}
                        onChange={(e) => setForm({ ...form, [fl.key]: e.target.checked })}
                      />
                      <label htmlFor={fl.key} style={{ margin: 0 }}>{fl.label}</label>
                    </>
                  ) : (
                    <>
                      <label>{fl.label}</label>
                      {fl.type === "service-items" ? (
                        <div className="svc-items">
                          {(form[fl.key] || []).map((it, idx) => (
                            <div className="svc-item" key={idx}>
                              <div className="svc-item-head">
                                <b>Gói {idx + 1}</b>
                                <button type="button" className="img-clear" onClick={() => removeSvcItem(fl.key, idx)}>
                                  Xoá gói
                                </button>
                              </div>
                              <div className="svc-row">
                                <input
                                  placeholder="Tên gói (vd: Gội siêu sạch)"
                                  value={it.name || ""}
                                  onChange={(e) => updateSvcItem(fl.key, idx, { name: e.target.value })}
                                />
                                <input
                                  placeholder="Thời lượng (vd: 30 phút)"
                                  value={it.duration || ""}
                                  onChange={(e) => updateSvcItem(fl.key, idx, { duration: e.target.value })}
                                />
                                <input
                                  type="number"
                                  placeholder="Giá (vd: 60000)"
                                  value={it.price ?? ""}
                                  onChange={(e) => updateSvcItem(fl.key, idx, { price: e.target.value })}
                                />
                              </div>
                              <textarea
                                rows={4}
                                placeholder="Các bước (mỗi dòng 1 bước)&#10;Tẩy trang - rửa mặt&#10;Massage da đầu..."
                                value={Array.isArray(it.steps) ? it.steps.join("\n") : (it.steps || "")}
                                onChange={(e) => updateSvcItem(fl.key, idx, { steps: e.target.value })}
                              />
                            </div>
                          ))}
                          <button type="button" className="btn-add-item" onClick={() => addSvcItem(fl.key)}>
                            + Thêm gói dịch vụ
                          </button>
                        </div>
                      ) : fl.type === "image" ? (
                        <div className="img-field">
                          {form[fl.key] ? (
                            <img className="img-preview" src={form[fl.key]} alt="preview" />
                          ) : (
                            <div className="img-empty">Chưa có ảnh</div>
                          )}
                          <div className="img-actions">
                            <label className="btn-upload">
                              📁 Chọn ảnh từ máy
                              <input type="file" accept="image/*" hidden onChange={(e) => onPickFieldImage(e, fl.key)} />
                            </label>
                            {form[fl.key] && (
                              <button type="button" className="img-clear" onClick={() => setForm({ ...form, [fl.key]: "" })}>
                                Xoá ảnh
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={form[fl.key] || ""}
                            placeholder="hoặc dán link ảnh https://..."
                            onChange={(e) => setForm({ ...form, [fl.key]: e.target.value })}
                          />
                        </div>
                      ) : fl.type === "textarea" || fl.type === "list" ? (
                        <textarea
                          rows={fl.type === "list" ? 4 : 3}
                          value={form[fl.key] || ""}
                          placeholder={fl.placeholder}
                          onChange={(e) => setForm({ ...form, [fl.key]: e.target.value })}
                        />
                      ) : fl.type === "select" ? (
                        <select
                          value={form[fl.key] || ""}
                          onChange={(e) => setForm({ ...form, [fl.key]: e.target.value })}
                        >
                          <option value="">-- Chọn --</option>
                          {fl.options.map((o) => (
                            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={fl.type === "number" ? "number" : "text"}
                          value={form[fl.key] ?? ""}
                          placeholder={fl.placeholder}
                          onChange={(e) => setForm({ ...form, [fl.key]: e.target.value })}
                        />
                      )}
                      {fl.hint && <div className="hint">{fl.hint}</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>Huỷ</button>
              <button className="btn-save" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
