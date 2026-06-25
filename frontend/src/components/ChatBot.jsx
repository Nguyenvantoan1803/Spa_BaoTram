import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInfo, getServices, getCombos, getChatSession, sendChatMessage, pingChatTyping } from "../api";
import { IcRobot } from "./Icons";
import { fileToResizedDataURL } from "../imageUtil";
import { track } from "../track";

/* Mã khách lưu ở trình duyệt để nhận lại đúng hội thoại với tư vấn viên */
function getVisitorId() {
  let id = localStorage.getItem("baotram_visitor_id");
  if (!id) {
    id = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("baotram_visitor_id", id);
  }
  return id;
}

/* Bỏ dấu tiếng Việt + viết thường để so khớp từ khoá dễ hơn */
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

/* Thông tin mặc định nếu chưa tải được từ server */
const FALLBACK = {
  name: "Bảo Trâm Beauty Spa & Salon",
  phone: "0327 322 722",
  workingHours: "08:00 - 21:00 (Thứ 2 - Chủ nhật)",
  branches: [
    "CN4: Chợ Ba Lai, Tam Phước, Châu Thành (đối diện Điện Máy Anh Khoa)",
    "CN5: Gần ngã tư huyện hướng ra vòng xoay An Khánh (kế bên Nhà xe Thịnh Phát)"
  ],
  socials: { zalo: "0327322722" }
};

const QUICK = [
  "Giờ mở cửa",
  "Bảng giá",
  "Địa chỉ",
  "Dịch vụ",
  "Đặt lịch",
  "Liên hệ"
];

/* Hiệu ứng gõ chữ: hiện text ra từng ký tự một */
function Typed({ text, speed = 20, onTick, onDone }) {
  const [n, setN] = useState(0);
  const chars = Array.from(text); // tách theo code-point để không vỡ emoji
  const total = chars.length;
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      onTick && onTick();
      if (i >= total) {
        clearInterval(id);
        onDone && onDone();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text]); // eslint-disable-line
  const shown = chars.slice(0, n).join("");
  return (
    <>
      {shown.split("\n").map((line, j) => (
        <div key={j}>{line || " "}</div>
      ))}
      {n < total && <span className="type-caret">▍</span>}
    </>
  );
}

