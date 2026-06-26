// Xac thuc admin bang JWT + bcrypt password hashing
// Tat ca config phai co trong .env (khong cho fallback default de an toan)
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

// BAT BUOC co cac env, khong cho default
if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
  console.error(
    "❌ THIEU env: ADMIN_USERNAME, ADMIN_PASSWORD_HASH hoac JWT_SECRET.\n" +
    "   Tao bcrypt hash bang: node -e \"console.log(require('bcryptjs').hashSync('matkhau', 10))\"\n" +
    "   Tao JWT secret bang: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
  );
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET phai it nhat 32 ky tu de an toan.");
  process.exit(1);
}

// Dang nhap: kiem tra username/password (bcrypt) -> tra ve token
async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(401).json({ error: "Sai tai khoan hoac mat khau" });
  }

  // Khong leak thong tin: tra cung 1 thong bao cho moi sai user va sai mat khau
  if (username !== ADMIN_USERNAME) {
    // Van chay bcrypt de tranh timing attack (response time deu nhau)
    await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    return res.status(401).json({ error: "Sai tai khoan hoac mat khau" });
  }

  try {
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ error: "Sai tai khoan hoac mat khau" });
    }
  } catch (err) {
    console.error("Loi bcrypt:", err.message);
    return res.status(500).json({ error: "Loi may chu" });
  }

  const token = jwt.sign({ role: "admin", username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
  return res.json({ token, username });
}

// Middleware bao ve cac route admin
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Chua dang nhap" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Phien dang nhap het han, vui long dang nhap lai" });
  }
}

module.exports = { login, requireAuth };
