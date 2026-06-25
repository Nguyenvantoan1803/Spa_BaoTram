import { useEffect, useState } from "react";
import { getServices, postBooking, getInfo } from "../api";
import { buildServiceOptions } from "../servicesData";

const SEEN_KEY = "baotram_popup_seen";

export default function BookingPopup() {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", service: "", branch: "", date: "" });
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Đã xem trong phiên này thì không hiện lại
    if (sessionStorage.getItem(SEEN_KEY)) return;
    getServices().then((d) => Array.isArray(d) && setServices(d)).catch(() => {});
    getInfo().then((d) => setBranches(Array.isArray(d?.branches) ? d.branches : [])).catch(() => {});

    let done = false;
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onExit);
    }
    const trigger = () => {
      if (done) return;
      done = true;
      setOpen(true);
      cleanup();
    };
    // Kéo qua ~50% trang
    const onScroll = () => {
      const reached = window.scrollY + window.innerHeight;
      const half = document.documentElement.scrollHeight * 0.5;
      if (reached >= half) trigger();
    };
    // Có ý định thoát (chuột rời lên trên cùng cửa sổ)
    const onExit = (e) => {
      if (!e.relatedTarget && e.clientY <= 0) trigger();
    };
    // Dự phòng: sau 8 giây vẫn chưa thấy thì mới bật
    const timer = setTimeout(trigger, 8000);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onExit);
    return cleanup;
  }, []);

  // Khoá cuộn nền khi popup mở
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = () => {
    setOpen(false);
    sessionStorage.setItem(SEEN_KEY, "1");
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSending(true);
    try {
      const res = await postBooking({ ...form, note: "Đặt nhanh từ popup ưu đãi" });
      setMsg({ type: "success", text: res.message });
      setForm({ name: "", phone: "", service: "", branch: "", date: "" });
      setTimeout(close, 2500);
    } catch (err) {
      setMsg({
        type: "error",
        text: err.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại."
      });
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="popup-overlay" onClick={close}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <button className="popup-x" onClick={close} aria-label="Đóng">×</button>

        <div className="popup-head">
          <div className="popup-badge">🎁 ƯU ĐÃI HÔM NAY</div>
          <h3>Đặt lịch ngay – Nhận tư vấn miễn phí!</h3>
          <p>Để lại thông tin, Bảo Trâm Spa sẽ gọi xác nhận & ưu đãi riêng cho bạn.</p>
        </div>

        <form className="popup-form" onSubmit={submit}>
          {msg && <div className={"alert alert-" + msg.type}>{msg.text}</div>}
          <input
            placeholder="Họ và tên *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Số điện thoại *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <select
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
            required
          >
            <option value="">-- Chọn dịch vụ --</option>
            {buildServiceOptions(services).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {branches.length > 0 && (
            <select
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
            >
              <option value="">-- Chọn cơ sở --</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          <label className="popup-datelbl">Chọn ngày & giờ hẹn</label>
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <button type="submit" className="btn btn-primary popup-submit" disabled={sending}>
            {sending ? "Đang gửi..." : "Đặt lịch ngay"}
          </button>
          <button type="button" className="popup-skip" onClick={close}>Để sau</button>
        </form>
      </div>
    </div>
  );
}
