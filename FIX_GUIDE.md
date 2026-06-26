# 🛠️ FIX GUIDE - Spa_BaoTram

> Audit dự án Spa_BaoTram tại `H:\Spa_BaoTram`
> Stack: React (Vite) + Express + MongoDB + JWT
> Mục tiêu: Đủ tiêu chuẩn deploy public (Google index + Google Ads accept)

---

## ✅ ĐÃ CÓ (Điểm tốt - không cần fix)

- ✅ Helmet (security headers)
- ✅ Rate limit (login, public, chat) — chia 3 mức rất tốt
- ✅ Express-validator
- ✅ JWT authentication
- ✅ MongoDB (DB thật, không phải JSON)
- ✅ Meta description + Open Graph + Twitter Card
- ✅ Real-time chat backend
- ✅ Customer + Event tracking
- ✅ Morgan logging
- ✅ Trust proxy (cho rate-limit qua ngrok)

---

## 🔴 NHÓM 1: LỖI BẢO MẬT NGHIÊM TRỌNG

### ❌ Lỗi #1: Default Admin Password lưu trong code
**File:** `backend/src/auth.js` (dòng 5-7)
**Vấn đề:** Nếu chủ spa quên set `.env`, ai cũng login được với `admin / baotram@123`
**Fix:**
```javascript
// THAY:
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "baotram@123";
const JWT_SECRET = process.env.JWT_SECRET || "doi-chuoi-bi-mat-nay-trong-env";

// BẰNG:
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
  console.error("❌ THIẾU env: ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET");
  process.exit(1);
}
```

- [ ] Đã fix

---

### ❌ Lỗi #2: Password đang so sánh PLAIN TEXT
**File:** `backend/src/auth.js:12`
**Vấn đề:** Nếu DB lộ, password lộ luôn
**Fix:**
```bash
cd backend && npm install bcryptjs
```
```javascript
const bcrypt = require("bcryptjs");

async function login(req, res) {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
  }
  const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });

  const token = jwt.sign({ role: "admin", username }, JWT_SECRET, {
    expiresIn: "1d"   // giảm từ 7d -> 1d cho admin
  });
  return res.json({ token, username });
}
```

**Cách tạo hash để bỏ vào `.env`:**
```bash
node -e "console.log(require('bcryptjs').hashSync('mat_khau_moi', 10))"
# Copy chuỗi hash vào ADMIN_PASSWORD_HASH trong .env
```

- [ ] Đã fix

---

### ❌ Lỗi #3: CORS mở cho TẤT CẢ origin nếu thiếu env
**File:** `backend/src/server.js:36-37`
**Vấn đề:** Mọi domain có thể gọi API → CSRF nguy hiểm
**Fix:**
```javascript
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
if (!CLIENT_ORIGIN) {
  console.error("❌ THIẾU CLIENT_ORIGIN trong .env");
  process.exit(1);
}
app.use(cors({
  origin: CLIENT_ORIGIN.split(",").map(s => s.trim()),
  credentials: true
}));
```

Trong `.env`:
```
CLIENT_ORIGIN=https://spabaotram.com,https://www.spabaotram.com
```

- [ ] Đã fix

---

### ❌ Lỗi #4: Express body limit 8MB → DoS attack
**File:** `backend/src/server.js:40`
**Vấn đề:** Khách gửi 1000 request × 8MB → server out of memory
**Fix:**
```javascript
// THAY:
app.use(express.json({ limit: "8mb" }));

// BẰNG (chia route): JSON nhỏ cho hầu hết route, riêng chat upload ảnh mới cần 6MB
app.use(express.json({ limit: "200kb" }));

// Riêng route upload ảnh chat dùng middleware riêng
const chatBodyParser = express.json({ limit: "6mb" });
app.post("/api/chat/session/:visitorId", chatBodyParser, chatLimiter, /* ... */);
app.post("/api/chat/:id/reply", chatBodyParser, requireAuth, /* ... */);
```

- [ ] Đã fix

---

