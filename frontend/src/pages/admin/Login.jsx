import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, isLoggedIn } from "../../adminApi";

export default function AdminLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoggedIn()) {
    nav("/admin", { replace: true });
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(form.username, form.password);
      nav("/admin", { replace: true });
    } catch (e2) {
      setErr(
        e2.response?.data?.error ||
          "Không kết nối được máy chủ. Hãy chắc chắn backend đang chạy."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="logo-wrap">
          <b>BẢO TRÂM</b>
          <span>SALON &amp; SPA</span>
        </div>
        <h2>Đăng nhập quản trị</h2>
        {err && <div className="login-err">{err}</div>}
        <div className="fld">
          <label>Tài khoản</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="admin"
            autoFocus
            required
          />
        </div>
        <div className="fld">
          <label>Mật khẩu</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            required
          />
        </div>
        <button className="btn-save" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <div className="login-hint">
          Tài khoản mặc định: <b>admin</b> / <b>baotram@123</b> (đổi trong backend/.env)
        </div>
      </form>
    </div>
  );
}
