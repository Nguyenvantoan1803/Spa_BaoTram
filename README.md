# Bảo Trâm Beauty Spa & Salon

Website spa làm đẹp gồm **Frontend React (Vite)** và **Backend Express + MongoDB (Node.js 20)**, dựa trên nội dung của https://spabaotram.com

## Cấu trúc

```
spa-baotram/
├── backend/          # API Express + MongoDB (Mongoose)
│   ├── .env          # Chuỗi kết nối MongoDB (bạn tự điền)
│   └── src/
│       ├── server.js     # Khởi tạo server + routes
│       ├── db.js         # Kết nối MongoDB
│       ├── data.js       # Dữ liệu mẫu
│       ├── seed.js       # Script nạp dữ liệu vào MongoDB
│       └── models/       # Mongoose schemas
└── frontend/         # React + Vite
    └── src/
        ├── pages/        # Các trang (Home, Services, Contact...)
        ├── components/   # Navbar, Footer...
        ├── api.js        # Gọi API backend
        └── styles.css    # Giao diện
```

## Cách chạy

> Yêu cầu: **Node.js 20** (đã cài qua nvm) và một **MongoDB Atlas** cluster (miễn phí).

### 1. Backend (chạy trước)

**Bước 1 — Cấu hình kết nối MongoDB:**

Mở file `backend/.env`, dán chuỗi kết nối Atlas của bạn vào `MONGODB_URI`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/spabaotram?retryWrites=true&w=majority
PORT=5000
```

> Lấy chuỗi tại: Atlas → Database → **Connect** → **Drivers** → Node.js. Nhớ thay `<password>` bằng mật khẩu thật và whitelist IP (Network Access → Add IP `0.0.0.0/0` cho dễ test).

**Bước 2 — Cài đặt & nạp dữ liệu & chạy:**

```bash
cd backend
npm install
npm run seed     # nạp dữ liệu mẫu vào MongoDB (chạy 1 lần)
npm run dev      # hoặc: npm start
```

API chạy tại: http://localhost:5000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Web chạy tại: http://localhost:3000 (đã proxy `/api` sang backend cổng 5000).

## API endpoints

| Method | Endpoint              | Mô tả                     |
|--------|-----------------------|---------------------------|
| GET    | /api/info             | Thông tin doanh nghiệp    |
| GET    | /api/services         | Danh sách dịch vụ         |
| GET    | /api/combos           | Combo ưu đãi              |
| GET    | /api/products         | Sản phẩm                  |
| GET    | /api/news             | Tin tức                   |
| GET    | /api/trainings        | Khóa đào tạo              |
| GET    | /api/testimonials     | Đánh giá khách hàng       |
| POST   | /api/booking          | Đặt lịch                  |
| POST   | /api/contact          | Gửi liên hệ               |

## Trang

Trang chủ · Giới thiệu · Dịch vụ · Sản phẩm · Đào tạo · Tin tức · Liên hệ & Đặt lịch

## Trang quản trị (Admin)

Truy cập: **http://localhost:3000/admin**

- **Tài khoản mặc định:** `admin` / `baotram@123` — đổi trong `backend/.env`
  (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, và đặt lại `JWT_SECRET` cho an toàn).
- Quản lý: **Tin tức/Bài viết, Combo, Dịch vụ, Sản phẩm** (thêm/sửa/xoá) và
  xem **Đặt lịch, Liên hệ** khách gửi từ website.
- Yêu cầu: backend đang chạy + đã kết nối MongoDB (đã chạy `npm run seed` ít nhất 1 lần).

> Các API ghi (POST/PUT/DELETE) đều được bảo vệ bằng JWT — phải đăng nhập admin mới gọi được.