### ❌ Lỗi #5: Ảnh base64 6MB lưu thẳng vào MongoDB
**File:** `backend/src/server.js:243-246`
**Vấn đề:**
- DB phình to nhanh (1000 ảnh × 6MB = 6GB)
- Query chậm
- MongoDB Atlas free chỉ 512MB
**Fix:** Lưu ảnh ra disk hoặc S3/Cloudinary
```bash
cd backend && npm install multer sharp
```
Tạo `backend/src/upload.js`:
```javascript
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
    cb(ok ? null : new Error("Chỉ cho phép JPG/PNG/WEBP"), ok);
  }
});

async function saveImage(buffer) {
  const filename = crypto.randomBytes(16).toString("hex") + ".webp";
  const filepath = path.join(UPLOAD_DIR, filename);
  // Convert sang WebP + nén
  await sharp(buffer).resize(1200).webp({ quality: 80 }).toFile(filepath);
  return `/uploads/${filename}`;
}

module.exports = { upload, saveImage };
```

Trong `server.js`:
```javascript
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
  maxAge: "1y"
}));
```

- [ ] Đã fix

---

### ❌ Lỗi #6: Chat messages KHÔNG sanitize XSS
**File:** `backend/src/server.js:289` và frontend admin chat
**Vấn đề:** Khách gửi `<script>alert(1)</script>` → admin xem chat sẽ bị inject
**Fix backend:**
```bash
cd backend && npm install sanitize-html
```
```javascript
const sanitizeHtml = require("sanitize-html");

const cleanText = (text) => sanitizeHtml(text || "", {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard"
});

// Trong route gửi tin chat
conv.messages.push({
  from: "user",
  text: cleanText(text),
  image
});
```

- [ ] Đã fix

---

### ❌ Lỗi #7: `/api/track` không rate-limit
**File:** `backend/src/server.js:222-232`
**Vấn đề:** Hacker spam tạo 1 triệu event giả → DB bloat + stats sai
**Fix:**
```javascript
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.post("/api/track", trackLimiter, wrap(async (req, res) => { /* ... */ }));
```

- [ ] Đã fix

---

### ❌ Lỗi #8: JWT trong localStorage (XSS attack)
**File:** Frontend `src/adminApi.js` hoặc tương tự
**Vấn đề:** Nếu có XSS, hacker đọc được token
**Fix khuyên dùng:** Chuyển sang **httpOnly cookie**
```javascript
// Backend - server.js
app.use(require("cookie-parser")());

// Trong login response:
res.cookie("admin_token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000
});
res.json({ username });

// requireAuth middleware:
function requireAuth(req, res, next) {
  const token = req.cookies?.admin_token || /* fallback header */;
  // ...
}
```

> Nếu không muốn refactor lớn: ít nhất giảm JWT expiry từ 7d → 1d (đã sửa ở lỗi #2)

- [ ] Đã fix

---

### ❌ Lỗi #9: `trust proxy = 1` không an toàn
**File:** `backend/src/server.js:44`
**Vấn đề:** Trust proxy = 1 tin tưởng X-Forwarded-For từ proxy đầu tiên — nếu deploy sai cấu trúc → hacker spoof IP để vượt rate-limit
**Fix:** Chỉ định CHÍNH XÁC proxy
```javascript
// Nếu deploy sau Cloudflare:
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

// Hoặc cụ thể số hop:
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
```

- [ ] Đã fix

---

## 🟡 NHÓM 2: SEO GOOGLE (Để index + chạy Ads)

### ❌ Lỗi #10: OG image vẫn đang dùng URL ngrok
**File:** `frontend/index.html:23,26,36`
**Vấn đề:** Khi share Facebook/Zalo → hiện link ngrok → mất uy tín
**Fix:** Thay tất cả URL ngrok bằng tên miền thật:
```html
<meta property="og:image" content="https://spabaotram.com/images/og-cover.jpg" />
<meta property="og:url" content="https://spabaotram.com/" />
<meta name="twitter:image" content="https://spabaotram.com/images/og-cover.jpg" />
```

Và **tạo ảnh OG riêng** 1200×630px (không dùng logo) — có text "Bảo Trâm Beauty Spa & Salon - Châu Thành, Bến Tre".

- [ ] Đã fix

---

### ❌ Lỗi #11: Thiếu Schema.org LocalBusiness
**File:** `frontend/index.html`
**Fix - thêm vào cuối `<head>`:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  "name": "Bảo Trâm Beauty Spa & Salon",
  "image": "https://spabaotram.com/images/og-cover.jpg",
  "@id": "https://spabaotram.com",
  "url": "https://spabaotram.com",
  "telephone": "+84327322722",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Châu Thành",
    "addressLocality": "Châu Thành",
    "addressRegion": "Bến Tre",
    "postalCode": "86000",
    "addressCountry": "VN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 10.2333,
    "longitude": 106.4
  },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    "opens": "08:00",
    "closes": "21:00"
  }],
  "sameAs": [
    "https://www.facebook.com/baotrambeauty",
    "https://zalo.me/0327322722"
  ]
}
</script>
```

> ⚠️ Nhớ điền lat/lng THẬT của spa (lấy từ Google Maps).

- [ ] Đã fix

---

### ❌ Lỗi #12: Thiếu `robots.txt`
**File:** Tạo mới `frontend/public/robots.txt`
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://spabaotram.com/sitemap.xml
```

