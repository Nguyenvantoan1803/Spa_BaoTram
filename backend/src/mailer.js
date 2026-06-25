// Gửi email thông báo cho chủ spa khi có khách đặt lịch / liên hệ.
// Dùng Gmail SMTP qua nodemailer. Cấu hình trong backend/.env:
//   SMTP_USER  = địa chỉ Gmail dùng để gửi (vd vantoan18032001@gmail.com)
//   SMTP_PASS  = App Password 16 ký tự của Gmail đó (KHÔNG phải mật khẩu đăng nhập)
//   OWNER_EMAIL= email nhận thông báo (mặc định = SMTP_USER)
const nodemailer = require("nodemailer");

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const OWNER_EMAIL = process.env.OWNER_EMAIL || SMTP_USER;

let transporter = null;
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
} else {
  console.warn(
    "⚠️  Chưa cấu hình SMTP_USER/SMTP_PASS trong .env — sẽ KHÔNG gửi email thông báo đặt lịch."
  );
}

const esc = (v) => (v == null || v === "" ? "—" : String(v));

// Gửi mail thông báo đặt lịch. Không throw để không làm hỏng API đặt lịch.
async function sendBookingMail(booking) {
  if (!transporter) return;
  const { name, phone, service, date, note } = booking;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#222">
      <h2 style="color:#1f5c3d;margin:0 0 12px">🔔 Có khách đặt lịch mới</h2>
      <table style="border-collapse:collapse">
        <tr><td style="padding:6px 14px 6px 0"><b>Khách hàng</b></td><td>${esc(name)}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><b>Điện thoại</b></td><td>${esc(phone)}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><b>Dịch vụ</b></td><td>${esc(service)}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><b>Ngày hẹn</b></td><td>${esc(date)}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><b>Ghi chú</b></td><td>${esc(note)}</td></tr>
      </table>
      <p style="margin-top:14px;color:#6f7268">— Bảo Trâm Salon &amp; Spa</p>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"Bảo Trâm Spa" <${SMTP_USER}>`,
      to: OWNER_EMAIL,
      subject: `📅 Đặt lịch mới: ${esc(name)} - ${esc(phone)}`,
      html
    });
    console.log("📧 Đã gửi email đặt lịch tới", OWNER_EMAIL);
  } catch (err) {
    console.error("❌ Gửi email đặt lịch thất bại:", err.message);
  }
}

// Gửi mail thông báo liên hệ.
async function sendContactMail(entry) {
  if (!transporter) return;
  const { name, email, phone, message } = entry;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#222">
      <h2 style="color:#1f5c3d;margin:0 0 12px">✉️ Có tin nhắn liên hệ mới</h2>
      <table style="border-collapse:collapse">
        <tr><td style="padding:6px 14px 6px 0"><b>Họ tên</b></td><td>${esc(name)}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><b>Email</b></td><td>${esc(email)}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><b>Điện thoại</b></td><td>${esc(phone)}</td></tr>
        <tr><td style="padding:6px 14px 6px 0"><b>Nội dung</b></td><td>${esc(message)}</td></tr>
      </table>
      <p style="margin-top:14px;color:#6f7268">— Bảo Trâm Salon &amp; Spa</p>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"Bảo Trâm Spa" <${SMTP_USER}>`,
      to: OWNER_EMAIL,
      subject: `✉️ Liên hệ mới: ${esc(name)}`,
      html
    });
    console.log("📧 Đã gửi email liên hệ tới", OWNER_EMAIL);
  } catch (err) {
    console.error("❌ Gửi email liên hệ thất bại:", err.message);
  }
}

module.exports = { sendBookingMail, sendContactMail };
