import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCombos, getTestimonials, getServices, postBooking, getInfo } from "../api";
import { buildServiceOptions } from "../servicesData";
import {
  IcLeaf, IcHands, IcLotus, IcUsers, IcSpa, IcShield, IcPrice,
  IcCheckBadge, IcPhone, IcZalo, IcMessenger, IcMap
} from "../components/Icons.jsx";

const PHONE = "0327 322 722";

/* ---- Nội dung tĩnh khớp thiết kế (dùng khi backend chưa chạy) ---- */
const FALLBACK_COMBOS = [
  {
    id: "c1", badge: "HOT", name: "Combo gội đầu dưỡng sinh VIP",
    oldPrice: "199K", price: "99K",
    image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&q=80",
    items: ["Gội đầu thảo dược", "Massage cổ vai gáy", "Đắp mặt nạ dưỡng da", "Xông thảo dược"],
    gift: "Thư giãn 10 phút"
  },
  {
    id: "c2", badge: "BEST SELLER", best: true, name: "Combo chăm sóc da mặt chuyên sâu",
    oldPrice: "299K", price: "149K",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
    items: ["Làm sạch sâu", "Massage nâng cơ mặt", "Đắp mặt nạ cao cấp", "Chiếu ánh sáng sinh học"],
    gift: "Serum dưỡng da"
  },
  {
    id: "c3", badge: "HOT", name: "Combo massage body thư giãn",
    oldPrice: "399K", price: "199K",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80",
    items: ["Massage body toàn thân", "Tinh dầu thảo dược", "Giảm đau nhức, căng cơ", "Thư giãn, ngủ ngon hơn"],
    gift: "Giác hơi (vai gáy)"
  },
  {
    id: "c4", badge: "HOT", name: "Combo Foot dưỡng sinh",
    oldPrice: "179K", price: "89K",
    image: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=600&q=80",
    items: ["Ngâm chân thảo dược", "Massage foot chuyên sâu", "Kích thích huyệt đạo", "Giảm đau nhức, mỏi chân"],
    gift: "Chườm nóng"
  }
];

const FALLBACK_TESTI = [
  { id: "t1", name: "Minh Anh", loc: "Châu Thành, Bến Tre", rating: 5,
    img: "https://i.pravatar.cc/120?img=47",
    comment: "Gội đầu rất thư giãn, nhẹ đầu hẳn, ngủ ngon hơn. Sẽ quay lại thường xuyên!" },
  { id: "t2", name: "Thanh Trúc", loc: "Tam Phước, Bến Tre", rating: 5,
    img: "https://i.pravatar.cc/120?img=32",
    comment: "Da mặt sáng lên thấy rõ, nhân viên dễ thương, phục vụ chu đáo." },
  { id: "t3", name: "Kim Ngân", loc: "Tân Thạch, Bến Tre", rating: 5,
    img: "https://i.pravatar.cc/120?img=45",
    comment: "Massage body rất đã, hết đau mỏi vai gáy. Không gian đẹp và sạch sẽ." }
];

const FEATURES = [
  { Icon: IcLeaf, title: "Thảo dược tự nhiên", desc: "An toàn, lành tính cho mọi loại da" },
  { Icon: IcHands, title: "Kỹ thuật chuyên sâu", desc: "Đội ngũ kỹ thuật viên giàu kinh nghiệm" },
  { Icon: IcLotus, title: "Không gian thư giãn", desc: "Sang trọng, riêng tư, đầy đủ tiện nghi" },
  { Icon: IcUsers, title: "1000+ khách hàng", desc: "Tin tưởng & quay lại sử dụng dịch vụ" }
];

const WHY = [
  { Icon: IcSpa, text: "100% thảo dược thiên nhiên" },
  { Icon: IcHands, text: "Kỹ thuật viên tay nghề cao" },
  { Icon: IcShield, text: "Quy trình chuẩn an toàn - sạch sẽ" },
  { Icon: IcPrice, text: "Giá cả hợp lý nhiều ưu đãi" },
  { Icon: IcCheckBadge, text: "Bảo hành dịch vụ hậu mãi chu đáo" }
];