- [ ] Đã fix

---

### ❌ Lỗi #13: Thiếu `sitemap.xml`
**File:** Tạo mới `frontend/public/sitemap.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://spabaotram.com/</loc><priority>1.0</priority></url>
  <url><loc>https://spabaotram.com/gioi-thieu</loc><priority>0.8</priority></url>
  <url><loc>https://spabaotram.com/dich-vu</loc><priority>0.9</priority></url>
  <url><loc>https://spabaotram.com/san-pham</loc><priority>0.8</priority></url>
  <url><loc>https://spabaotram.com/dao-tao</loc><priority>0.7</priority></url>
  <url><loc>https://spabaotram.com/tin-tuc</loc><priority>0.8</priority></url>
  <url><loc>https://spabaotram.com/lien-he</loc><priority>0.8</priority></url>
</urlset>
```

> Khuyên: Tạo script auto-generate sitemap từ DB cho các bài tin tức/dịch vụ.

- [ ] Đã fix

---

### ❌ Lỗi #14: SPA React không có SSR/SSG → Google index kém
**Vấn đề:** Crawler có thể không đọc được content render bằng JS
**Fix Option A (đơn giản):** Dùng `vite-plugin-ssr` hoặc `vite-plugin-prerender`
```bash
cd frontend && npm install -D vite-plugin-prerender
```

**Fix Option B (mạnh hơn):** Chuyển sang **Next.js** (recommended cho SEO)

**Fix Option C (nhanh nhất):** Dùng prerender.io / Rendertron — cho bot Googlebot nhận HTML render sẵn.

- [ ] Đã fix

---

### ❌ Lỗi #15: Thiếu Google Analytics 4 + Search Console
**Fix:** Thêm vào `frontend/index.html`:
```html
<!-- GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- Google Search Console verify -->
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
```

- [ ] Đã fix

---

### ❌ Lỗi #16: Thiếu trang Privacy Policy + Terms (BẮT BUỘC để chạy Google Ads)
**File:** Tạo `frontend/src/pages/Privacy.jsx` và `Terms.jsx`
Nội dung cơ bản:
- Thông tin thu thập: tên, SĐT, email
- Mục đích: đặt lịch, tư vấn
- Bên thứ 3 chia sẻ: Gmail (gửi mail), MongoDB Atlas
- Quyền khách: yêu cầu xóa data (gọi hotline)
- Cookie sử dụng

Thêm route trong `App.jsx`:
```jsx
<Route path="/chinh-sach-bao-mat" element={<Privacy />} />
<Route path="/dieu-khoan" element={<Terms />} />
```

Link ở Footer:
```jsx
<Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
<Link to="/dieu-khoan">Điều khoản sử dụng</Link>
```

- [ ] Đã fix

---

### ❌ Lỗi #17: Cookie consent banner
**Fix:** Hiện banner xin đồng ý cookie (theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân)
```jsx
// frontend/src/components/CookieConsent.jsx
import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cookieConsent")) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="cookie-banner">
      <p>Chúng tôi sử dụng cookie để cải thiện trải nghiệm của bạn.</p>
      <button onClick={() => {
        localStorage.setItem("cookieConsent", "accepted");
        setShow(false);
      }}>Đồng ý</button>
    </div>
  );
}
```

- [ ] Đã fix

---

