require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const sanitizeHtml = require("sanitize-html");
const rateLimit = require("express-rate-limit");

const connectDB = require("./db");
const { login, requireAuth } = require("./auth");
const { validate, rules } = require("./validators");
const {
  sendBookingMail, sendContactMail, sendReminderMail, sendBirthdayMail, sendReviewRequestMail, sendPromoMail
} = require("./mailer");
const {
  Service,
  Combo,
  Product,
  News,
  Training,
  Testimonial,
  Info,
  Booking,
  Contact,
  Conversation,
  Event,
  Customer,
  Voucher,
  Staff,
  Review,
  ScheduledSend,
  Campaign
} = require("./models");

// ====== Kiem tra env BAT BUOC khi start ======
const REQUIRED_ENVS = ["MONGODB_URI", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "JWT_SECRET"];
const missingEnvs = REQUIRED_ENVS.filter((k) => !process.env[k]);
if (missingEnvs.length) {
  console.error("❌ Thieu env bat buoc:", missingEnvs.join(", "));
  console.error("   Vui long copy backend/.env.example thanh backend/.env va dien day du.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// HTTPS enforcement (chi bat khi deploy production sau proxy)
if (IS_PROD && process.env.FORCE_HTTPS === "true") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, "https://" + req.headers.host + req.url);
    }
    next();
  });
}

// Middleware bao mat: them cac HTTP header an toan
app.use(helmet({
  contentSecurityPolicy: false,                // API JSON - frontend chay rieng
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Compression (gzip) - giam ~70% kich thuoc response
app.use(compression());

// CORS - BAT BUOC khai bao CLIENT_ORIGIN trong production
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
if (IS_PROD && !CLIENT_ORIGIN) {
  console.error("❌ Production BAT BUOC khai bao CLIENT_ORIGIN trong .env");
  process.exit(1);
}
const allowedOrigins = CLIENT_ORIGIN ? CLIENT_ORIGIN.split(",").map((s) => s.trim()) : [];

// Địa chỉ website công khai (để dựng link đánh giá gửi cho khách)
const SITE_URL = (process.env.SITE_URL || allowedOrigins[0] || "http://localhost:3000").replace(/\/$/, "");
const reviewLink = (id) => `${SITE_URL}/danh-gia/${id}`;
app.use(cors({
  origin: (origin, cb) => {
    // Khong co origin = same-origin / curl / mobile app -> cho phep
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);    // dev
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// Body parser - chia 2 muc:
// + 200kb cho hau het route (chong DoS)
// + 6mb cho route chat upload anh
app.use(express.json({ limit: "200kb" }));
const chatBodyParser = express.json({ limit: "6mb" });

app.use(morgan(IS_PROD ? "combined" : "dev"));

// Trust proxy - dung cho proxy (Cloudflare, Nginx, ngrok)
// Lay tu env de an toan, mac dinh 0 (khong tin)
const trustProxy = parseInt(process.env.TRUST_PROXY || "0", 10);
if (trustProxy > 0) app.set("trust proxy", trustProxy);

/* ---------- Chống lạm dụng (rate limit) ---------- */
// Đăng nhập admin: chặn dò mật khẩu (brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Bạn thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại." }
});
// Các form công khai (đặt lịch, liên hệ): chặn spam
const publicWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." }
});
// Chat: nới rộng hơn vì một cuộc trò chuyện có thể gửi nhiều tin
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Bạn gửi tin quá nhanh. Vui lòng thử lại sau ít phút." }
});
// Track event (visit/click) - tranh spam fake stats
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// Helper: lam sach HTML/script trong text khach gui (chong XSS)
const cleanText = (text) =>
  sanitizeHtml(String(text || ""), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard"
  });

// Helper bắt lỗi async
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Lỗi máy chủ" });
  });

// Web công khai chỉ lấy mục đang bật; admin truyền ?all=1 để lấy tất cả
const activeFilter = (req) => (req.query.all ? {} : { active: { $ne: false } });

// --- Health check ---
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Bao Tram Spa API (MongoDB)" });
});

// --- Thông tin doanh nghiệp ---
app.get(
  "/api/info",
  wrap(async (req, res) => {
    const info = await Info.findOne();
    res.json(info || {});
  })
);

// --- Dịch vụ ---
app.get(
  "/api/services",
  wrap(async (req, res) => {
    res.json(await Service.find(activeFilter(req)));
  })
);

app.get(
  "/api/services/:id",
  wrap(async (req, res) => {
    const service = await Service.findOne({ id: req.params.id });
    if (!service) return res.status(404).json({ error: "Không tìm thấy dịch vụ" });
    res.json(service);
  })
);

// --- Combo ---
app.get(
  "/api/combos",
  wrap(async (req, res) => {
    res.json(await Combo.find(activeFilter(req)));
  })
);

// --- Sản phẩm ---
app.get(
  "/api/products",
  wrap(async (req, res) => {
    res.json(await Product.find(activeFilter(req)));
  })
);

// --- Tin tức ---
app.get(
  "/api/news",
  wrap(async (req, res) => {
    res.json(await News.find(activeFilter(req)).sort({ date: -1 }));
  })
);

app.get(
  "/api/news/:id",
  wrap(async (req, res) => {
    const item = await News.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    res.json(item);
  })
);

// --- Đào tạo ---
app.get(
  "/api/trainings",
  wrap(async (req, res) => {
    res.json(await Training.find(activeFilter(req)));
  })
);

// --- Đánh giá khách hàng ---
app.get(
  "/api/testimonials",
  wrap(async (req, res) => {
    res.json(await Testimonial.find(activeFilter(req)));
  })
);

// --- Đặt lịch ---
app.post(
  "/api/booking",
  publicWriteLimiter,
  rules.booking,
  validate,
  wrap(async (req, res) => {
    const { name, phone, service, branch, date, note, staff } = req.body;
    const booking = await Booking.create({ name, phone, service, branch, date, note, staff });
    // Tự tạo hồ sơ khách hàng theo SĐT (nếu chưa có) để nhân viên bổ sung sau
    if (phone) {
      const existed = await Customer.findOne({ phone });
      if (!existed) await Customer.create({ name, phone });
      else if (!existed.name && name) { existed.name = name; await existed.save(); }
    }
    // Gửi email thông báo cho chủ spa (không chặn phản hồi nếu lỗi)
    sendBookingMail(booking).catch(() => {});
    res.status(201).json({
      message: "Đặt lịch thành công! Bảo Trâm Spa sẽ liên hệ với bạn sớm nhất.",
      booking
    });
  })
);

app.get(
  "/api/booking",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await Booking.find().sort({ createdAt: -1 }));
  })
);

