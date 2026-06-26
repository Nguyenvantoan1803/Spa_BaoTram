# Hướng dẫn deploy Bảo Trâm Spa lên VPS

Mô hình: **1 VPS chạy cả frontend + backend**, Nginx làm reverse proxy
(`tenmien.com` → web tĩnh, `tenmien.com/api` → backend Node), HTTPS miễn phí qua Let's Encrypt,
MongoDB vẫn dùng Atlas (cloud).

> Thay `tenmien.com` bằng tên miền thật, `1.2.3.4` bằng IP VPS của bạn ở mọi nơi bên dưới.

---

## 0. Chuẩn bị

- **VPS** Ubuntu 22.04 (DigitalOcean / Vultr / AZDIGI... ~100–250k đ/tháng, RAM ≥ 1GB)
- **Tên miền** đã mua
- **Chuỗi MongoDB Atlas** (đang dùng ở `backend/.env`)
- Phần mềm SSH: dùng **PowerShell** (Windows 10+ có sẵn lệnh `ssh`)

---

## 1. Trỏ tên miền về VPS

Vào trang quản lý tên miền → mục **DNS**, tạo 2 bản ghi:

| Type | Name | Value |
|------|------|-------|
| A    | @    | 1.2.3.4 |
| A    | www  | 1.2.3.4 |

Đợi 5–30 phút cho DNS cập nhật. Kiểm tra: `ping tenmien.com` ra đúng IP VPS.

---

## 2. Cài đặt server (chạy 1 lần)

SSH vào VPS:
```bash
ssh root@1.2.3.4
```

Cài Node.js 20 + Nginx + PM2 + git + certbot:
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
apt install -y certbot python3-certbot-nginx
node -v   # phải >= 20
```

Mở tường lửa:
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## 3. Đưa code lên VPS

**Cách A — qua Git (khuyên dùng):** push code lên GitHub rồi:
```bash
cd /var/www
git clone <ĐỊA_CHỈ_GIT_CỦA_BẠN> spabaotram
cd spabaotram
```

**Cách B — upload trực tiếp:** từ máy Windows (PowerShell), nén & gửi:
```powershell
scp -r H:\Spa_BaoTram root@1.2.3.4:/var/www/spabaotram
```
(bỏ qua `node_modules`, sẽ cài lại trên server)

---

## 4. Cấu hình & chạy BACKEND

```bash
cd /var/www/spabaotram/backend
npm install --omit=dev
```

Tạo bcrypt hash mật khẩu admin + JWT secret:
```bash
node -e "console.log(require('bcryptjs').hashSync('MAT_KHAU_ADMIN_MOI', 10))"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Tạo file `.env` production:
```bash
nano /var/www/spabaotram/backend/.env
```
Dán nội dung (điền giá trị thật):
```env
MONGODB_URI=mongodb+srv://DataBaoTram:MAT_KHAU@cluster0.9qpypgo.mongodb.net/spabaotram?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
NODE_ENV=production
TRUST_PROXY=1
CLIENT_ORIGIN=https://tenmien.com,https://www.tenmien.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<dán hash vừa tạo>
JWT_SECRET=<dán secret vừa tạo>
JWT_EXPIRES_IN=1d
SMTP_USER=email@gmail.com
SMTP_PASS=app-password-16-ky-tu
OWNER_EMAIL=email@gmail.com
```
Lưu: `Ctrl+O` → Enter → `Ctrl+X`.

Chạy backend bằng PM2:
```bash
cd /var/www/spabaotram/backend
pm2 start src/server.js --name baotram-api
pm2 save
pm2 startup        # chạy lệnh nó in ra để backend tự bật lại khi reboot
pm2 logs baotram-api   # xem có "✅ Đã kết nối MongoDB" không
```

---

## 5. Build & đặt FRONTEND

Vì cùng domain (Nginx proxy `/api`), **không cần** `VITE_API_URL` — build bình thường:
```bash
cd /var/www/spabaotram/frontend
npm install
npm run build      # tạo thư mục dist/
```

---

## 6. Cấu hình Nginx

```bash
nano /etc/nginx/sites-available/spabaotram
```
Dán:
```nginx
server {
    listen 80;
    server_name tenmien.com www.tenmien.com;

    # Frontend (web tĩnh đã build)
    root /var/www/spabaotram/frontend/dist;
    index index.html;

    # SPA: mọi route trả về index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API -> backend Node (cổng 5000)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache tài nguyên tĩnh
    location ~* \.(js|css|jpg|jpeg|png|webp|svg|woff2)$ {
        expires 6M;
        add_header Cache-Control "public";
    }

    client_max_body_size 8M;   # cho phép gửi ảnh qua chat
}
```
Bật site + kiểm tra cú pháp + reload:
```bash
ln -s /etc/nginx/sites-available/spabaotram /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Giờ vào `http://tenmien.com` đã thấy web (chưa có ổ khóa).

---

## 7. Bật HTTPS (ổ khóa 🔒 — miễn phí)

```bash
certbot --nginx -d tenmien.com -d www.tenmien.com
```
Làm theo hướng dẫn (nhập email, chọn redirect HTTP→HTTPS). Certbot tự gia hạn.

Vào `https://tenmien.com` → đã có ổ khóa. ✅

---

## 8. Cho phép VPS kết nối MongoDB Atlas

Vào Atlas → **Network Access** → **Add IP Address** → nhập **IP VPS** (`1.2.3.4`)
→ Confirm. (Hoặc `0.0.0.0/0` để cho mọi nơi — kém an toàn hơn.)

---

## 9. Vận hành & cập nhật sau này

```bash
pm2 status                 # xem backend
pm2 logs baotram-api       # xem log
pm2 restart baotram-api    # khởi động lại backend

# Khi sửa code mới:
cd /var/www/spabaotram
git pull                                   # nếu dùng Git
cd backend && npm install --omit=dev && pm2 restart baotram-api
cd ../frontend && npm install && npm run build   # Nginx tự phục vụ dist mới
```

---

## 10. SEO sau khi lên domain (tuỳ chọn)

- Sửa `spabaotram.com` → tên miền thật trong: `frontend/index.html`, `frontend/public/sitemap.xml`, `frontend/public/robots.txt` (rồi build lại).
- Đăng ký **Google Search Console** (miễn phí) → dán mã xác minh vào `index.html` → submit `sitemap.xml`.

---

## Checklist nhanh
- [ ] DNS trỏ về IP VPS
- [ ] Cài Node 20 + Nginx + PM2 + certbot
- [ ] Backend `.env` đủ biến (CLIENT_ORIGIN, ADMIN_PASSWORD_HASH, JWT_SECRET...)
- [ ] `pm2 logs` thấy "✅ Đã kết nối MongoDB"
- [ ] `npm run build` xong frontend
- [ ] Nginx reverse proxy `/api` + SPA fallback
- [ ] HTTPS qua certbot
- [ ] Atlas Network Access thêm IP VPS
- [ ] Đăng nhập `https://tenmien.com/admin` thử
