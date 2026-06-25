import { useEffect, useMemo, useRef, useState } from "react";
import {
  getConversations,
  getConversation,
  replyConversation,
  renameConversation,
  deleteConversation,
  pingStaffTyping,
  createBooking,
  getBookings,
  updateBooking
} from "../../adminApi";
import { getCombos, getServices, getInfo } from "../../api";
import { buildServiceOptions } from "../../servicesData";
import { fileToResizedDataURL } from "../../imageUtil";

/* Trang quản trị: xem & trả lời tin nhắn khách chat với tư vấn viên.
   Tự làm mới danh sách và hội thoại đang mở vài giây/lần (polling). */
export default function ChatManager() {
  const [list, setList] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [conv, setConv] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [err, setErr] = useState("");
  // Tạo lịch hẹn ngay trong chat
  const [showBooking, setShowBooking] = useState(false);
  const [opts, setOpts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [info, setInfo] = useState(null);
  const [showQuick, setShowQuick] = useState(false);
  const [sugOpen, setSugOpen] = useState(false); // gợi ý mẫu khi đang gõ
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [bk, setBk] = useState({ name: "", phone: "", service: "", branch: "", date: "", time: "", note: "" });
  const [bkMsg, setBkMsg] = useState(null);
  const [bkSaving, setBkSaving] = useState(false);
  const [bkNotify, setBkNotify] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [bookings, setBookings] = useState([]); // toàn bộ lịch hẹn để đối chiếu khách
  const [editBkId, setEditBkId] = useState(null); // null = tạo mới, có id = đang sửa
  const bodyRef = useRef(null);
  const activeRef = useRef(null);
  const lastTypingRef = useRef(0);
  activeRef.current = activeId;

  const fmt = (v) =>
    v ? new Date(v).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";

  const loadList = async () => {
    try { setList(await getConversations()); setErr(""); }
    catch { setErr("Không tải được danh sách. Kiểm tra backend & đăng nhập."); }
  };

  const loadConv = async (id) => {
    if (!id) return;
    try {
      const c = await getConversation(id);
      setConv(c);
      setUserTyping(!!c.userTyping);
    } catch { /* bỏ qua */ }
  };

  // Báo cho khách biết nhân viên đang gõ (tối đa 1 lần / 2.5 giây)
  const onType = (e) => {
    setText(e.target.value);
    setSugOpen(true); // gõ tới đâu gợi ý mẫu tới đó
    if (e.target.value.trim() && activeId) {
      const now = Date.now();
      if (now - lastTypingRef.current > 2500) {
        lastTypingRef.current = now;
        pingStaffTyping(activeId).catch(() => {});
      }
    }
  };

  const pickSuggestion = (q) => { setText(q.text); setSugOpen(false); };

  // Tải danh sách + tự làm mới
  useEffect(() => {
    loadList();
    const t = setInterval(loadList, 5000);
    return () => clearInterval(t);
  }, []);

  // Tự làm mới hội thoại đang mở
  useEffect(() => {
    if (!activeId) return;
    loadConv(activeId);
    const t = setInterval(() => loadConv(activeRef.current), 4000);
    return () => clearInterval(t);
  }, [activeId]);

  // Cuộn xuống tin mới nhất
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [conv]);

  // Tải danh sách combo + dịch vụ để chọn khi tạo lịch hẹn
  useEffect(() => {
    Promise.all([getCombos().catch(() => []), getServices().catch(() => [])])
      .then(([combos, services]) => {
        const comboNames = (Array.isArray(combos) ? combos : []).map((c) => `Combo: ${c.name}`);
        const serviceNames = buildServiceOptions(Array.isArray(services) ? services : []);
        setOpts([...comboNames, ...serviceNames]);
      });
    getInfo().then((d) => { setInfo(d); setBranches(Array.isArray(d?.branches) ? d.branches : []); }).catch(() => {});
  }, []);

  // Mẫu tin nhắn nhanh (giống Zalo) - tự lấy địa chỉ/giờ/hotline từ thông tin spa
  const quickReplies = useMemo(() => {
    const list = [
      { label: "Chào hỏi", text: "Dạ Bảo Trâm Spa xin chào ạ 😊 Mình có thể hỗ trợ gì cho bạn ạ?" },
      { label: "Xin tên & SĐT", text: "Dạ bạn cho mình xin tên và số điện thoại để tiện tư vấn & giữ lịch nhé ạ 🌸" },
      { label: "Cảm ơn", text: "Dạ cảm ơn bạn nhiều ạ! Hẹn gặp lại bạn tại Bảo Trâm Spa 🌸" }
    ];
    if (info?.branches?.length)
      list.push({ label: "Địa chỉ", text: "📍 Bảo Trâm Spa có các cơ sở:\n" + info.branches.map((b) => "• " + b).join("\n") });
    if (info?.workingHours) list.push({ label: "Giờ làm việc", text: `🕗 Giờ làm việc: ${info.workingHours}` });
    if (info?.phone) list.push({ label: "Hotline", text: `📞 Hotline / Zalo: ${info.phone}` });
    return list;
  }, [info]);

  // Gợi ý mẫu lọc theo nội dung đang gõ
  const suggestions = useMemo(() => {
    if (!sugOpen) return [];
    const t = text.trim().toLowerCase();
    if (!t) return [];
    return quickReplies.filter(
      (q) => q.label.toLowerCase().includes(t) || q.text.toLowerCase().includes(t)
    );
  }, [sugOpen, text, quickReplies]);

  // Ngày hôm nay (YYYY-MM-DD, giờ máy) để so sánh lịch đã qua ngày chưa
  const todayYMD = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  };
  const bookingDay = (b) => (b.date && /^\d{4}-\d{2}-\d{2}/.test(b.date) ? b.date.slice(0, 10) : null);

  // Tải lịch hẹn; lịch "mới" đã qua ngày -> tự động chuyển thành HỦY
  const loadBookings = async () => {
    try {
      const d = await getBookings();
      const arr = Array.isArray(d) ? d : [];
      const today = todayYMD();
      const expired = arr.filter((b) => (b.status || "moi") === "moi" && bookingDay(b) && bookingDay(b) < today);
      if (expired.length) {
        await Promise.all(expired.map((b) => updateBooking(b.id, { status: "huy" }).catch(() => {})));
        expired.forEach((b) => { b.status = "huy"; });
      }
      setBookings(arr);
    } catch { /* bỏ qua */ }
  };
  useEffect(() => { loadBookings(); }, []);

  // Lịch hẹn SẮP TỚI của khách (chỉ trạng thái "mới"), khớp theo SĐT/tên
  const digits = (s) => (s || "").replace(/\D/g, "");
  const custBookings = useMemo(() => {
    if (!conv) return [];
    const phone = digits(conv.phone);
    const name = (conv.name || "").trim().toLowerCase();
    return bookings
      .filter((b) => (b.status || "moi") === "moi")
      .filter((b) => {
        if (phone) return digits(b.phone) === phone;
        return name && name !== "khách" && (b.name || "").trim().toLowerCase() === name;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [conv, bookings]);

  // Huỷ 1 lịch hẹn
  const cancelBk = async (b) => {
    if (!window.confirm("Huỷ lịch hẹn này?")) return;
    setBookings((arr) => arr.map((x) => (x.id === b.id ? { ...x, status: "huy" } : x)));
    try { await updateBooking(b.id, { status: "huy" }); }
    catch { alert("Huỷ thất bại."); loadBookings(); }
  };

  const fmtBk = (v) => {
    if (!v) return "Chưa chọn ngày";
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const [date, time] = v.split("T");
      const [y, m, d] = date.split("-");
      return `${d}/${m}/${y}` + (time ? ` ${time.slice(0, 5)}` : "");
    }
    return v;
  };

  const open = (id) => { setActiveId(id); setEditingName(false); };

  // Bắt đầu sửa tên khách (nháy đúp)
  const startRename = () => {
    setNameDraft(conv.name && conv.name !== "Khách" ? conv.name : "");
    setEditingName(true);
  };
  // Lưu tên mới
  const saveName = async () => {
    setEditingName(false);
    const n = nameDraft.trim();
    if (!n || n === conv.name) return;
    setConv((c) => ({ ...c, name: n }));
    setList((arr) => arr.map((x) => (x.id === conv.id ? { ...x, name: n } : x)));
    try { await renameConversation(conv.id, n); }
    catch { alert("Đổi tên thất bại."); loadList(); loadConv(conv.id); }
  };

  // Mở form tạo lịch mới, điền sẵn tên & SĐT từ hội thoại
  const openBooking = () => {
    setEditBkId(null);
    setBk({ name: conv.name || "", phone: conv.phone || "", service: "", branch: "", date: "", time: "", note: "" });
    setBkMsg(null);
    setShowBooking(true);
  };

  // Mở form sửa 1 lịch hẹn đã có
  const openEditBk = (b) => {
    setEditBkId(b.id);
    let date = "", time = "";
    if (b.date && /^\d{4}-\d{2}-\d{2}/.test(b.date)) {
      const [dd, tt] = b.date.split("T");
      date = dd;
      time = tt ? tt.slice(0, 5) : "";
    }
    setBk({
      name: b.name || "",
      phone: b.phone || "",
      service: b.service || "",
      branch: b.branch || "",
      date, time,
      note: (b.note || "").replace(/\s*\(tạo từ chat\)$/, "")
    });
    setBkMsg(null);
    setShowBooking(true);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!bk.name.trim() || !bk.phone.trim() || !bk.service) {
      setBkMsg({ type: "err", text: "Vui lòng nhập tên, số điện thoại và chọn dịch vụ/combo." });
      return;
    }
    setBkSaving(true);
    setBkMsg(null);
    const dateVal = bk.date ? (bk.time ? `${bk.date}T${bk.time}` : bk.date) : "";
    const d = bk.date.split("-");
    const dateText = d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : bk.date;
    const svcLabel = bk.service.replace(/^Combo:\s*/, "");
    const isEdit = !!editBkId;
    try {
      const payload = {
        name: bk.name.trim(),
        phone: bk.phone.trim(),
        service: bk.service,
        branch: bk.branch || "",
        date: dateVal,
        note: bk.note ? `${bk.note} (tạo từ chat)` : "Tạo từ chat tư vấn"
      };
      if (isEdit) await updateBooking(editBkId, payload);
      else await createBooking(payload);

      // Gửi tin xác nhận/cập nhật cho khách ngay trong chat (nếu bật)
      if (bkNotify && activeId) {
        const name = bk.name.trim();
        const title = isEdit ? "🔄 CẬP NHẬT LỊCH HẸN" : "✅ XÁC NHẬN LỊCH HẸN";
        const lines = [title, "━━━━━━━━━━━━━", `👤 Tên: ${name}`];
        if (bk.phone.trim()) lines.push(`📞 SĐT: ${bk.phone.trim()}`);
        if (bk.date) lines.push(`🗓️ Thời gian: ${dateText}${bk.time ? " lúc " + bk.time : ""}`);
        lines.push(`💆 Dịch vụ: ${svcLabel}`);
        if (bk.branch) lines.push(`📍 Cơ sở: ${bk.branch}`);
        lines.push("━━━━━━━━━━━━━");
        lines.push("Khi đến quý khách vui lòng cung cấp tên hoặc số điện thoại để được phục vụ nhanh nhất ạ.");
        lines.push(`Chúc ${name} thật nhiều sức khỏe & niềm vui. Hẹn gặp lại tại Bảo Trâm Spa! 🌸`);
        const updated = await replyConversation(activeId, { text: lines.join("\n") });
        setConv(updated);
      }
      setBkMsg({ type: "ok", text: isEdit ? "Đã cập nhật lịch hẹn!" : "Đã tạo lịch hẹn thành công!" });
      loadBookings();
      setTimeout(() => setShowBooking(false), 1400);
    } catch (err) {
      setBkMsg({ type: "err", text: err.response?.data?.error || "Lưu lịch thất bại, thử lại nhé." });
    } finally {
      setBkSaving(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending || !activeId) return;
    setSending(true);
    setText("");
    setSugOpen(false);
    try {
      const updated = await replyConversation(activeId, { text: t });
      setConv(updated);
      loadList();
    } catch { alert("Gửi thất bại, thử lại nhé."); setText(t); }
    finally { setSending(false); }
  };

  // Nhân viên gửi ảnh cho khách
  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !activeId) return;
    setSending(true);
    try {
      const image = await fileToResizedDataURL(file);
      const updated = await replyConversation(activeId, { image });
      setConv(updated);
      loadList();
    } catch { alert("Gửi ảnh thất bại, thử lại nhé."); }
    finally { setSending(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Xoá hội thoại này?")) return;
    try {
      await deleteConversation(id);
      if (activeId === id) { setActiveId(null); setConv(null); }
      loadList();
    } catch { alert("Xoá thất bại."); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Tin nhắn tư vấn {list.length > 0 && <span className="tag-pill">{list.length}</span>}</h2>
        <button className="btn-add" onClick={loadList}>⟳ Tải lại</button>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      <div className="chatmgr">
        {/* Danh sách hội thoại */}
        <div className="chatmgr-list">
          {list.length === 0 ? (
            <div className="admin-empty">Chưa có tin nhắn nào.</div>
          ) : (
            list.map((c) => (
              <button
                key={c.id}
                className={"chatmgr-item" + (c.id === activeId ? " active" : "")}
                onClick={() => open(c.id)}
              >
                <div className="ci-top">
                  <b>{c.name || "Khách"}</b>
                  {c.unreadAdmin > 0 && <span className="ci-badge">{c.unreadAdmin}</span>}
                </div>
                <div className="ci-sub">
                  {c.phone ? "📞 " + c.phone : "Chưa có SĐT"} · {fmt(c.lastMessageAt)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Khung hội thoại */}
        <div className="chatmgr-view">
          {!conv ? (
            <div className="admin-empty">Chọn một khách để xem & trả lời.</div>
          ) : (
            <>
              <div className="chatmgr-head">
                <div>
                  {editingName ? (
                    <input
                      className="name-edit"
                      autoFocus
                      value={nameDraft}
                      placeholder="Tên khách..."
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={saveName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                    />
                  ) : (
                    <b
                      onDoubleClick={startRename}
                      title="Nháy đúp để đổi tên khách"
                      style={{ cursor: "pointer" }}
                    >
                      {conv.name || "Khách"} ✎
                    </b>
                  )}
                  {conv.phone && <span> · 📞 {conv.phone}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-mini btn-book" onClick={openBooking}>📅 Tạo lịch</button>
                  <button className="btn-mini btn-del" onClick={() => remove(conv.id)}>Xoá</button>
                </div>
              </div>

              {/* Lịch hẹn sắp tới của khách (chỉ "Mới"; quá ngày tự huỷ) */}
              <div className="cust-bookings">
                {custBookings.length === 0 ? (
                  <span className="cb-empty">📋 Khách chưa có lịch hẹn sắp tới.</span>
                ) : (
                  <>
                    <div className="cb-title">📋 Lịch hẹn sắp tới: <b>{custBookings.length}</b></div>
                    <div className="cb-list">
                      {custBookings.map((b) => (
                        <div className="cb-row" key={b.id}>
                          <span className="run-pill on">MỚI</span>
                          <span className="cb-when">🗓 {fmtBk(b.date)}</span>
                          <span className="cb-svc" title={b.service}>{b.service}</span>
                          {b.branch && <span className="cb-branch" title={b.branch}>📍 {b.branch.split(":")[0]}</span>}
                          <button className="btn-mini btn-edit" onClick={() => openEditBk(b)}>Sửa</button>
                          <button className="btn-mini btn-stop" onClick={() => cancelBk(b)}>Hủy</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="chatmgr-body" ref={bodyRef}>
                {(conv.messages || []).map((m, i) => (
                  <div key={i} className={"cm-msg " + (m.from === "staff" ? "staff" : "user")}>
                    <div className="cm-bubble">
                      {m.image && (
                        <img
                          className="cm-img"
                          src={m.image}
                          alt="ảnh"
                          onClick={() => setLightbox(m.image)}
                        />
                      )}
                      {m.text && m.text.split("\n").map((line, j) => <div key={j}>{line}</div>)}
                      <span className="cm-time">{fmt(m.at)}</span>
                    </div>
                  </div>
                ))}
                {userTyping && <div className="cm-typing">Khách đang soạn tin...</div>}
              </div>

              {showQuick && (
                <div className="quick-replies">
                  {quickReplies.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      className="qr-chip"
                      title={q.text}
                      onClick={() => { setText(q.text); setShowQuick(false); }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="qr-suggest">
                  <div className="qr-suggest-hd">Gợi ý mẫu — bấm để chọn</div>
                  {suggestions.map((q, i) => (
                    <button key={i} type="button" className="qr-sug-item" onClick={() => pickSuggestion(q)}>
                      <b>{q.label}</b>
                      <span>{q.text.replace(/\n/g, " ")}</span>
                    </button>
                  ))}
                </div>
              )}

              <form className="chatmgr-input" onSubmit={send}>
                <button
                  type="button"
                  className="qr-toggle"
                  title="Tin nhắn nhanh"
                  onClick={() => setShowQuick((s) => !s)}
                >⚡</button>
                <label className="cm-attach" title="Gửi ảnh">
                  🖼️
                  <input type="file" accept="image/*" hidden onChange={onPickImage} disabled={sending} />
                </label>
                <input
                  value={text}
                  onChange={onType}
                  placeholder="Nhập câu trả lời cho khách..."
                />
                <button type="submit" disabled={sending}>Gửi</button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modal tạo lịch hẹn từ chat */}
      {showBooking && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submitBooking}>
            <div className="modal-head">
              <h3>{editBkId ? "✏️ Sửa lịch hẹn" : "📅 Tạo lịch hẹn cho khách"}</h3>
              <button type="button" onClick={() => setShowBooking(false)}>×</button>
            </div>
            <div className="modal-body">
              {bkMsg && <div className={"admin-msg " + bkMsg.type}>{bkMsg.text}</div>}
              <div className="fld">
                <label>Họ tên *</label>
                <input value={bk.name} onChange={(e) => setBk({ ...bk, name: e.target.value })} required />
              </div>
              <div className="fld">
                <label>Số điện thoại *</label>
                <input value={bk.phone} onChange={(e) => setBk({ ...bk, phone: e.target.value })} required />
              </div>
              <div className="fld">
                <label>Combo / Dịch vụ *</label>
                <select value={bk.service} onChange={(e) => setBk({ ...bk, service: e.target.value })} required>
                  <option value="">-- Chọn combo / dịch vụ --</option>
                  {opts.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Cơ sở</label>
                <select value={bk.branch} onChange={(e) => setBk({ ...bk, branch: e.target.value })}>
                  <option value="">-- Chọn cơ sở --</option>
                  {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="fld" style={{ flex: 1 }}>
                  <label>Ngày hẹn</label>
                  <input type="date" value={bk.date} onChange={(e) => setBk({ ...bk, date: e.target.value })} />
                </div>
                <div className="fld" style={{ flex: 1 }}>
                  <label>Giờ hẹn</label>
                  <input type="time" value={bk.time} onChange={(e) => setBk({ ...bk, time: e.target.value })} />
                </div>
              </div>
              <div className="fld">
                <label>Ghi chú</label>
                <textarea rows={2} value={bk.note} onChange={(e) => setBk({ ...bk, note: e.target.value })} placeholder="Ghi chú thêm (nếu có)..." />
              </div>
              <label className="fld-check">
                <input type="checkbox" checked={bkNotify} onChange={(e) => setBkNotify(e.target.checked)} />
                Gửi tin xác nhận cho khách trong chat
              </label>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-cancel" onClick={() => setShowBooking(false)}>Huỷ</button>
              <button type="submit" className="btn-save" disabled={bkSaving}>
                {bkSaving ? "Đang lưu..." : editBkId ? "Lưu thay đổi" : "Tạo lịch hẹn"}
              </button>
            </div>
          </form>
        </div>
      )}

      {lightbox && (
        <div className="img-lightbox" onClick={() => setLightbox(null)}>
          <button className="img-lightbox-x" aria-label="Đóng">×</button>
          <img src={lightbox} alt="ảnh" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