// --- Liên hệ ---
app.post(
  "/api/contact",
  publicWriteLimiter,
  rules.contact,
  validate,
  wrap(async (req, res) => {
    const { name, email, phone, message } = req.body;
    const entry = await Contact.create({ name, email, phone, message });
    sendContactMail(entry).catch(() => {});
    res.status(201).json({
      message: "Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.",
      entry
    });
  })
);

/* ---------- Đánh giá sau dịch vụ (công khai qua link) ---------- */
// Lấy thông tin tối thiểu để hiển thị trang đánh giá
app.get(
  "/api/review/:bookingId",
  wrap(async (req, res) => {
    const b = await Booking.findById(req.params.bookingId).catch(() => null);
    if (!b) return res.status(404).json({ error: "Không tìm thấy lịch hẹn" });
    res.json({
      name: b.name, service: b.service, staff: b.staff || "",
      alreadyReviewed: !!b.reviewedAt
    });
  })
);

// Khách gửi đánh giá; rating cao (>=4) tự đẩy lên Testimonials
app.post(
  "/api/review/:bookingId",
  publicWriteLimiter,
  wrap(async (req, res) => {
    const b = await Booking.findById(req.params.bookingId).catch(() => null);
    if (!b) return res.status(404).json({ error: "Không tìm thấy lịch hẹn" });
    if (b.reviewedAt) return res.status(409).json({ error: "Lịch này đã được đánh giá. Cảm ơn bạn!" });

    const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 5));
    const comment = cleanText(req.body.comment || "").slice(0, 1000);
    const published = rating >= 4;

    await Review.create({
      bookingId: String(b._id), name: b.name, phone: b.phone,
      service: b.service, staff: b.staff || "", rating, comment, published
    });

    // Đánh giá tốt -> tự tạo Testimonial hiển thị trên web
    if (published) {
      await Testimonial.create({
        id: genId(), name: b.name || "Khách hàng", rating,
        comment: comment || "Dịch vụ rất tốt!", loc: b.branch || "", active: true
      });
    }

    b.reviewedAt = new Date();
    await b.save();
    res.status(201).json({
      message: published
        ? "Cảm ơn đánh giá của bạn! Chúc bạn nhiều niềm vui ❤️"
        : "Cảm ơn phản hồi của bạn! Chúng tôi sẽ cải thiện để phục vụ tốt hơn."
    });
  })
);

/* =========================================================
   ========   THỐNG KÊ TRUY CẬP & TƯƠNG TÁC   ============
   ========================================================= */

const EVENT_TYPES = ["visit", "call", "zalo", "messenger", "chat"];

// Ngày theo giờ Việt Nam (UTC+7) dạng YYYY-MM-DD
const vnDay = (d = new Date()) =>
  new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/* ===== Helper: tích điểm, hạng thành viên & sinh nhật ===== */
// Hạng xếp từ cao xuống thấp theo tổng chi tiêu (đồng)
const TIERS = [
  { key: "kim_cuong", label: "Kim cương", min: 10000000 },
  { key: "vang", label: "Vàng", min: 5000000 },
  { key: "bac", label: "Bạc", min: 2000000 },
  { key: "moi", label: "Thành viên", min: 0 }
];
const tierOf = (totalSpent = 0) =>
  TIERS.find((t) => (totalSpent || 0) >= t.min) || TIERS[TIERS.length - 1];
const pointsFor = (amount = 0) => Math.max(0, Math.floor((amount || 0) / 1000)); // 1.000đ = 1 điểm

