import { useEffect, useState } from "react";
import { deleteItem } from "../../adminApi";

/*
  Xem danh sách gửi từ website (đặt lịch / liên hệ) - chỉ xem & xoá.
  Props: title, fetch (hàm lấy dữ liệu), columns [{key,label}], path ("booking"|"contact")
*/
export default function Submissions({ title, fetch, columns, path }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    fetch()
      .then((d) => { setItems(d); setErr(""); })
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  };
  useEffect(load, [path]);

  const remove = async (item) => {
    if (!window.confirm("Xoá mục này?")) return;
    try { await deleteItem(path, item.id); load(); }
    catch { alert("Xoá thất bại."); }
  };

  const fmt = (v) => {
    if (!v) return "—";
    if (typeof v === "string" && v.includes("T") && !isNaN(Date.parse(v)))
      return new Date(v).toLocaleString("vi-VN");
    return v;
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>{title} {!loading && <span className="tag-pill">{items.length}</span>}</h2>
        <button className="btn-add" onClick={load}>⟳ Tải lại</button>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có dữ liệu.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {columns.map((c) => <td key={c.key}>{fmt(item[c.key])}</td>)}
                  <td>
                    <button className="btn-mini btn-del" onClick={() => remove(item)}>Xoá</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
