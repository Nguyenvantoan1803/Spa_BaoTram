import { useEffect, useMemo, useState } from "react";
import { getReviews, publishReview, deleteReview } from "../../adminApi";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN");
};
const Stars = ({ n }) => (
  <span style={{ color: "#f5b301", letterSpacing: 1 }}>
    {"★".repeat(n)}<span style={{ color: "#d8dcd8" }}>{"★".repeat(5 - n)}</span>
  </span>
);

export default function ReviewManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all"); // all | good | low

  const load = () => {
    setLoading(true);
    getReviews()
      .then((d) => { setItems(Array.isArray(d) ? d : []); setErr(""); })
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (filter === "good") return items.filter((r) => r.rating >= 4);
    if (filter === "low") return items.filter((r) => r.rating <= 3);
    return items;
  }, [items, filter]);

  const avg = useMemo(() => {
    if (!items.length) return 0;
    return (items.reduce((s, r) => s + (r.rating || 0), 0) / items.length).toFixed(1);
  }, [items]);

  const publish = async (r) => {
    try { await publishReview(r.id); setItems((a) => a.map((x) => (x.id === r.id ? { ...x, published: true } : x))); }
    catch { alert("Đăng thất bại."); }
  };
  const remove = async (r) => {
    if (!window.confirm("Xoá đánh giá này?")) return;
    try { await deleteReview(r.id); setItems((a) => a.filter((x) => x.id !== r.id)); }
    catch { alert("Xoá thất bại."); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Đánh giá dịch vụ {!loading && <span className="tag-pill">{items.length}</span>}</h2>
        <button className="btn-add" onClick={load}>⟳ Tải lại</button>
      </div>

      {!loading && items.length > 0 && (
        <div className="admin-stats" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="n">{avg} ★</div><div className="l">Điểm trung bình</div></div>
          <div className="stat-card"><div className="n">{items.filter((r) => r.rating >= 4).length}</div><div className="l">Đánh giá tốt (≥4★)</div></div>
          <div className="stat-card"><div className="n" style={{ color: "#c0392b" }}>{items.filter((r) => r.rating <= 3).length}</div><div className="l">Cần lưu ý (≤3★)</div></div>
          <div className="stat-card"><div className="n">{items.filter((r) => r.published).length}</div><div className="l">Đã đăng lên web</div></div>
        </div>
      )}

      <div className="care-dayfilter" style={{ marginBottom: 12 }}>
        <span>Lọc:</span>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>Tất cả</button>
        <button className={filter === "good" ? "on" : ""} onClick={() => setFilter("good")}>Tốt (≥4★)</button>
        <button className={filter === "low" ? "on" : ""} onClick={() => setFilter("low")}>Cần lưu ý (≤3★)</button>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">Chưa có đánh giá nào.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Khách</th><th>Dịch vụ</th><th>KTV</th><th>Điểm</th><th>Nhận xét</th><th>Lúc</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name || "—"}</b><div className="bk-note">{r.phone}</div></td>
                  <td>{r.service || "—"}</td>
                  <td>{r.staff || "—"}</td>
                  <td><Stars n={r.rating || 0} /></td>
                  <td className="bk-note">{r.comment || "—"}</td>
                  <td className="bk-sent">{fmtDate(r.createdAt)}</td>
                  <td>
                    {r.published
                      ? <span className="st-pill tier-vang">Đã đăng web</span>
                      : <span className="st-pill tier-moi">Chưa đăng</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      {!r.published && <button className="btn-mini btn-book" onClick={() => publish(r)}>Đăng lên web</button>}
                      <button className="btn-mini btn-del" onClick={() => remove(r)}>Xoá</button>
                    </div>
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
