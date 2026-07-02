import { useEffect, useMemo, useState } from "react";
import {
  getVouchers, createVoucher, updateVoucher, deleteVoucher, genVoucherCode, redeemVoucher
} from "../../adminApi";

const fmtMoney = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const BLANK = {
  code: "", description: "", type: "percent", value: 0,
  minOrder: 0, maxDiscount: 0, expiry: "", usageLimit: 0, active: true
};

const fmtValue = (v) =>
  v.type === "percent" ? `Giảm ${v.value || 0}%${v.maxDiscount ? ` (tối đa ${fmtMoney(v.maxDiscount)})` : ""}`
    : `Giảm ${fmtMoney(v.value)}`;

const isExpired = (v) => v.expiry && new Date(v.expiry) < new Date(new Date().toDateString());

export default function VoucherManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  // Ghi nhận sử dụng mã
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemDiscount, setRedeemDiscount] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null); // { ok, text }

  // Tổng kết: số lượt dùng + tổng tiền đã giảm (kinh phí)
  const totals = useMemo(() => {
    return items.reduce((acc, v) => {
      acc.uses += v.usedCount || 0;
      acc.discount += v.totalDiscount || 0;
      return acc;
    }, { uses: 0, discount: 0 });
  }, [items]);

  const load = () => {
    setLoading(true);
    getVouchers()
      .then((d) => { setItems(Array.isArray(d) ? d : []); setErr(""); })
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = async () => {
    setMsg(""); setEdit({});
    setForm(BLANK);
    try { const code = await genVoucherCode(); setForm({ ...BLANK, code }); } catch { /* để trống, backend tự sinh */ }
  };
  const regen = async () => {
    try { const code = await genVoucherCode(); setForm((f) => ({ ...f, code })); } catch { /* bỏ qua */ }
  };

  const doRedeem = async (e) => {
    e.preventDefault();
    const code = redeemCode.trim();
    if (!code) return;
    setRedeeming(true); setRedeemMsg(null);
    try {
      const discount = redeemDiscount ? Number(redeemDiscount) : undefined;
      const r = await redeemVoucher(code, discount);
      const v = r.voucher;
      const left = v.usageLimit ? `, còn ${Math.max(0, v.usageLimit - v.usedCount)} lượt` : "";
      const disc = r.discount ? `, giảm ${fmtMoney(r.discount)}` : "";
      setRedeemMsg({ ok: true, text: `✓ Đã ghi nhận mã ${v.code} (đã dùng ${v.usedCount} lượt${disc}${left}).` });
      setRedeemCode(""); setRedeemDiscount("");
      setItems((a) => a.map((x) => (x.id === v.id ? v : x)));
    } catch (e2) {
      setRedeemMsg({ ok: false, text: "✗ " + (e2?.response?.data?.error || "Không ghi nhận được mã.") });
    } finally { setRedeeming(false); }
  };
  const openEdit = (v) => {
    setForm({
      code: v.code || "", description: v.description || "", type: v.type || "percent",
      value: v.value || 0, minOrder: v.minOrder || 0, maxDiscount: v.maxDiscount || 0,
      expiry: v.expiry || "", usageLimit: v.usageLimit || 0, active: v.active !== false
    });
    setMsg(""); setEdit(v);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    const body = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value) || 0,
      minOrder: Number(form.minOrder) || 0,
      maxDiscount: Number(form.maxDiscount) || 0,
      usageLimit: Number(form.usageLimit) || 0
    };
    try {
      if (edit && edit.id) await updateVoucher(edit.id, body);
      else await createVoucher(body);
      setEdit(null);
      load();
    } catch (e2) {
      setMsg(e2?.response?.data?.error || "Lưu thất bại.");
    } finally { setSaving(false); }
  };

  const remove = async (v) => {
    if (!window.confirm(`Xoá voucher "${v.code}"?`)) return;
    try { await deleteVoucher(v.id); setItems((a) => a.filter((x) => x.id !== v.id)); }
    catch { alert("Xoá thất bại."); }
  };

  const toggleActive = async (v) => {
    try {
      const u = await updateVoucher(v.id, { active: !v.active });
      setItems((a) => a.map((x) => (x.id === v.id ? u : x)));
    } catch { alert("Cập nhật thất bại."); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Voucher / Mã giảm giá {!loading && <span className="tag-pill">{items.length}</span>}</h2>
        <button className="btn-add" onClick={openNew}>+ Tạo voucher</button>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      {!loading && items.length > 0 && (
        <div className="admin-stats" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="n">{items.length}</div><div className="l">Voucher đang quản lý</div></div>
          <div className="stat-card"><div className="n">{totals.uses}</div><div className="l">Tổng lượt đã dùng</div></div>
          <div className="stat-card"><div className="n" style={{ color: "#c0392b" }}>{fmtMoney(totals.discount)}</div><div className="l">Tổng tiền đã giảm (kinh phí)</div></div>
        </div>
      )}

      <form className="vc-redeem" onSubmit={doRedeem}>
        <div className="vc-redeem-row">
          <span className="vc-redeem-ico">🎟️</span>
          <input
            value={redeemCode}
            onChange={(e) => { setRedeemCode(e.target.value.toUpperCase()); setRedeemMsg(null); }}
            placeholder="Nhập mã khách đưa..."
          />
          <input
            type="number" min="0" step="1000" className="vc-redeem-disc"
            value={redeemDiscount}
            onChange={(e) => setRedeemDiscount(e.target.value)}
            placeholder="Số tiền giảm (đ)"
            title="Số tiền đã giảm cho lượt này (để trống nếu voucher kiểu số tiền cố định)"
          />
          <button type="submit" className="btn-add" disabled={redeeming}>
            {redeeming ? "..." : "Ghi nhận sử dụng"}
          </button>
        </div>
        {redeemMsg && (
          <div className={"vc-redeem-msg " + (redeemMsg.ok ? "ok" : "no")}>{redeemMsg.text}</div>
        )}
        <small className="vc-redeem-hint">
          Mỗi lần khách dùng mã, nhập mã + số tiền đã giảm → đếm lượt dùng & cộng dồn kinh phí.
          Voucher kiểu “số tiền cố định” có thể bỏ trống ô tiền (tự lấy mức giảm).
        </small>
      </form>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">Chưa có voucher nào. Bấm “Tạo voucher” để thêm.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th><th>Ưu đãi</th><th>Đơn tối thiểu</th><th>Hạn dùng</th>
                <th>Đã dùng / Giới hạn</th><th>Đã giảm</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => {
                const expired = isExpired(v);
                return (
                  <tr key={v.id} style={expired ? { opacity: 0.6 } : undefined}>
                    <td><b className="vc-code">{v.code}</b>{v.description ? <div className="bk-note">{v.description}</div> : null}</td>
                    <td>{fmtValue(v)}</td>
                    <td>{v.minOrder ? fmtMoney(v.minOrder) : "—"}</td>
                    <td>{v.expiry ? (expired ? <span style={{ color: "#c0392b" }}>{v.expiry} (hết hạn)</span> : v.expiry) : "Không giới hạn"}</td>
                    <td style={{ textAlign: "center" }}>{v.usedCount || 0}{v.usageLimit ? ` / ${v.usageLimit}` : ""}</td>
                    <td><b style={{ color: "#c0392b" }}>{v.totalDiscount ? fmtMoney(v.totalDiscount) : "—"}</b></td>
                    <td>
                      <button
                        className={"st-pill " + (v.active && !expired ? "tier-vang" : "tier-moi")}
                        style={{ cursor: "pointer", border: "none" }}
                        onClick={() => toggleActive(v)}
                        title="Bấm để bật/tắt"
                      >{v.active ? "Đang bật" : "Đã tắt"}</button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-mini btn-edit" onClick={() => openEdit(v)}>Sửa</button>
                        <button className="btn-mini btn-del" onClick={() => remove(v)}>Xoá</button>
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
          <form className="modal" onSubmit={save}>
            <div className="modal-head">
              <h3>{edit.id ? "Sửa voucher" : "Tạo voucher"}</h3>
              <button type="button" onClick={() => setEdit(null)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className="admin-msg err">{msg}</div>}
              <div className="fld">
                <label>Mã voucher</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="Để trống sẽ tự sinh mã" style={{ textTransform: "uppercase", flex: 1 }} />
                  <button type="button" className="btn-add" style={{ whiteSpace: "nowrap" }} onClick={regen}>🎲 Tạo mã</button>
                </div>
                <small style={{ color: "#8a8f88" }}>Mã tự sinh gồm 6 ký tự chữ & số. Bạn có thể sửa thành mã dễ nhớ.</small>
              </div>
              <div className="fld">
                <label>Mô tả</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="VD: Giảm 20% nhân dịp sinh nhật" />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="fld" style={{ flex: 1 }}>
                  <label>Loại giảm</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="percent">Theo phần trăm (%)</option>
                    <option value="amount">Số tiền cố định (đ)</option>
                  </select>
                </div>
                <div className="fld" style={{ flex: 1 }}>
                  <label>{form.type === "percent" ? "Giảm (%)" : "Giảm (đồng)"}</label>
                  <input type="number" min="0" value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="fld" style={{ flex: 1 }}>
                  <label>Đơn tối thiểu (đồng)</label>
                  <input type="number" min="0" value={form.minOrder}
                    onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
                </div>
                {form.type === "percent" && (
                  <div className="fld" style={{ flex: 1 }}>
                    <label>Giảm tối đa (đồng, 0 = không giới hạn)</label>
                    <input type="number" min="0" value={form.maxDiscount}
                      onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="fld" style={{ flex: 1 }}>
                  <label>Hạn dùng (để trống = vô hạn)</label>
                  <input type="date" value={form.expiry}
                    onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
                </div>
                <div className="fld" style={{ flex: 1 }}>
                  <label>Giới hạn lượt dùng (0 = vô hạn)</label>
                  <input type="number" min="0" value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
                </div>
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Đang bật (cho phép sử dụng)
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
