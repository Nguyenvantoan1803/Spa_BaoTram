// Xác thực admin đơn giản bằng JWT.
// Tài khoản admin lấy từ biến môi trường (backend/.env).
const jwt = require("jsonwebtoken");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "baotram@123";
const JWT_SECRET = process.env.JWT_SECRET || "doi-chuoi-bi-mat-nay-trong-env";

// Đăng nhập: kiểm tra username/password -> trả về token
function login(req, res) {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: "admin", username }, JWT_SECRET, {
      expiresIn: "7d"
    });
    return res.json({ token, username });
  }
  return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
}

// Middleware bảo vệ các route admin
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Chưa đăng nhập" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại" });
  }
}

module.exports = { login, requireAuth };