### ❌ Lỗi #18: Title + meta description giống nhau ở mọi trang
**Vấn đề:** React SPA mặc định không update `<title>` theo route → Google chỉ thấy 1 title
**Fix:**
```bash
cd frontend && npm install react-helmet-async
```
```jsx
// src/main.jsx
import { HelmetProvider } from "react-helmet-async";
<HelmetProvider><App /></HelmetProvider>

// Trong từng page:
import { Helmet } from "react-helmet-async";

export default function Services() {
  return (
    <>
      <Helmet>
        <title>Dịch vụ Spa - Bảo Trâm Beauty Châu Thành, Bến Tre</title>
        <meta name="description" content="Gội đầu dưỡng sinh, massage, chăm sóc da, nail tại Bảo Trâm Spa Bến Tre. Giá tốt - Chuyên nghiệp." />
        <link rel="canonical" href="https://spabaotram.com/dich-vu" />
      </Helmet>
      {/* content */}
    </>
  );
}
```

- [ ] Đã fix (áp dụng cho Home, About, Services, Products, News, Training, Contact)

---

## 🟡 NHÓM 3: PERFORMANCE (Core Web Vitals)

### ❌ Lỗi #19: Google Fonts tải đồng bộ (block render)
**File:** `frontend/index.html:39-42`
**Fix:**
```html
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800;900&family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Dancing+Script:wght@600;700&display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800;900&family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Dancing+Script:wght@600;700&display=swap" media="print" onload="this.media='all'" />
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800;900&family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Dancing+Script:wght@600;700&display=swap" />
</noscript>
```

> Tốt hơn: self-host font (download .woff2 vào `public/fonts/`)

- [ ] Đã fix

---

### ❌ Lỗi #20: Thiếu compression (gzip)
**File:** `backend/src/server.js`
**Fix:**
```bash
cd backend && npm install compression
```
```javascript
const compression = require("compression");
app.use(compression());
```

- [ ] Đã fix

---

### ❌ Lỗi #21: Thiếu lazy loading cho pages
**File:** `frontend/src/App.jsx`
**Fix:**
```jsx
import { lazy, Suspense } from "react";

const Home = lazy(() => import("./pages/Home"));
const Services = lazy(() => import("./pages/Services"));
const News = lazy(() => import("./pages/News"));
// ... các pages khác

<Suspense fallback={<div className="loading">Đang tải...</div>}>
  <Routes>
    <Route path="/" element={<Home />} />
    {/* ... */}
  </Routes>
</Suspense>
```

- [ ] Đã fix

---

### ❌ Lỗi #22: Ảnh không có alt + chưa optimize WebP
**Fix:**
1. Mở `frontend/public/images/`
2. Convert tất cả JPG/PNG → WebP bằng `sharp` hoặc squoosh.app
3. Đảm bảo mọi `<img>` đều có `alt="..."`:
```jsx
<img
  src="/images/goi-dau-duong-sinh.webp"
  alt="Gội đầu dưỡng sinh thảo dược tại Bảo Trâm Spa Bến Tre"
  loading="lazy"
  width="800"
  height="600"
/>
```

- [ ] Đã fix

---

## 🟢 NHÓM 4: PRODUCTION-READY

### ❌ Lỗi #23: Thiếu graceful shutdown
**File:** `backend/src/server.js:597-602`
**Fix:**
```javascript
let server;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`✅ Bao Tram Spa API đang chạy tại http://localhost:${PORT}`);
  });
});

const shutdown = async (signal) => {
  console.log(`\n[${signal}] Đang tắt server...`);
  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      console.log("✅ Đã đóng connection. Bye!");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("⚠️ Force shutdown sau 10s");
      process.exit(1);
    }, 10000);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
  console.error("UnhandledRejection:", err);
});
```

- [ ] Đã fix

---

### ❌ Lỗi #24: Logger console.log thay vì Pino
**Fix:**
```bash
cd backend && npm install pino pino-http pino-pretty
```
```javascript
// backend/src/logger.js
const pino = require("pino");
module.exports = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty" } : undefined,
  redact: {
    paths: ["req.headers.authorization", "req.body.password",
            "req.body.phone", "req.body.email"],
    censor: "***"
  }
});

// server.js
const logger = require("./logger");
const pinoHttp = require("pino-http")({ logger });
app.use(pinoHttp);
// Thay tất cả morgan -> pinoHttp
```

- [ ] Đã fix

---

### ❌ Lỗi #25: Không có index trên MongoDB
**Fix các models** thêm index để query nhanh:
```javascript
// backend/src/models/Booking.js (ví dụ)
bookingSchema.index({ phone: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ date: -1 });