/* Bong bóng câu trả lời của bot: gõ chữ xong mới hiện nút hành động */
function BotBubble({ m, onTick, nav, setOpen }) {
  const [done, setDone] = useState(false);
  return (
    <div className="bubble">
      <Typed
        text={m.text}
        onTick={onTick}
        onDone={() => { setDone(true); onTick && onTick(); }}
      />
      {done && m.combos && m.combos.length > 0 && (
        <div className="chat-combos">
          {m.combos.map((c, i) => (
            <div key={c.id || i} className="chat-combo">
              {c.image && <img src={c.image} alt={c.name} loading="lazy" />}
              <div className="cc-body">
                <div className="cc-name">{c.name}</div>
                <div className="cc-price">
                  <b>{c.price}</b>
                  {c.oldPrice && <s>{c.oldPrice}</s>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {done && m.actions && (
        <div className="chat-actions">
          {m.actions.map((a, k) => (
            <button key={k} onClick={() => { nav(a.to); setOpen(false); }}>
              {a.label} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatBot() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(FALLBACK);
  const [services, setServices] = useState([]);
  const [combos, setCombos] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hint, setHint] = useState(false);
  // Chế độ: "bot" (trợ lý tự động) hoặc "live" (chat với tư vấn viên thật)
  const [mode, setMode] = useState("bot");
  const [liveMsgs, setLiveMsgs] = useState([]);
  const [lead, setLead] = useState({ name: "", phone: "" });
  const [staffTyping, setStaffTyping] = useState(false);
  const [lightbox, setLightbox] = useState(null); // ảnh đang xem phóng to
  // Bước thu thập thông tin trước khi chat: "name" -> "phone" -> "chat"
  const [leadStep, setLeadStep] = useState("name");
  const [preChat, setPreChat] = useState([]); // hội thoại hỏi tên/SĐT (chỉ hiện ở máy khách)
  const visitorRef = useRef(null);
  const lastTypingRef = useRef(0);
  const leadInitRef = useRef(false);
  const [msgs, setMsgs] = useState([
    {
      from: "bot",
      text:
        "Xin chào! 👋 Mình là trợ lý của Bảo Trâm Spa. Bạn cần hỏi về giờ mở cửa, bảng giá, dịch vụ hay đặt lịch ạ?"
    }
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    getInfo().then((d) => d && setInfo({ ...FALLBACK, ...d })).catch(() => {});
    getServices().then((d) => Array.isArray(d) && setServices(d)).catch(() => {});
    getCombos().then((d) => Array.isArray(d) && setCombos(d)).catch(() => {});
    // Hiện lời mời sau 1.5s để thu hút khách
    const t = setTimeout(() => setHint(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const scrollBottom = () => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  };

  // Tự cuộn xuống tin mới nhất
  useEffect(() => { scrollBottom(); }, [msgs, liveMsgs, open, typing, mode]);

  // Khi đang chat với tư vấn viên: hỏi server vài giây/lần để nhận tin nhân viên trả lời
  useEffect(() => {
    if (mode !== "live" || leadStep !== "chat" || !open) return;
    const vid = visitorRef.current;
    if (!vid) return;
    let stop = false;
    const poll = async () => {
      try {
        const conv = await getChatSession(vid);
        if (!stop && conv && Array.isArray(conv.messages)) {
          setLiveMsgs(conv.messages);
          setStaffTyping(!!conv.staffTyping);
        }
      } catch { /* bỏ qua lỗi mạng tạm thời */ }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => { stop = true; clearInterval(id); };
  }, [mode, leadStep, open]);

  /* Chuyển sang chế độ gặp tư vấn viên + bắt đầu hỏi tên/SĐT */
  function startLive() {
    if (!visitorRef.current) visitorRef.current = getVisitorId();
    setMode("live");
    if (leadInitRef.current) return; // đã khởi tạo trong phiên này
    leadInitRef.current = true;

    // Ngoài giờ làm việc 8:00 - 21:00 -> báo cho khách
    const h = new Date().getHours();
    const offHours = h < 8 || h >= 21;
    const offMsg = {
      from: "bot",
      text:
        "🕗 Hiện đã ngoài giờ làm việc (8:00 - 21:00).\nBạn cứ để lại tin nhắn và số điện thoại, nhân viên sẽ liên hệ lại với bạn sớm nhất ạ. Cảm ơn bạn! 🌸"
    };

    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("baotram_chat_lead") || "null"); } catch {}
    if (saved && saved.name) {
      // Khách cũ: bỏ qua bước hỏi, vào chat luôn
      setLead(saved);
      setLeadStep("chat");
      setPreChat([
        { from: "bot", text: `Chào ${saved.name} 👋 Mình là tư vấn viên Bảo Trâm. Bạn cần hỗ trợ gì ạ?` },
        ...(offHours ? [offMsg] : [])
      ]);
    } else {
      setLeadStep("name");
      setPreChat([
        { from: "bot", text: "Chào bạn 👋 Mình là tư vấn viên Bảo Trâm.\nTrước tiên bạn vui lòng cho mình biết tên của bạn với nhé 😊" },
        ...(offHours ? [offMsg] : [])
      ]);
    }
  }

  /* Báo cho server biết khách đang gõ (chỉ khi đã vào chat thật) */
  function handleInput(e) {
    const v = e.target.value;
    setInput(v);
    if (mode === "live" && leadStep === "chat" && v.trim() && visitorRef.current) {
      const now = Date.now();
      if (now - lastTypingRef.current > 2500) {
        lastTypingRef.current = now;
        pingChatTyping(visitorRef.current).catch(() => {});
      }
    }
  }

  /* Xử lý tin nhắn trong chế độ tư vấn viên:
     - bước "name": lưu tên rồi hỏi số điện thoại
     - bước "phone": lưu SĐT rồi mở chat
     - bước "chat": gửi tin nhắn lên server cho nhân viên */
  async function sendLive(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");

    if (leadStep === "name") {
      setLead((l) => ({ ...l, name: q }));
      setPreChat((p) => [
        ...p,
        { from: "user", text: q },
        { from: "bot", text: `Cảm ơn ${q}! Bạn cho mình xin số điện thoại để tiện liên hệ nhé (nếu tiện).\nHoặc bạn cứ nhắn câu hỏi, mình hỗ trợ ngay ạ 🌸` }
      ]);
      setLeadStep("chat");
      try {
        localStorage.setItem("baotram_chat_lead", JSON.stringify({ name: q }));
      } catch { /* localStorage có thể bị chặn */ }
      return;
    }

    // Đã vào chat thật -> gửi lên server
    setLiveMsgs((m) => [...m, { from: "user", text: q }]);
    // Nếu khách chưa cho SĐT mà tin nhắn này nhìn giống số điện thoại -> tự lưu lại
    let phone = lead.phone;
    if (!phone) {
      const digits = q.replace(/[^\d+]/g, "");
      if (/^\+?\d{8,12}$/.test(digits)) {
        phone = digits;
        setLead((l) => ({ ...l, phone: digits }));
        try {
          localStorage.setItem("baotram_chat_lead", JSON.stringify({ name: lead.name, phone: digits }));
        } catch { /* bỏ qua */ }
      }
    }
    try {
      const conv = await sendChatMessage(visitorRef.current, {
        text: q,
        name: lead.name || undefined,
        phone: phone || undefined
      });
      if (conv && Array.isArray(conv.messages)) setLiveMsgs(conv.messages);
    } catch {
      setLiveMsgs((m) => [
        ...m,
        { from: "staff", text: "Gửi tin nhắn thất bại, bạn thử lại giúp nhé 🙏" }
      ]);
    }
  }

  /* Sinh câu trả lời theo từ khoá */
  function answer(raw) {
    const t = norm(raw);
    const has = (...kw) => kw.some((k) => t.includes(norm(k)));

    if (has("xin chao", "hello", "hi", "chao", "alo"))
      return { text: `Chào bạn! Mình có thể giúp gì cho bạn về ${info.name}? 😊` };

    if (has("gio mo cua", "gio lam", "may gio", "mo cua", "dong cua", "gio giac"))
      return { text: `🕗 Spa mở cửa: ${info.workingHours}. Bạn ghé bất cứ lúc nào trong khung giờ này nhé!` };

    if (has("gia", "bang gia", "bao nhieu tien", "chi phi", "phi", "combo"))
      return {
        text: combos.length
          ? "💰 Các combo ưu đãi hot nhất của Bảo Trâm nè bạn ơi:"
          : "💰 Giá tuỳ theo dịch vụ (gội đầu dưỡng sinh từ 60.000đ). Bạn xem chi tiết trong trang Dịch vụ nhé.",
        combos: combos.slice(0, 4),
        actions: [
          { label: "Xem tất cả dịch vụ", to: "/dich-vu" },
          { label: "Đặt lịch ngay", to: "/lien-he" }
        ]
      };

    if (has("dia chi", "o dau", "chi nhanh", "duong di", "noi nao", "ban do"))
      return {
        text:
          "📍 Các chi nhánh của tụi mình:\n• " + (info.branches || []).join("\n• ")
      };

    if (has("dich vu", "lam gi", "co nhung", "goi dau", "massage", "cham soc"))
      return {
        text:
          "💆‍♀️ Một số dịch vụ chính: " +
          (services.length
            ? services.map((s) => s.name).slice(0, 6).join(", ")
            : "Gội đầu dưỡng sinh, chăm sóc da, massage thư giãn") +
          ". Xem đầy đủ ở trang Dịch vụ nha.",
        actions: [{ label: "Xem dịch vụ", to: "/dich-vu" }]
      };

    if (has("dat lich", "dat hen", "booking", "hen lich", "dang ky"))
      return {
        text:
          "📅 Bạn đặt lịch nhanh ở trang Liên hệ: chỉ cần điền họ tên, số điện thoại và chọn dịch vụ. Tụi mình sẽ gọi xác nhận sớm nhất!",
        actions: [{ label: "Đặt lịch ngay", to: "/lien-he" }]
      };

    if (has("lien he", "so dien thoai", "sdt", "goi", "hotline", "zalo", "email", "facebook"))
      return {
        text: `📞 Hotline/Zalo: ${info.phone}\n✉️ Email: ${info.email || "—"}\nBạn bấm gọi hoặc nhắn Zalo để được tư vấn nhanh nhé!`,
        actions: [{ label: "Trang liên hệ", to: "/lien-he" }]
      };

    if (has("san pham", "my pham", "mua"))
      return {
        text: "🛍️ Tụi mình có bán mỹ phẩm, sản phẩm chăm sóc chính hãng. Xem ở trang Sản phẩm nhé.",
        actions: [{ label: "Xem sản phẩm", to: "/san-pham" }]
      };

    if (has("dao tao", "hoc", "khoa hoc", "day nghe"))
      return {
        text: "🎓 Bảo Trâm có các khoá đào tạo nghề spa/làm đẹp. Xem chi tiết ở trang Đào tạo.",
        actions: [{ label: "Xem đào tạo", to: "/dao-tao" }]
      };

    if (has("cam on", "thanks", "thank", "ok", "tot"))
      return { text: "Dạ không có gì! Chúc bạn một ngày thật đẹp 🌸" };

    if (has("tam biet", "bye", "chao tam biet"))
      return { text: "Tạm biệt bạn, hẹn gặp lại tại Bảo Trâm Spa! 👋" };

    // Không khớp
    return {
      text:
        "Xin lỗi, mình chưa hiểu rõ câu hỏi 😅. Bạn thử chọn nhanh bên dưới, hoặc gọi hotline " +
        info.phone +
        " để được tư vấn trực tiếp nhé!"
    };
  }

  /* Gửi ảnh cho tư vấn viên */
  async function sendImage(image) {
    setLiveMsgs((m) => [...m, { from: "user", image }]);
    try {
      const conv = await sendChatMessage(visitorRef.current, {
        image,
        name: lead.name || undefined,
        phone: lead.phone || undefined
      });
      if (conv && Array.isArray(conv.messages)) setLiveMsgs(conv.messages);
    } catch {
      setLiveMsgs((m) => [
        ...m,
        { from: "staff", text: "Gửi ảnh thất bại, bạn thử lại giúp nhé 🙏" }
      ]);
    }
  }

  /* Khách chọn ảnh từ máy -> nén rồi gửi (chỉ khi đã vào chat thật) */
  async function onPickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // reset để chọn lại cùng 1 ảnh vẫn được
    if (!file || leadStep !== "chat") return;
    try {
      const dataUrl = await fileToResizedDataURL(file);
      sendImage(dataUrl);
    } catch { /* ảnh lỗi - bỏ qua */ }
  }

  function send(text) {
    if (mode === "live") { sendLive(text); return; }
    const q = (text ?? input).trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { from: "user", text: q }]);
    setInput("");
    setTyping(true);
    const reply = answer(q);
    // Giả lập thời gian "đang gõ" cho tự nhiên
    const delay = 500 + Math.min(900, q.length * 25);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: "bot", ...reply }]);
    }, delay);
  }

  return (
    <>
      {!open && hint && (
        <div className="chat-hint" onClick={() => { setOpen(true); setHint(false); track("chat"); }}>
          <Typed text="Tôi có thể giúp gì cho bạn? 😊" speed={45} />
          <button
            className="chat-hint-x"
            aria-label="Đóng"
            onClick={(e) => { e.stopPropagation(); setHint(false); }}
          >×</button>
        </div>
      )}

      <button
        className={"chat-fab" + (open ? " hidden" : "")}
        onClick={() => { setOpen(true); setHint(false); track("chat"); }}
        aria-label="Mở chat tư vấn"
      >
        <IcRobot width={30} height={30} />
      </button>

      <div className={"chat-panel" + (open ? " open" : "")}>
        <div className="chat-head">
          <div className="chat-head-info">
            {mode === "live" && (
              <button
                className="chat-back"
                onClick={() => setMode("bot")}
                aria-label="Quay lại trợ lý"
              >‹</button>
            )}
            <div>
              <b>{mode === "live" ? "Tư vấn viên Bảo Trâm" : "Trợ lý Bảo Trâm"}</b>
              <span>{mode === "live" ? "Nhân viên sẽ trả lời sớm nhất" : "Thường trả lời ngay"}</span>
            </div>
          </div>
          <button className="chat-close" onClick={() => setOpen(false)} aria-label="Đóng">×</button>
        </div>

        <div className="chat-body" ref={bodyRef}>
          {mode === "bot" ? (
            <>
              {msgs.map((m, i) => (
                <div key={i} className={"chat-msg " + m.from}>
                  {m.from === "bot" ? (
                    <BotBubble m={m} onTick={scrollBottom} nav={nav} setOpen={setOpen} />
                  ) : (
                    <div className="bubble">
                      {m.text.split("\n").map((line, j) => (
                        <div key={j}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div className="chat-msg bot">
                  <div className="bubble typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {preChat.map((m, i) => (
                <div key={"p" + i} className={"chat-msg " + (m.from === "user" ? "user" : "bot")}>
                  <div className="bubble">
                    {m.text.split("\n").map((line, j) => (
                      <div key={j}>{line}</div>
                    ))}
                  </div>
                </div>
              ))}
              {leadStep === "chat" && liveMsgs.map((m, i) => (
                <div key={i} className={"chat-msg " + (m.from === "user" ? "user" : "bot")}>
                  <div className="bubble">
                    {m.image && (
                      <img
                        className="chat-img"
                        src={m.image}
                        alt="ảnh"
                        onLoad={scrollBottom}
                        onClick={() => setLightbox(m.image)}
                      />
                    )}
                    {m.text && m.text.split("\n").map((line, j) => (
                      <div key={j}>{line}</div>
                    ))}
                  </div>
                </div>
              ))}
              {staffTyping && (
                <div className="chat-msg bot">
                  <div className="bubble typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {mode === "bot" && (
          <button className="chat-tovan" onClick={startLive}>
            👩‍💼 Gặp tư vấn viên trực tiếp
          </button>
        )}

        {mode === "bot" && (
          <div className="chat-quick">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        )}

        <form
          className="chat-input"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          {mode === "live" && leadStep === "chat" && (
            <label className="chat-attach" title="Gửi ảnh">
              🖼️
              <input type="file" accept="image/*" hidden onChange={onPickImage} />
            </label>
          )}
          <input
            value={input}
            onChange={handleInput}
            placeholder={
              mode !== "live"
                ? "Nhập câu hỏi..."
                : leadStep === "name"
                ? "Nhập tên của bạn..."
                : "Nhắn cho tư vấn viên..."
            }
          />
          <button type="submit" aria-label="Gửi">➤</button>
        </form>
      </div>

      {lightbox && (
        <div className="img-lightbox" onClick={() => setLightbox(null)}>
          <button className="img-lightbox-x" aria-label="Đóng">×</button>
          <img src={lightbox} alt="ảnh" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
