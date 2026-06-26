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
const { sendBookingMail, sendContactMail } = require("./mailer");
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
  Customer
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
    const { name, phone, service, branch, date, note } = req.body;
    const booking = await Booking.create({ name, phone, service, branch, date, note });
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

/* =========================================================
   ========   THỐNG KÊ TRUY CẬP & TƯƠNG TÁC   ============
   ========================================================= */

const EVENT_TYPES = ["visit", "call", "zalo", "messenger", "chat"];

// Ngày theo giờ Việt Nam (UTC+7) dạng YYYY-MM-DD
const vnDay = (d = new Date()) =>
  new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);

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
    const allowed = ["moi", "da_dung", "doi_dv", "huy"];
    const data = {};
    if (req.body.status && allowed.includes(req.body.status)) data.status = req.body.status;
    if (typeof req.body.note === "string") data.note = req.body.note;
    if (typeof req.body.service === "string") data.service = req.body.service;
    if (typeof req.body.name === "string") data.name = req.body.name;
    if (typeof req.body.phone === "string") data.phone = req.body.phone;
    if (typeof req.body.branch === "string") data.branch = req.body.branch;
    if (typeof req.body.date === "string") data.date = req.body.date;
    const doc = await Booking.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!doc) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(doc);
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
    res.json(await Customer.find().sort({ createdAt: -1 }));
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

// Kết nối DB rồi mới khởi động server
let server;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`✅ Bao Tram Spa API đang chạy tại http://localhost:${PORT}`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   CORS allowed: ${allowedOrigins.length ? allowedOrigins.join(", ") : "(all - dev mode)"}`);
  });
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