// Customer.js
customerSchema.index({ phone: 1 }, { unique: true });

// Event.js
eventSchema.index({ day: 1, type: 1 });

// Conversation.js
conversationSchema.index({ visitorId: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });
```

- [ ] Đã fix

---

### ❌ Lỗi #26: Không backup MongoDB tự động
**Fix:** Setup cron job trên server backup hằng ngày
```bash
# Trên server production, tạo file /etc/cron.daily/backup-mongodb
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)
# Xóa backup cũ hơn 30 ngày
find /backups -mtime +30 -type d -exec rm -rf {} +
```

Hoặc dùng MongoDB Atlas backup tự động (có sẵn trong gói trả phí).

- [ ] Đã fix

---

### ❌ Lỗi #27: Không có monitoring / error tracking
**Fix:** Tích hợp Sentry (free 5k errors/tháng)
```bash
cd backend && npm install @sentry/node
cd ../frontend && npm install @sentry/react
```
```javascript
// Backend - đầu server.js
const Sentry = require("@sentry/node");
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  app.use(Sentry.Handlers.requestHandler());
}
// Cuối server.js (trước 404 handler):
if (process.env.SENTRY_DSN) app.use(Sentry.Handlers.errorHandler());
```

- [ ] Đã fix

---

### ❌ Lỗi #28: `.env` có thể bị commit
**File:** Kiểm tra `.gitignore`
```bash
cd H:/Spa_BaoTram && cat .gitignore 2>/dev/null
```
Phải có:
```
node_modules/
.env
.env.local
.env.*.local
dist/
build/
backend/uploads/
*.log
.DS_Store
.vscode/
.idea/
```

- [ ] Đã fix

---

### ❌ Lỗi #29: HTTPS chưa enforce
**Fix:** Thêm middleware redirect HTTP → HTTPS
```javascript
// backend/src/server.js (sau khi tạo app)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, "https://" + req.headers.host + req.url);
    }
    next();
  });
}
```

> Tốt hơn: dùng Nginx/Caddy ở phía trước để handle SSL.

- [ ] Đã fix

---

### ❌ Lỗi #30: Không có tests
**Fix:** Tạo basic test cho các route critical
```bash
cd backend && npm install -D jest supertest
```
Tạo `backend/tests/booking.test.js`:
```javascript
const request = require("supertest");
// ... test POST /api/booking, validation, rate limit
```

- [ ] Đã fix (basic test)

---

## 📊 TỔNG KẾT

| Nhóm | Số lỗi | Mức ưu tiên |
|---|---|---|
| 🔴 Bảo mật nghiêm trọng | 9 | NGAY |
| 🟡 SEO Google | 9 | Trước deploy |
| 🟡 Performance | 4 | Trước deploy |
| 🟢 Production-ready | 8 | Trước go-live |
| **TỔNG** | **30** | |

---

## 🎯 LỘ TRÌNH FIX

### Tuần 1 — BẢO MẬT (Bắt buộc trước demo)
1, 2, 3, 4, 5, 6, 7, 8, 9 → 9 lỗi

### Tuần 2 — SEO + PERFORMANCE
10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 → 13 lỗi

### Tuần 3 — PRODUCTION
23, 24, 25, 26, 27, 28, 29, 30 → 8 lỗi

---

## 🚀 SAU KHI FIX XONG

Trước khi deploy public, chạy các tool sau:
- ✅ **Google PageSpeed Insights** — phải > 80 điểm
- ✅ **Google Rich Results Test** — Schema.org phải pass
- ✅ **Google Mobile-Friendly Test**
- ✅ **OWASP ZAP** scan bảo mật cơ bản
- ✅ **Lighthouse** trong Chrome DevTools — score > 90 cả 4 categories
- ✅ **GTmetrix** — đo speed thật

---

## 💡 LƯU Ý

- Fix theo thứ tự ưu tiên — đừng nhảy cóc
- Sau mỗi nhóm, **commit Git** và test toàn bộ flow
- Backup MongoDB trước khi đổi schema (lỗi #25)
- Test trên môi trường staging trước khi đẩy production