const BRANCHES = [
  { name: "CN4", addr: "Chợ Ba Lai, Tam Phước, Châu Thành (đối diện Điện Máy Anh Khoa)", map: "https://maps.app.goo.gl/VxTfSQREafcue9yx6" },
  { name: "CN5", addr: "Gần ngã tư huyện hướng ra vòng xoay An Khánh (kế bên Nhà xe Thịnh Phát)", map: "https://maps.app.goo.gl/xvvCsHFDBYuwBpQz9" }
];

const HERO_CHECKS = [
  "100% thảo dược thiên nhiên",
  "Kỹ thuật massage chuyên sâu",
  "Không gian thư giãn, riêng tư",
  "Đánh thức năng lượng cơ thể"
];

export default function Home() {
  const [combos, setCombos] = useState(FALLBACK_COMBOS);
  const [testi, setTesti] = useState(FALLBACK_TESTI);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", service: "", branch: "" });
  const [branches, setBranches] = useState([]);
  const [msg, setMsg] = useState(null);
  const [fbActive, setFbActive] = useState(0);
  const comboRef = useRef(null);
  const fbPausedRef = useRef(false);

  // Mặc định chọn avatar ở giữa cho đẹp
  useEffect(() => {
    if (testi.length) setFbActive(Math.floor(testi.length / 2));
  }, [testi.length]);

  // Tự động chạy qua từng đánh giá (dừng khi rê chuột vào)
  useEffect(() => {
    if (testi.length <= 1) return;
    const id = setInterval(() => {
      if (fbPausedRef.current) return;
      setFbActive((i) => (i + 1) % testi.length);
    }, 5000);
    return () => clearInterval(id);
  }, [testi.length]);

  useEffect(() => {
    getCombos().then((c) => { if (c && c.length) setCombos(c); }).catch(() => {});
    getTestimonials().then((t) => { if (t && t.length) setTesti(t); }).catch(() => {});
    getServices().then(setServices).catch(() => {});
    getInfo().then((d) => setBranches(Array.isArray(d?.branches) ? d.branches : [])).catch(() => {});
  }, []);

  // Có hơn 4 combo -> tự chạy qua lại (ping-pong); 4 trở xuống -> căn giữa
  const comboCarousel = combos.length > 4;
  useEffect(() => {
    if (!comboCarousel) return;
    const el = comboRef.current;
    if (!el) return;
    let dir = 1;
    let paused = false;
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    const id = setInterval(() => {
      if (paused) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if (el.scrollLeft >= max - 1) dir = -1;
      else if (el.scrollLeft <= 0) dir = 1;
      el.scrollLeft += dir * 1.2;
    }, 20);
    return () => {
      clearInterval(id);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [comboCarousel, combos.length]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await postBooking({ ...form, note: "Đăng ký từ trang chủ" });
      setMsg({ type: "success", text: res.message || "Đã gửi! Chúng tôi sẽ gọi lại trong 5 phút." });
      setForm({ name: "", phone: "", service: "", branch: "" });
    } catch {
      setMsg({ type: "success", text: "Cảm ơn bạn! Chúng tôi sẽ liên hệ tư vấn sớm nhất." });
      setForm({ name: "", phone: "", service: "", branch: "" });
    }
  };

  // Đánh giá đang hiển thị
  const fb = testi[fbActive] || testi[0] || {};

  return (
    <div>
      <Helmet>
        <title>Bảo Trâm Beauty Spa & Salon - Gội đầu dưỡng sinh tại Bến Tre</title>
        <meta name="description" content="Bảo Trâm Beauty Spa & Salon - Gội đầu dưỡng sinh thảo dược, massage, chăm sóc da, nail tại Châu Thành, Bến Tre. 3 chi nhánh - Đặt lịch online nhận voucher ưu đãi!" />
        <link rel="canonical" href="https://spabaotram.com/" />
        <meta property="og:url" content="https://spabaotram.com/" />
        <meta property="og:title" content="Bảo Trâm Beauty Spa & Salon - Tôn vinh vẻ đẹp tự nhiên" />
      </Helmet>
      {/* Floating contact */}
      <div className="floating">
        <a className="call" href={`tel:${PHONE.replace(/\s/g, "")}`} aria-label="Gọi điện đặt lịch"><IcPhone /></a>
        <a className="zalo" href="https://zalo.me/0327322722" target="_blank" rel="noreferrer"><IcZalo /></a>
        <a className="mess" href="https://m.me/spabaotram" target="_blank" rel="noreferrer"><IcMessenger /></a>
        <a className="map" href="#he-thong"><IcMap /></a>
      </div>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="container">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="a">GỘI ĐẦU </span><span className="b">DƯỠNG SINH</span>
            </div>
            <h1>Thư Giãn Tức Thì</h1>
            <div className="script">Giảm stress - Ngủ ngon - Nhẹ đầu</div>

            <ul className="hero-checklist">
              {HERO_CHECKS.map((c) => (
                <li key={c}><span className="ck">✓</span> {c}</li>
              ))}
            </ul>

            <div className="offer-box">
              <div>
                <div className="label">🎁 Ưu đãi hôm nay</div>
                <div className="from">Chỉ từ</div>
                <div className="price">99K</div>
              </div>
              <div className="divider" />
              <div>
                <div className="from">Mỗi ngày chỉ nhận</div>
                <div className="big">15 khách</div>
                <div className="note">Đặt lịch sớm để giữ ưu đãi</div>
              </div>
            </div>

            <div className="hero-actions">
              <Link to="/lien-he" className="btn btn-green">
                ĐẶT LỊCH NGAY
                <span className="small">Nhận ưu đãi ngay hôm nay</span>
              </Link>
              <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="btn btn-outline-green">
                📞 GỌI NGAY
                <span className="small">{PHONE}</span>
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-badge">Được yêu thích nhất</div>
            <img
              src="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=900&q=80"
              alt="Gội đầu dưỡng sinh"
              fetchpriority="high"
              decoding="async"
              width="900"
              height="600"
            />
          </div>
        </div>
      </section>

      {/* ===== FEATURE BAND ===== */}
      <section className="feature-band">
        <div className="container">
          <div className="grid">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div className="item" key={title}>
                <div className="ic"><Icon /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMBO ===== */}
      <section className="section bg-cream" id="combo">
        <div className="container">
          <div className="heading-center">
            <h2>Combo dịch vụ bán chạy</h2>
            <div className="sub">Lựa chọn thông minh - Tiết kiệm hơn</div>
          </div>

          <div
            className={comboCarousel ? "combo-carousel" : "combo-grid few"}
            ref={comboCarousel ? comboRef : null}
          >
            {combos.map((c) => (
              <div className="combo-card" key={c.id}>
                <div className="combo-media">
                  <img src={c.image} alt={c.name} loading="lazy" decoding="async" />
                  {c.badge && (
                    <span className={"combo-badge" + (c.best ? " best" : "")}>{c.badge}</span>
                  )}
                </div>
                <div className="combo-body">
                  <h3>{c.name}</h3>
                  <div className="combo-pricing">
                    {c.oldPrice && <span className="old">{c.oldPrice}</span>}
                    <span className="now">{c.price}</span>
                  </div>
                  {c.items && (
                    <ul className="combo-list">
                      {c.items.map((it) => <li key={it}>{it}</li>)}
                    </ul>
                  )}
                  {c.gift && (
                    <div className="combo-gift">🎁 <b>TẶNG:</b> {c.gift}</div>
                  )}
                  <Link to={`/lien-he?service=${encodeURIComponent(c.name)}`} className="btn btn-green btn-block">ĐẶT LỊCH NGAY</Link>
                </div>
              </div>
            ))}
          </div>

          <div className="combo-more">
            <Link to="/dich-vu" className="btn btn-outline-green">🎁 XEM THÊM COMBO ƯU ĐÃI</Link>
          </div>
        </div>
      </section>

      {/* ===== WHY ===== */}
      <section className="section why">
        <div className="container">
          <div className="heading-center">
            <h2>Vì sao chọn Bảo Trâm?</h2>
          </div>
          <div className="why-grid">
            {WHY.map(({ Icon, text }) => (
              <div className="why-item" key={text}>
                <div className="circle"><Icon /></div>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEEDBACK ===== */}
      <section className="section feedback" id="feedback">
        <div className="container">
          <div className="heading-center">
            <h2>Khách hàng nói gì về chúng tôi?</h2>
            <div className="sub">Cảm nhận thật từ khách hàng của Bảo Trâm</div>
          </div>

          {testi.length === 0 ? (
            <div className="testi-empty">Chưa có đánh giá nào.</div>
          ) : (
            <div
              className="fb-wrap"
              onMouseEnter={() => { fbPausedRef.current = true; }}
              onMouseLeave={() => { fbPausedRef.current = false; }}
            >
              <div className="fb-stage">
                <img className="fb-main" src={fb.img || `https://i.pravatar.cc/240?u=${fb.id}`} alt={fb.name} loading="lazy" decoding="async" />
                <div className="fb-info" key={fbActive}>
                  <div className="fb-stars">
                    {"★".repeat(Math.max(1, Math.min(5, fb.rating || 5)))}
                  </div>
                  <p className="fb-quote">“{fb.comment}”</p>
                  <div className="fb-name">{fb.name}</div>
                  <div className="fb-loc">{fb.loc || "Khách hàng"}</div>
                </div>
              </div>

              <div className="fb-thumbs">
                {testi.map((t, i) => (
                  <button
                    type="button"
                    key={t.id}
                    className={"fb-thumb" + (i === fbActive ? " on" : "")}
                    onClick={() => setFbActive(i)}
                    aria-label={t.name}
                  >
                    <img src={t.img || `https://i.pravatar.cc/120?u=${t.id}`} alt={t.name} loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== BOOKING ===== */}
      <section className="section booking-section">
        <div className="container">
          <div className="booking-card centered">
            <h3>Đặt lịch ngay - Nhận ưu đãi</h3>
            <p className="lead">Điền thông tin, chúng tôi sẽ liên hệ tư vấn cho bạn!</p>
            {msg && <div className={"booking-msg " + msg.type}>{msg.text}</div>}
            <form onSubmit={submit}>
              <input
                placeholder="Họ và tên của bạn"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                placeholder="Số điện thoại"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              <select
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              >
                <option value="">Chọn dịch vụ bạn quan tâm</option>
                {buildServiceOptions(services).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {branches.length > 0 && (
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                >
                  <option value="">Chọn cơ sở gần bạn</option>
                  {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
              <button type="submit" className="btn btn-gold">NHẬN TƯ VẤN NGAY</button>
            </form>
            <div className="booking-assure">
              <span>Cam kết gọi lại trong 5 phút</span>
              <span>Giữ ưu đãi trong ngày</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BRANCHES ===== */}
      <section className="section bg-cream" id="he-thong">
        <div className="container branches-grid">
          <div>
            <div className="branches-head">
              <h2>Hệ thống chi nhánh</h2>
              <p>Sẵn sàng phục vụ bạn tại nhiều địa điểm</p>
            </div>
            {BRANCHES.map((b) => (
              <div className="branch" key={b.name}>
                <h4><IcMap /> {b.name}</h4>
                <div className="addr">{b.addr}</div>
                <div className="row">
                  <a href={`tel:${PHONE.replace(/\s/g, "")}`}>📞 {PHONE}</a>
                  <a href={b.map} target="_blank" rel="noreferrer">📍 Chỉ đường</a>
                </div>
              </div>
            ))}
          </div>
          <div className="branch-map">
            <iframe
              title="Bản đồ Bảo Trâm Spa"
              src="https://www.google.com/maps?q=Ch%E1%BB%A3%20Ba%20Lai%2C%20Tam%20Ph%C6%B0%E1%BB%9Bc%2C%20Ch%C3%A2u%20Th%C3%A0nh%2C%20B%E1%BA%BFn%20Tre&output=embed"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