// Lấy phần ngày "YYYY-MM-DD" từ chuỗi date của booking (bỏ giờ)
const bkDateKey = (v) => {
  if (!v || typeof v !== "string") return "";
  const m = v.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
};
// "MM-DD" hôm nay theo giờ VN
const vnMonthDay = () => vnDay().slice(5);
// Lấy "MM-DD" từ chuỗi sinh nhật ("YYYY-MM-DD" hoặc "DD/MM/YYYY")
const birthdayMD = (s) => {
  if (!s || typeof s !== "string") return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}-${m[3]}`;
  const m2 = s.match(/^(\d{1,2})[/-](\d{1,2})/); // DD/MM
  if (m2) return `${String(m2[2]).padStart(2, "0")}-${String(m2[1]).padStart(2, "0")}`;
  return "";
};

const TIER_MAP = Object.fromEntries(TIERS.map((t) => [t.key, t]));
// Gắn hạng vào object khách: ưu tiên hạng đặt tay (tier), nếu không có thì tính theo chi tiêu
const withTier = (c) => {
  const obj = typeof c.toJSON === "function" ? c.toJSON() : c;
  const t = (obj.tier && TIER_MAP[obj.tier]) ? TIER_MAP[obj.tier] : tierOf(obj.totalSpent);
  return { ...obj, tier: t.key, tierLabel: t.label };
};

// Ghi nhận 1 sự kiện (công khai, gọi từ website)
app.post(
  "/api/track",
  trackLimiter,
  wrap(async (req, res) => {
    const type = String(req.body.type || "");
    if (!EVENT_TYPES.includes(type)) {
      return res.status(400).json({ error: "Loại sự kiện không hợp lệ" });
    }
    await Event.create({ type, day: vnDay() });
    res.status(201).json({ ok: true });
  })
);

/* =========================================================
   ====   CHAT TRỰC TIẾP VỚI TƯ VẤN VIÊN (công khai)   ====
   ========================================================= */

// Coi như "đang gõ" nếu ping cách đây dưới 6 giây
const TYPING_MS = 6000;
const isFresh = (d) => d && Date.now() - new Date(d).getTime() < TYPING_MS;

// Chỉ nhận ảnh hợp lệ (data URL, dưới ~6MB) để bảo vệ cơ sở dữ liệu
const cleanImage = (img) =>
  typeof img === "string" && img.startsWith("data:image/") && img.length < 6_000_000
    ? img
    : "";

// Khách lấy lại hội thoại của mình (poll vài giây/lần)
app.get(
  "/api/chat/session/:visitorId",
  wrap(async (req, res) => {
    const conv = await Conversation.findOne({ visitorId: req.params.visitorId });
    if (!conv) return res.json({ messages: [], staffTyping: false });
    const obj = conv.toJSON();
    obj.staffTyping = isFresh(conv.staffTypingAt);
    res.json(obj);
  })
);

// Khách báo đang gõ
app.post(
  "/api/chat/session/:visitorId/typing",
  wrap(async (req, res) => {
    await Conversation.updateOne(
      { visitorId: req.params.visitorId },
      { userTypingAt: new Date() }
    );
    res.json({ ok: true });
  })
);

// Khách gửi tin nhắn (tạo hội thoại nếu chưa có)
// chatBodyParser dung de cho phep upload anh 6MB (cao hon default 200KB)
app.post(
  "/api/chat/session/:visitorId",
  chatBodyParser,
  chatLimiter,
  wrap(async (req, res) => {
    const { visitorId } = req.params;
    const text = cleanText(req.body.text).trim().slice(0, 2000);
    const image = cleanImage(req.body.image);
    if (!text && !image) return res.status(400).json({ error: "Tin nhắn trống" });

    let conv = await Conversation.findOne({ visitorId });
    if (!conv) conv = new Conversation({ visitorId, messages: [] });

    // Cập nhật tên/sđt nếu khách cung cấp (sanitize chong XSS)
    if (req.body.name) conv.name = cleanText(req.body.name).slice(0, 80);
    if (req.body.phone) conv.phone = cleanText(req.body.phone).slice(0, 30);

    conv.messages.push({ from: "user", text, image });
    conv.lastMessageAt = new Date();
    conv.unreadAdmin = (conv.unreadAdmin || 0) + 1;
    conv.userTypingAt = null;
    await conv.save();

    res.status(201).json(conv);
  })
);

/* =========================================================
   ============   PHẦN ADMIN (có đăng nhập)   ==============
   ========================================================= */

// --- Đăng nhập admin -> trả token ---
app.post("/api/admin/login", loginLimiter, rules.login, validate, login);

// Sinh id ngẫu nhiên nếu client không gửi
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Tạo nhanh các route CRUD (create / update / delete) cho 1 model theo trường "id"
function crud(path, Model) {
  // Tạo mới
  app.post(
    `/api/${path}`,
    requireAuth,
    wrap(async (req, res) => {
      const data = { ...req.body };
      if (!data.id) data.id = genId();
      const exists = await Model.findOne({ id: data.id });
      if (exists) return res.status(409).json({ error: "ID đã tồn tại" });
      const doc = await Model.create(data);
      res.status(201).json(doc);
    })
  );

  // Cập nhật theo id
  app.put(
    `/api/${path}/:id`,
    requireAuth,
    wrap(async (req, res) => {
      const data = { ...req.body };
      delete data.id; // không cho đổi id
      const doc = await Model.findOneAndUpdate({ id: req.params.id }, data, {
        new: true
      });
      if (!doc) return res.status(404).json({ error: "Không tìm thấy" });
      res.json(doc);
    })
  );

  // Xoá theo id
  app.delete(
    `/api/${path}/:id`,
    requireAuth,
    wrap(async (req, res) => {
      const doc = await Model.findOneAndDelete({ id: req.params.id });
      if (!doc) return res.status(404).json({ error: "Không tìm thấy" });
      res.json({ message: "Đã xoá", id: req.params.id });
    })
  );
}

crud("news", News);
crud("combos", Combo);
crud("services", Service);
crud("products", Product);
crud("testimonials", Testimonial);

// --- Xem danh sách liên hệ (admin) ---
app.get(
  "/api/contact",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await Contact.find().sort({ createdAt: -1 }));
  })
);

// --- Cập nhật trạng thái / thông tin đặt lịch ---
app.put(
  "/api/booking/:id",
  requireAuth,
  wrap(async (req, res) => {
    const allowed = ["moi", "dang_dung", "da_dung", "doi_dv", "huy"];
    const existing = await Booking.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Không tìm thấy" });

    const data = {};
    if (req.body.status && allowed.includes(req.body.status)) data.status = req.body.status;
    if (typeof req.body.note === "string") data.note = req.body.note;
    if (typeof req.body.service === "string") data.service = req.body.service;
    if (typeof req.body.name === "string") data.name = req.body.name;
    if (typeof req.body.phone === "string") data.phone = req.body.phone;
    if (typeof req.body.branch === "string") data.branch = req.body.branch;
    if (typeof req.body.date === "string") data.date = req.body.date;
    if (typeof req.body.staff === "string") data.staff = req.body.staff;
    if (req.body.amount !== undefined) data.amount = Math.max(0, Number(req.body.amount) || 0);

    // Ghi mốc thời gian để tính thời lượng phục vụ
    if (data.status === "dang_dung" && !existing.startedAt) data.startedAt = new Date();
    if (data.status === "da_dung" && existing.status !== "da_dung") {
      data.completedAt = new Date();
      if (!existing.startedAt) data.startedAt = new Date(); // phòng khi chưa qua bước phục vụ
    }

    const finalStatus = data.status || existing.status || "moi";
    const finalAmount = data.amount !== undefined ? data.amount : (existing.amount || 0);
    const phone = data.phone || existing.phone;

    // Cộng/trừ chi tiêu & điểm cho khách khi lịch chuyển "Đã dùng DV"
    const wasCounted = !!existing.counted;
    const shouldCount = finalStatus === "da_dung";
    if (phone && (shouldCount || wasCounted)) {
      let cust = await Customer.findOne({ phone });
      if (!cust && shouldCount) {
        cust = await Customer.create({ phone, name: data.name || existing.name });
      }
      if (cust) {
        const prevAmt = existing.amount || 0;
        if (shouldCount && !wasCounted) {
          cust.visits += 1;
          cust.totalSpent += finalAmount;
          cust.points += pointsFor(finalAmount);
          cust.lastVisitAt = new Date();
        } else if (!shouldCount && wasCounted) {
          cust.visits = Math.max(0, cust.visits - 1);
          cust.totalSpent = Math.max(0, cust.totalSpent - prevAmt);
          cust.points = Math.max(0, cust.points - pointsFor(prevAmt));
        } else if (shouldCount && wasCounted && finalAmount !== prevAmt) {
          cust.totalSpent = Math.max(0, cust.totalSpent - prevAmt + finalAmount);
          cust.points = Math.max(0, cust.points - pointsFor(prevAmt) + pointsFor(finalAmount));
        }
        await cust.save();
      }
    }
    data.counted = shouldCount;

    const doc = await Booking.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(doc);
  })
);

// --- Lưu đánh giá tại chỗ cho 1 lịch (nhân viên nhập khi hoàn tất) ---
app.post(
  "/api/booking/:id/review",
  requireAuth,
  wrap(async (req, res) => {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: "Không tìm thấy lịch" });
    const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 5));
    const comment = cleanText(req.body.comment || "").slice(0, 1000);
    const published = rating >= 4;
    await Review.create({
      bookingId: String(b._id), name: b.name, phone: b.phone,
      service: b.service, staff: b.staff || "", rating, comment, published
    });
    if (published) {
      await Testimonial.create({
        id: genId(), name: b.name || "Khách hàng", rating,
        comment: comment || "Dịch vụ rất tốt!", loc: b.branch || "", active: true
      });
    }
    b.reviewedAt = new Date();
    await b.save();
    res.json({ ok: true, published });
  })
);

// --- Xoá đặt lịch / liên hệ ---
app.delete(
  "/api/booking/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);
app.delete(
  "/api/contact/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);

// --- Cập nhật thông tin doanh nghiệp ---
app.put(
  "/api/info",
  requireAuth,
  wrap(async (req, res) => {
    const info = await Info.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true
    });
    res.json(info);
  })
);

/* ---------- Chat tư vấn (admin) ---------- */

// Tổng số tin chưa đọc -> hiển thị badge thông báo
app.get(
  "/api/chat/unread/count",
  requireAuth,
  wrap(async (req, res) => {
    const rows = await Conversation.aggregate([
      { $group: { _id: null, total: { $sum: "$unreadAdmin" } } }
    ]);
    res.json({ count: rows[0]?.total || 0 });
  })
);

// Danh sách hội thoại (mới nhất lên đầu), không kèm toàn bộ tin nhắn cho nhẹ
app.get(
  "/api/chat",
  requireAuth,
  wrap(async (req, res) => {
    const convs = await Conversation.find()
      .sort({ lastMessageAt: -1 })
      .select("-messages")
      .lean({ virtuals: false });
    // .lean bỏ qua toJSON nên tự đổi _id -> id
    res.json(convs.map(({ _id, __v, ...c }) => ({ id: _id, ...c })));
  })
);

// Xem chi tiết 1 hội thoại + đánh dấu đã đọc
app.get(
  "/api/chat/:id",
  requireAuth,
  wrap(async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Không tìm thấy hội thoại" });
    if (conv.unreadAdmin) {
      conv.unreadAdmin = 0;
      await conv.save();
    }
    const obj = conv.toJSON();
    obj.userTyping = isFresh(conv.userTypingAt);
    res.json(obj);
  })
);

// Nhân viên báo đang gõ
app.post(
  "/api/chat/:id/typing",
  requireAuth,
  wrap(async (req, res) => {
    await Conversation.findByIdAndUpdate(req.params.id, { staffTypingAt: new Date() });
    res.json({ ok: true });
  })
);

// Sửa thông tin hội thoại (đổi tên / SĐT khách)
app.put(
  "/api/chat/:id",
  requireAuth,
  wrap(async (req, res) => {
    const data = {};
    if (typeof req.body.name === "string") data.name = req.body.name.slice(0, 80);
    if (typeof req.body.phone === "string") data.phone = req.body.phone.slice(0, 30);
    const conv = await Conversation.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!conv) return res.status(404).json({ error: "Không tìm thấy hội thoại" });
    res.json(conv);
  })
);

// Nhân viên trả lời khách
app.post(
  "/api/chat/:id/reply",
  chatBodyParser,
  requireAuth,
  wrap(async (req, res) => {
    const text = cleanText(req.body.text).trim().slice(0, 2000);
    const image = cleanImage(req.body.image);
    if (!text && !image) return res.status(400).json({ error: "Tin nhắn trống" });
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Không tìm thấy hội thoại" });
    conv.messages.push({ from: "staff", text, image });
    conv.lastMessageAt = new Date();
    conv.staffTypingAt = null;
    await conv.save();
    res.json(conv);
  })
);

// Xoá hội thoại
app.delete(
  "/api/chat/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Conversation.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);

/* ---------- Thống kê truy cập & tương tác (admin) ---------- */
app.get(
  "/api/stats/traffic",
  requireAuth,
  wrap(async (req, res) => {
    const rows = await Event.aggregate([
      { $group: { _id: { day: "$day", type: "$type" }, c: { $sum: 1 } } }
    ]);

    const blank = () => ({ visit: 0, call: 0, zalo: 0, messenger: 0, chat: 0 });
    const totals = blank();
    const byDay = {};   // "YYYY-MM-DD" -> counts
    const byMonth = {}; // "YYYY-MM"    -> counts
    const byYear = {};  // "YYYY"       -> counts

    for (const r of rows) {
      const { day, type } = r._id;
      if (!day || !EVENT_TYPES.includes(type)) continue;
      const c = r.c;
      const month = day.slice(0, 7);
      const year = day.slice(0, 4);
      totals[type] += c;
      (byDay[day] = byDay[day] || blank())[type] += c;
      (byMonth[month] = byMonth[month] || blank())[type] += c;
      (byYear[year] = byYear[year] || blank())[type] += c;
    }

    const toSorted = (obj, key) =>
      Object.keys(obj)
        .sort()
        .map((k) => ({ [key]: k, ...obj[k] }));

    res.json({
      types: EVENT_TYPES,
      totals,
      today: byDay[vnDay()] || blank(),
      byDay: toSorted(byDay, "day"),
      byMonth: toSorted(byMonth, "month"),
      byYear: toSorted(byYear, "year")
    });
  })
);

/* ---------- Khách hàng (admin) ---------- */
app.get(
  "/api/customers",
  requireAuth,
  wrap(async (req, res) => {
    const list = await Customer.find().sort({ lastVisitAt: -1, createdAt: -1 });
    res.json(list.map(withTier));
  })
);

// Lịch sử dịch vụ của 1 khách (gom theo SĐT)
app.get(
  "/api/customers/:id/history",
  requireAuth,
  wrap(async (req, res) => {
    const cust = await Customer.findById(req.params.id);
    if (!cust) return res.status(404).json({ error: "Không tìm thấy" });
    const bookings = cust.phone
      ? await Booking.find({ phone: cust.phone }).sort({ date: -1, createdAt: -1 })
      : [];
    res.json({ customer: withTier(cust), bookings });
  })
);
app.post(
  "/api/customers",
  requireAuth,
  wrap(async (req, res) => {
    const doc = await Customer.create(req.body);
    res.status(201).json(doc);
  })
);
app.put(
  "/api/customers/:id",
  requireAuth,
  wrap(async (req, res) => {
    const doc = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(doc);
  })
);
app.delete(
  "/api/customers/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);

/* =========================================================
   ====   CHĂM SÓC KHÁCH HÀNG (nhắc lịch / sinh nhật)   ====
   ========================================================= */

// Tìm email khách theo SĐT (để gửi nhắc lịch)
const emailByPhone = async (phone) => {
  if (!phone) return "";
  const c = await Customer.findOne({ phone });
  return c?.email || "";
};

// Danh sách lịch cần nhắc: trạng thái "moi", hẹn từ hôm nay tới N ngày tới
app.get(
  "/api/care/reminders",
  requireAuth,
  wrap(async (req, res) => {
    const days = Math.min(14, Math.max(0, Number(req.query.days) || 1));
    const today = vnDay();
    const all = await Booking.find({ status: "moi" }).sort({ date: 1 });
    const out = [];
    for (const b of all) {
      const k = bkDateKey(b.date);
      if (!k || k < today) continue;
      const diff = (new Date(k) - new Date(today)) / 86400000;
      if (diff > days) continue;
      out.push({ ...b.toJSON(), email: await emailByPhone(b.phone) });
    }
    res.json(out);
  })
);

// Gửi nhắc 1 lịch (email nếu có + luôn trả về để admin tự bấm Zalo)
app.post(
  "/api/care/reminders/:id/send",
  requireAuth,
  wrap(async (req, res) => {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: "Không tìm thấy lịch" });
    const email = await emailByPhone(b.phone);
    let sent = false;
    if (email) {
      sent = await sendReminderMail(email, { name: b.name, service: b.service, date: b.date, branch: b.branch });
    }
    b.remindedAt = new Date();
    await b.save();
    res.json({ ok: true, emailSent: sent, email });
  })
);

// Khách lâu chưa quay lại: đã từng đến (visits>0) và lần cuối > N ngày
app.get(
  "/api/care/sleeping",
  requireAuth,
  wrap(async (req, res) => {
    const days = Math.max(1, Number(req.query.days) || 30);
    const cutoff = new Date(Date.now() - days * 86400000);
    const list = await Customer.find({
      visits: { $gt: 0 },
      lastVisitAt: { $ne: null, $lt: cutoff }
    }).sort({ lastVisitAt: 1 });
    res.json(list.map(withTier));
  })
);

// Sinh nhật hôm nay / sắp tới (trong N ngày)
app.get(
  "/api/care/birthdays",
  requireAuth,
  wrap(async (req, res) => {
    const days = Math.min(31, Math.max(0, Number(req.query.days) || 7));
    const todayMD = vnMonthDay();
    const all = await Customer.find({ birthday: { $ne: "" } });
    const withinDays = (md) => {
      if (!md) return -1;
      const [tm, td] = todayMD.split("-").map(Number);
      const [bm, bd] = md.split("-").map(Number);
      const base = new Date(2000, tm - 1, td);
      let target = new Date(2000, bm - 1, bd);
      if (target < base) target = new Date(2001, bm - 1, bd); // vòng sang năm sau
      const diff = Math.round((target - base) / 86400000);
      return diff;
    };
    const out = [];
    for (const c of all) {
      const md = birthdayMD(c.birthday);
      const diff = withinDays(md);
      if (diff >= 0 && diff <= days) out.push({ ...withTier(c), inDays: diff });
    }
    out.sort((a, b) => a.inDays - b.inDays);
    res.json(out);
  })
);

// Gửi lời chúc sinh nhật cho 1 khách; có thể TỰ TẠO voucher riêng kèm mã
app.post(
  "/api/care/birthdays/:id/send",
  requireAuth,
  wrap(async (req, res) => {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy khách" });

    let voucherCode = "", voucherDesc = "";
    if (req.body.createVoucher) {
      const type = req.body.type === "amount" ? "amount" : "percent";
      const value = Math.max(1, Number(req.body.value) || 20);
      const days = Math.max(1, Number(req.body.expiryDays) || 30);
      const expiry = vnDay(new Date(Date.now() + days * 86400000));
      voucherCode = await uniqueVoucherCode();
      voucherDesc = type === "percent"
        ? `Giảm ${value}% mừng sinh nhật (HSD ${expiry})`
        : `Giảm ${value.toLocaleString("vi-VN")}đ mừng sinh nhật (HSD ${expiry})`;
      await Voucher.create({
        code: voucherCode,
        description: `🎂 Sinh nhật: ${c.name || c.phone || ""}`.trim(),
        type, value, usageLimit: 1, expiry, active: true
      });
    } else if (req.body.voucherCode) {
      voucherCode = req.body.voucherCode;
      voucherDesc = req.body.voucherDesc || "";
    }

    let sent = false;
    if (c.email) {
      sent = await sendBirthdayMail(c.email, { name: c.name, voucherCode, voucherDesc });
    }
    c.birthdayGreetedYear = Number(vnDay().slice(0, 4));
    await c.save();
    res.json({ ok: true, emailSent: sent, email: c.email || "", voucherCode, voucherDesc });
  })
);

// Đặt lịch gửi chúc sinh nhật (tới giờ server tự gửi + tự tạo/đính kèm voucher)
app.post(
  "/api/care/birthdays/:id/schedule",
  requireAuth,
  wrap(async (req, res) => {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy khách" });
    const sendAt = new Date(req.body.sendAt);
    if (isNaN(sendAt.getTime())) return res.status(400).json({ error: "Thời gian gửi không hợp lệ" });

    const mode = ["create", "existing", "none"].includes(req.body.voucherMode) ? req.body.voucherMode : "none";
    let voucherCode = "";
    if (mode === "existing") {
      voucherCode = String(req.body.voucherCode || "").trim().toUpperCase();
      if (!voucherCode) return res.status(400).json({ error: "Vui lòng chọn voucher có sẵn" });
    }
    const doc = await ScheduledSend.create({
      type: "birthday", customerId: String(c._id),
      name: c.name, email: c.email || "", phone: c.phone || "",
      sendAt,
      voucherMode: mode,
      voucherType: req.body.voucherType === "amount" ? "amount" : "percent",
      voucherValue: Math.max(1, Number(req.body.voucherValue) || 20),
      voucherExpiryDays: Math.max(1, Number(req.body.voucherExpiryDays) || 30),
      voucherCode,
      status: "pending"
    });
    res.status(201).json(doc);
  })
);

// Danh sách lịch đã hẹn gửi (mới nhất trước)
app.get(
  "/api/care/scheduled",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await ScheduledSend.find().sort({ sendAt: 1 }));
  })
);

// Huỷ 1 lịch đã hẹn (chỉ xoá bản ghi, voucher nếu đã tạo vẫn giữ)
app.delete(
  "/api/care/scheduled/:id",
  requireAuth,
  wrap(async (req, res) => {
    await ScheduledSend.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã huỷ" });
  })
);

/* ---------- Chiến dịch khuyến mãi (lễ / sinh nhật spa) ---------- */
// Chọn nhóm khách theo tiêu chí
async function resolveAudience(audience, count) {
  let custs = await Customer.find({});
  if (audience === "top") {
    custs.sort((a, b) => (b.visits || 0) - (a.visits || 0) || (b.totalSpent || 0) - (a.totalSpent || 0));
    if (count > 0) custs = custs.slice(0, count);
  } else if (audience === "random") {
    for (let i = custs.length - 1; i > 0; i--) { // xáo trộn Fisher-Yates
      const j = Math.floor(Math.random() * (i + 1));
      [custs[i], custs[j]] = [custs[j], custs[i]];
    }
    if (count > 0) custs = custs.slice(0, count);
  } else if (count > 0) {
    custs = custs.slice(0, count); // "all" nhưng giới hạn nếu có
  }
  return custs;
}

// Xem trước số khách sẽ nhận (không gửi)
app.get(
  "/api/care/campaigns/preview",
  requireAuth,
  wrap(async (req, res) => {
    const recips = await resolveAudience(req.query.audience || "all", Number(req.query.count) || 0);
    const withEmail = recips.filter((c) => c.email).length;
    res.json({ total: recips.length, withEmail });
  })
);

app.get(
  "/api/care/campaigns",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await Campaign.find().sort({ sendAt: -1 }));
  })
);

app.post(
  "/api/care/campaigns",
  requireAuth,
  wrap(async (req, res) => {
    const sendAt = new Date(req.body.sendAt);
    if (!req.body.name || !String(req.body.name).trim()) return res.status(400).json({ error: "Nhập tên chương trình" });
    if (isNaN(sendAt.getTime())) return res.status(400).json({ error: "Thời gian gửi không hợp lệ" });
    const channels = Array.isArray(req.body.channels) && req.body.channels.length ? req.body.channels : ["email"];
    const voucherMode = req.body.voucherMode === "existing" ? "existing" : "create";
    const existingCode = String(req.body.voucherCode || "").trim().toUpperCase();
    if (voucherMode === "existing" && !existingCode) return res.status(400).json({ error: "Vui lòng chọn mã có sẵn" });
    const doc = await Campaign.create({
      name: String(req.body.name).trim(),
      message: req.body.message || "",
      channels,
      sendAt,
      voucherMode,
      voucherCode: voucherMode === "existing" ? existingCode : "",
      voucherType: req.body.voucherType === "amount" ? "amount" : "percent",
      voucherValue: Math.max(1, Number(req.body.voucherValue) || 10),
      voucherExpiryDays: Math.max(1, Number(req.body.voucherExpiryDays) || 30),
      audience: ["all", "top", "random"].includes(req.body.audience) ? req.body.audience : "all",
      count: Math.max(0, Number(req.body.count) || 0),
      status: "pending"
    });
    res.status(201).json(doc);
  })
);

app.put(
  "/api/care/campaigns/:id",
  requireAuth,
  wrap(async (req, res) => {
    const c = await Campaign.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy chương trình" });
    if (c.status === "sent") return res.status(400).json({ error: "Chương trình đã gửi, không sửa được" });

    if (typeof req.body.name === "string" && req.body.name.trim()) c.name = req.body.name.trim();
    if (typeof req.body.message === "string") c.message = req.body.message;
    if (Array.isArray(req.body.channels) && req.body.channels.length) c.channels = req.body.channels;
    if (req.body.sendAt) {
      const d = new Date(req.body.sendAt);
      if (!isNaN(d.getTime())) c.sendAt = d;
    }
    if (req.body.voucherMode) c.voucherMode = req.body.voucherMode === "existing" ? "existing" : "create";
    if (c.voucherMode === "existing") {
      const code = String(req.body.voucherCode || "").trim().toUpperCase();
      if (!code) return res.status(400).json({ error: "Vui lòng chọn mã có sẵn" });
      c.voucherCode = code;
    } else c.voucherCode = "";
    if (req.body.voucherType) c.voucherType = req.body.voucherType === "amount" ? "amount" : "percent";
    if (req.body.voucherValue !== undefined) c.voucherValue = Math.max(1, Number(req.body.voucherValue) || 10);
    if (req.body.voucherExpiryDays !== undefined) c.voucherExpiryDays = Math.max(1, Number(req.body.voucherExpiryDays) || 30);
    if (req.body.audience) c.audience = ["all", "top", "random"].includes(req.body.audience) ? req.body.audience : "all";
    if (req.body.count !== undefined) c.count = Math.max(0, Number(req.body.count) || 0);
    c.status = "pending";
    await c.save();
    res.json(c);
  })
);

app.delete(
  "/api/care/campaigns/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);

// Gửi ngay 1 chiến dịch (không chờ tới giờ)
app.post(
  "/api/care/campaigns/:id/send-now",
  requireAuth,
  wrap(async (req, res) => {
    const c = await Campaign.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy chương trình" });
    if (c.status === "sent") return res.status(400).json({ error: "Chương trình đã gửi" });
    await dispatchCampaign(c);
    res.json({ ok: true, campaign: c });
  })
);

/* ---------- Voucher / mã giảm giá (admin) ---------- */
app.get(
  "/api/vouchers",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await Voucher.find().sort({ createdAt: -1 }));
  })
);
// Sinh mã voucher 6 ký tự (bỏ ký tự dễ nhầm: O,0,I,1)
const VC_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genVoucherCode = () => {
  let s = "";
  for (let i = 0; i < 6; i++) s += VC_CHARS[Math.floor(Math.random() * VC_CHARS.length)];
  return s;
};
const uniqueVoucherCode = async () => {
  for (let i = 0; i < 8; i++) {
    const code = genVoucherCode();
    if (!(await Voucher.findOne({ code }))) return code;
  }
  return genVoucherCode() + Math.floor(Math.random() * 9); // cực hiếm khi tới đây
};

app.post(
  "/api/vouchers",
  requireAuth,
  wrap(async (req, res) => {
    const body = { ...req.body };
    // Không nhập mã -> tự sinh mã 6 ký tự
    if (!body.code || !String(body.code).trim()) body.code = await uniqueVoucherCode();
    try {
      const doc = await Voucher.create(body);
      res.status(201).json(doc);
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ error: "Mã voucher đã tồn tại" });
      throw e;
    }
  })
);

// Tạo nhanh 1 mã ngẫu nhiên chưa dùng (cho nút "Tạo mã" ở giao diện)
app.get(
  "/api/vouchers/gen-code",
  requireAuth,
  wrap(async (req, res) => {
    res.json({ code: await uniqueVoucherCode() });
  })
);

// Ghi nhận 1 lượt sử dụng voucher (nhập mã -> kiểm tra hợp lệ -> tăng usedCount)
app.post(
  "/api/vouchers/redeem",
  requireAuth,
  wrap(async (req, res) => {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Vui lòng nhập mã" });
    const v = await Voucher.findOne({ code });
    if (!v) return res.status(404).json({ error: "Mã không tồn tại" });
    if (!v.active) return res.status(400).json({ error: "Mã đã bị tắt" });
    if (v.expiry && new Date(v.expiry) < new Date(new Date().toDateString())) {
      return res.status(400).json({ error: "Mã đã hết hạn" });
    }
    if (v.usageLimit && v.usedCount >= v.usageLimit) {
      return res.status(400).json({ error: "Mã đã hết lượt sử dụng" });
    }
    // Số tiền giảm lượt này: nhập tay -> dùng; không nhập & voucher kiểu "số tiền" -> lấy value
    let discount = Number(req.body.discount);
    if (!Number.isFinite(discount) || discount < 0) discount = v.type === "amount" ? (v.value || 0) : 0;
    v.usedCount += 1;
    v.totalDiscount = (v.totalDiscount || 0) + discount;
    await v.save();
    res.json({ ok: true, voucher: v, discount });
  })
);
app.put(
  "/api/vouchers/:id",
  requireAuth,
  wrap(async (req, res) => {
    try {
      const doc = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ error: "Không tìm thấy" });
      res.json(doc);
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ error: "Mã voucher đã tồn tại" });
      throw e;
    }
  })
);
app.delete(
  "/api/vouchers/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Voucher.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);

/* ---------- Nhân viên / kỹ thuật viên (admin) ---------- */
app.get(
  "/api/staff",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await Staff.find().sort({ active: -1, name: 1 }));
  })
);
app.post(
  "/api/staff",
  requireAuth,
  wrap(async (req, res) => {
    if (!req.body.name || !String(req.body.name).trim()) {
      return res.status(400).json({ error: "Vui lòng nhập tên nhân viên" });
    }
    res.status(201).json(await Staff.create(req.body));
  })
);
app.put(
  "/api/staff/:id",
  requireAuth,
  wrap(async (req, res) => {
    const doc = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(doc);
  })
);
app.delete(
  "/api/staff/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);

// Hiệu suất nhân viên: số lịch hoàn tất & doanh thu theo từng người
app.get(
  "/api/staff/performance",
  requireAuth,
  wrap(async (req, res) => {
    const done = await Booking.find({ status: "da_dung" });
    const map = {};
    for (const b of done) {
      const key = (b.staff || "").trim() || "(Chưa gán)";
      const m = (map[key] = map[key] || { staff: key, count: 0, revenue: 0 });
      m.count += 1;
      m.revenue += b.amount || 0;
    }
    res.json(Object.values(map).sort((a, b) => b.revenue - a.revenue));
  })
);

// Thống kê nhân viên: số khách phục vụ + số sao đánh giá (lọc theo tháng tuỳ chọn)
app.get(
  "/api/staff/stats",
  requireAuth,
  wrap(async (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : "";
    const inMonth = (s) => !month || (s || "").startsWith(month);
    const monthOfDate = (dateStr, createdAt) =>
      (dateStr && /^\d{4}-\d{2}/.test(dateStr)) ? dateStr.slice(0, 7)
        : (createdAt ? new Date(createdAt).toISOString().slice(0, 7) : "");

    const map = {};
    const ensure = (name) => (map[name] = map[name] ||
      { staff: name, served: 0, reviews: 0, totalStars: 0, stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });

    // Số khách phục vụ = lịch "Đã sử dụng DV" có gán KTV
    const done = await Booking.find({ status: "da_dung" });
    for (const b of done) {
      const staff = (b.staff || "").trim();
      if (!staff) continue;
      if (!inMonth(monthOfDate(b.date, b.createdAt))) continue;
      ensure(staff).served += 1;
    }
    // Số sao từ đánh giá có gán KTV
    const reviews = await Review.find();
    for (const r of reviews) {
      const staff = (r.staff || "").trim();
      if (!staff) continue;
      if (!inMonth(r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 7) : "")) continue;
      const s = ensure(staff);
      s.reviews += 1;
      s.totalStars += r.rating || 0;
      s.stars[r.rating] = (s.stars[r.rating] || 0) + 1;
    }
    const out = Object.values(map).map((s) => ({
      ...s, avg: s.reviews ? Math.round((s.totalStars / s.reviews) * 100) / 100 : 0
    }));
    // Sắp theo điểm TB cao nhất, rồi số khách phục vụ
    out.sort((a, b) => b.avg - a.avg || b.served - a.served);
    res.json(out);
  })
);

/* ---------- Đánh giá sau dịch vụ (admin) ---------- */
app.get(
  "/api/reviews",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await Review.find().sort({ createdAt: -1 }));
  })
);
// Đẩy 1 đánh giá lên Testimonials thủ công (cho đánh giá điểm thấp muốn đăng)
app.post(
  "/api/reviews/:id/publish",
  requireAuth,
  wrap(async (req, res) => {
    const r = await Review.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Không tìm thấy" });
    await Testimonial.create({
      id: genId(), name: r.name || "Khách hàng", rating: r.rating,
      comment: r.comment || "Dịch vụ rất tốt!", loc: "", active: true
    });
    r.published = true;
    await r.save();
    res.json({ ok: true });
  })
);
app.delete(
  "/api/reviews/:id",
  requireAuth,
  wrap(async (req, res) => {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá" });
  })
);

// Danh sách lịch đã hoàn tất, chưa đánh giá -> để gửi lời mời đánh giá
app.get(
  "/api/care/reviews",
  requireAuth,
  wrap(async (req, res) => {
    const list = await Booking.find({ status: "da_dung", reviewedAt: null }).sort({ updatedAt: -1 });
    const out = [];
    for (const b of list) {
      out.push({ ...b.toJSON(), email: await emailByPhone(b.phone), link: reviewLink(b._id) });
    }
    res.json(out);
  })
);
// Gửi lời mời đánh giá cho 1 lịch (email nếu có + trả link để bấm Zalo)
app.post(
  "/api/care/reviews/:id/send",
  requireAuth,
  wrap(async (req, res) => {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: "Không tìm thấy lịch" });
    const email = await emailByPhone(b.phone);
    const link = reviewLink(b._id);
    let sent = false;
    if (email) sent = await sendReviewRequestMail(email, { name: b.name, service: b.service, link });
    b.reviewRequestedAt = new Date();
    await b.save();
    res.json({ ok: true, emailSent: sent, email, link });
  })
);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint không tồn tại" });
});

// Error handler chung (cuoi cung)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  // CORS error
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ error: "Domain khong duoc phep" });
  }
  res.status(500).json({ error: "Loi may chu" });
});

/* ===== Tác vụ tự động: nhắc lịch hôm nay + tự huỷ lịch quá hạn ===== */
async function runCareJobs() {
  try {
    const today = vnDay();
    // Lấy các lịch còn "Đang chờ" để vừa nhắc (hôm nay) vừa tự huỷ (quá hạn)
    const pending = await Booking.find({ status: "moi" });
    for (const b of pending) {
      const k = bkDateKey(b.date);
      // Tự huỷ: đã qua ngày hẹn mà vẫn "Đang chờ" -> khách không đến
      if (k && k < today) {
        b.status = "huy";
        b.note = (b.note ? b.note + " · " : "") + "Tự huỷ: quá ngày hẹn, khách không đến";
        await b.save();
        continue;
      }
      // Nhắc lịch diễn ra HÔM NAY, chưa từng nhắc
      if (k === today && !b.remindedAt) {
        const email = await emailByPhone(b.phone);
        if (email) {
          await sendReminderMail(email, { name: b.name, service: b.service, date: b.date, branch: b.branch });
        }
        b.remindedAt = new Date();
        await b.save();
      }
    }
  } catch (err) {
    console.error("❌ Lỗi tác vụ nhắc lịch / tự huỷ:", err.message);
  }
}

/* ===== Xử lý các lịch gửi đã hẹn (vd: chúc sinh nhật) tới giờ thì gửi ===== */
async function processScheduledSends() {
  try {
    const due = await ScheduledSend.find({ status: "pending", sendAt: { $lte: new Date() } });
    for (const s of due) {
      try {
        let code = "", desc = "";
        if (s.voucherMode === "create") {
          const expiry = vnDay(new Date(Date.now() + (s.voucherExpiryDays || 30) * 86400000));
          code = await uniqueVoucherCode();
          desc = s.voucherType === "amount"
            ? `Giảm ${(s.voucherValue || 0).toLocaleString("vi-VN")}đ mừng sinh nhật (HSD ${expiry})`
            : `Giảm ${s.voucherValue}% mừng sinh nhật (HSD ${expiry})`;
          await Voucher.create({
            code, description: `🎂 Sinh nhật: ${s.name || s.phone || ""}`.trim(),
            type: s.voucherType, value: s.voucherValue, usageLimit: 1, expiry, active: true
          });
        } else if (s.voucherMode === "existing" && s.voucherCode) {
          code = s.voucherCode;
          const v = await Voucher.findOne({ code });
          desc = v?.description || "";
        }
        let sent = false;
        if (s.email) sent = await sendBirthdayMail(s.email, { name: s.name, voucherCode: code, voucherDesc: desc });
        s.status = "sent"; s.emailSent = sent; s.sentAt = new Date(); s.voucherCode = code;
        await s.save();
        if (s.customerId) {
          const c = await Customer.findById(s.customerId).catch(() => null);
          if (c) { c.birthdayGreetedYear = Number(vnDay().slice(0, 4)); await c.save(); }
        }
        console.log(`📨 Đã gửi lịch hẹn cho ${s.name || s.email} (voucher: ${code || "không"})`);
      } catch (e) {
        s.status = "failed"; await s.save().catch(() => {});
        console.error("❌ Gửi lịch hẹn thất bại:", e.message);
      }
    }
  } catch (err) {
    console.error("❌ Lỗi xử lý lịch gửi:", err.message);
  }
}

/* ===== Gửi 1 chiến dịch khuyến mãi: tạo voucher + gửi cho nhóm khách ===== */
async function dispatchCampaign(c) {
  const recips = await resolveAudience(c.audience, c.count);
  let code, desc;
  if (c.voucherMode === "existing" && c.voucherCode) {
    // Dùng mã có sẵn (không tạo mới)
    code = c.voucherCode;
    const v = await Voucher.findOne({ code });
    desc = v?.description
      || (v?.type === "amount" ? `Giảm ${(v.value || 0).toLocaleString("vi-VN")}đ` : `Giảm ${v?.value || 0}%`);
  } else {
    // Tạo mã mới riêng cho chiến dịch
    const expiry = vnDay(new Date(Date.now() + (c.voucherExpiryDays || 30) * 86400000));
    code = await uniqueVoucherCode();
    desc = c.voucherType === "amount"
      ? `Giảm ${(c.voucherValue || 0).toLocaleString("vi-VN")}đ (HSD ${expiry})`
      : `Giảm ${c.voucherValue}% (HSD ${expiry})`;
    await Voucher.create({
      code, description: `🎁 ${c.name}`,
      type: c.voucherType, value: c.voucherValue,
      usageLimit: recips.length || 0, expiry, active: true
    });
  }
  let emailSent = 0;
  if ((c.channels || []).includes("email")) {
    for (const r of recips) {
      if (r.email && await sendPromoMail(r.email, {
        name: r.name, title: c.name, message: c.message, voucherCode: code, voucherDesc: desc
      })) emailSent++;
    }
  }
  c.voucherCode = code;
  c.recipients = recips.map((r) => ({ name: r.name, phone: r.phone, email: r.email }));
  c.emailSentCount = emailSent;
  c.status = "sent";
  c.sentAt = new Date();
  await c.save();
}

async function processCampaigns() {
  try {
    const due = await Campaign.find({ status: "pending", sendAt: { $lte: new Date() } });
    for (const c of due) {
      try {
        await dispatchCampaign(c);
        console.log(`🎁 Đã gửi chiến dịch "${c.name}" cho ${c.recipients.length} khách (email: ${c.emailSentCount})`);
      } catch (e) {
        c.status = "failed"; await c.save().catch(() => {});
        console.error("❌ Gửi chiến dịch lỗi:", e.message);
      }
    }
  } catch (err) {
    console.error("❌ Lỗi xử lý chiến dịch:", err.message);
  }
}

// Kết nối DB rồi mới khởi động server
let server;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`✅ Bao Tram Spa API đang chạy tại http://localhost:${PORT}`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   CORS allowed: ${allowedOrigins.length ? allowedOrigins.join(", ") : "(all - dev mode)"}`);
  });
  // Nhắc lịch hôm nay + tự huỷ lịch quá hạn: sau 30s, rồi mỗi 1 giờ
  setTimeout(runCareJobs, 30000);
  setInterval(runCareJobs, 60 * 60 * 1000);
  // Xử lý lịch gửi đã hẹn (sinh nhật...) + chiến dịch khuyến mãi: mỗi 2 phút
  setTimeout(() => { processScheduledSends(); processCampaigns(); }, 20000);
  setInterval(() => { processScheduledSends(); processCampaigns(); }, 2 * 60 * 1000);
});

// Graceful shutdown - xu ly SIGTERM/SIGINT de tat server an toan
const mongoose = require("mongoose");
const shutdown = async (signal) => {
  console.log(`\n[${signal}] Dang tat server...`);
  if (server) {
    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log("✅ Da dong tat ca connection. Bye!");
        process.exit(0);
      } catch (err) {
        console.error("Loi khi shutdown:", err.message);
        process.exit(1);
      }
    });
    // Force shutdown sau 10s neu khong dong duoc
    setTimeout(() => {
      console.error("⚠️ Force shutdown sau 10s");
      process.exit(1);
    }, 10000);
  }
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
  console.error("[UnhandledRejection]", err);
});
process.on("uncaughtException", (err) => {
  console.error("[UncaughtException]", err);
  shutdown("uncaughtException");
});
