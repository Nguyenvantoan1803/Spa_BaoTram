// Gửi email thông báo cho chủ spa khi có khách đặt lịch / liên hệ.
// Dùng Gmail SMTP qua nodemailer. Cấu hình trong backend/.env:
//   SMTP_USER  = địa chỉ Gmail dùng để gửi (vd vantoan18032001@gmail.com)
//   SMTP_PASS  = App Password 16 ký tự của Gmail đó (KHÔNG phải mật khẩu đăng nhập)
//   OWNER_EMAIL= email nhận thông báo (mặc định = SMTP_USER)
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

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

// Khung email chung (header + footer thương hiệu)
const shell = (title, inner) => `
  <div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:520px;margin:auto">
    <h2 style="color:#1f5c3d;margin:0 0 12px">${title}</h2>
    ${inner}
    <p style="margin-top:18px;color:#6f7268;border-top:1px solid #eee;padding-top:12px">
      Trân trọng,<br/><b style="color:#1f5c3d">Bảo Trâm Beauty Spa &amp; Salon</b>
    </p>
  </div>`;

// Dựng khối hiển thị mã ưu đãi + ảnh QR (đính kèm dạng CID để email hiện được).
// Trả về { html, attachments }.
async function voucherBlock(code, desc) {
  if (!code) return { html: "", attachments: [] };
  let qrImg = "", attachments = [];
  try {
    const buf = await QRCode.toBuffer(String(code), { width: 220, margin: 1 });
    attachments = [{ filename: "voucher-qr.png", content: buf, cid: "voucherqr" }];
    qrImg = `<div style="margin-top:12px">
        <img src="cid:voucherqr" alt="QR ${esc(code)}" width="150" height="150" style="border-radius:8px;border:1px solid #eee"/>
        <div style="font-size:12px;color:#9a6a00;margin-top:4px">📱 Đưa mã QR này cho nhân viên quét khi đến spa</div>
      </div>`;
  } catch (e) {
    console.error("⚠️ Tạo QR thất bại, gửi mã chữ:", e.message);
  }
  const html = `<div style="margin-top:14px;padding:14px;border:2px dashed #c9a55c;border-radius:10px;text-align:center;background:#fffaf0">
      <div style="font-size:13px;color:#9a6a00">Mã ưu đãi của bạn</div>
      <div style="font-size:26px;font-weight:800;color:#1f5c3d;letter-spacing:2px;margin:4px 0">${esc(code)}</div>
      <div style="font-size:13px;color:#6f7268">${esc(desc)}</div>
      ${qrImg}
    </div>`;
  return { html, attachments };
}

// Gửi email NHẮC LỊCH cho khách. Trả về true nếu gửi thành công.
async function sendReminderMail(to, { name, service, date, branch } = {}) {
  if (!transporter || !to) return false;
  const html = shell("💆 Nhắc lịch hẹn tại Bảo Trâm Spa", `
    <p>Xin chào <b>${esc(name)}</b>, Bảo Trâm Spa xin nhắc bạn lịch hẹn sắp tới:</p>
    <table style="border-collapse:collapse;margin-top:6px">
      <tr><td style="padding:6px 14px 6px 0"><b>Dịch vụ</b></td><td>${esc(service)}</td></tr>
      <tr><td style="padding:6px 14px 6px 0"><b>Thời gian</b></td><td>${esc(date)}</td></tr>
      <tr><td style="padding:6px 14px 6px 0"><b>Cơ sở</b></td><td>${esc(branch)}</td></tr>
    </table>
    <p style="margin-top:12px">Hẹn gặp bạn! Nếu cần đổi lịch, vui lòng phản hồi email hoặc gọi cho chúng tôi nhé.</p>`);
  try {
    await transporter.sendMail({
      from: `"Bảo Trâm Spa" <${SMTP_USER}>`,
      to,
      subject: `💆 Nhắc lịch hẹn: ${esc(service)} - ${esc(date)}`,
      html
    });
    console.log("📧 Đã gửi email nhắc lịch tới", to);
    return true;
  } catch (err) {
    console.error("❌ Gửi email nhắc lịch thất bại:", err.message);
    return false;
  }
}

// Gửi email CHÚC MỪNG SINH NHẬT cho khách (kèm mã ưu đãi nếu có).
async function sendBirthdayMail(to, { name, voucherCode, voucherDesc } = {}) {
  if (!transporter || !to) return false;
  const vb = await voucherBlock(voucherCode, voucherDesc);
  const html = shell("🎉 Chúc mừng sinh nhật!", `
    <p>Bảo Trâm Spa thân gửi <b>${esc(name)}</b>,</p>
    <p>Chúc bạn một sinh nhật thật rạng rỡ và tràn đầy hạnh phúc! 🎂<br/>
       Cảm ơn bạn đã luôn tin tưởng và đồng hành cùng Bảo Trâm Spa.</p>
    ${vb.html}`);
  try {
    await transporter.sendMail({
      from: `"Bảo Trâm Spa" <${SMTP_USER}>`,
      to,
      subject: `🎉 Bảo Trâm Spa chúc mừng sinh nhật ${esc(name)}!`,
      html,
      attachments: vb.attachments
    });
    console.log("📧 Đã gửi email sinh nhật tới", to);
    return true;
  } catch (err) {
    console.error("❌ Gửi email sinh nhật thất bại:", err.message);
    return false;
  }
}

// Gửi email MỜI ĐÁNH GIÁ sau dịch vụ (kèm link tới trang đánh giá).
async function sendReviewRequestMail(to, { name, service, link } = {}) {
  if (!transporter || !to) return false;
  const html = shell("⭐ Bạn thấy dịch vụ thế nào?", `
    <p>Xin chào <b>${esc(name)}</b>, cảm ơn bạn đã sử dụng dịch vụ <b>${esc(service)}</b> tại Bảo Trâm Spa!</p>
    <p>Bạn dành 30 giây đánh giá để chúng tôi phục vụ tốt hơn nhé:</p>
    <p style="text-align:center;margin:18px 0">
      <a href="${esc(link)}" style="background:#1f5c3d;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:700;display:inline-block">
        ⭐ Đánh giá ngay
      </a>
    </p>
    <p style="font-size:13px;color:#6f7268">Hoặc mở liên kết: <br/>${esc(link)}</p>`);
  try {
    await transporter.sendMail({
      from: `"Bảo Trâm Spa" <${SMTP_USER}>`,
      to,
      subject: "⭐ Mời bạn đánh giá dịch vụ tại Bảo Trâm Spa",
      html
    });
    console.log("📧 Đã gửi email mời đánh giá tới", to);
    return true;
  } catch (err) {
    console.error("❌ Gửi email mời đánh giá thất bại:", err.message);
    return false;
  }
}

// Gửi email KHUYẾN MÃI (chiến dịch dịp lễ / sinh nhật spa) kèm mã giảm giá.
async function sendPromoMail(to, { name, title, message, voucherCode, voucherDesc } = {}) {
  if (!transporter || !to) return false;
  const vb = await voucherBlock(voucherCode, voucherDesc);
  const html = shell(`🎁 ${esc(title || "Ưu đãi đặc biệt")}`, `
    <p>Bảo Trâm Spa thân gửi <b>${esc(name || "Quý khách")}</b>,</p>
    <p>${esc(message || "Bảo Trâm Spa gửi tặng bạn ưu đãi đặc biệt. Hẹn gặp bạn tại spa nhé!")}</p>
    ${vb.html}`);
  try {
    await transporter.sendMail({
      from: `"Bảo Trâm Spa" <${SMTP_USER}>`,
      to,
      subject: `🎁 ${esc(title || "Ưu đãi đặc biệt từ Bảo Trâm Spa")}`,
      html,
      attachments: vb.attachments
    });
    return true;
  } catch (err) {
    console.error("❌ Gửi email khuyến mãi thất bại:", err.message);
    return false;
  }
}

module.exports = {
  sendBookingMail, sendContactMail, sendReminderMail, sendBirthdayMail, sendReviewRequestMail, sendPromoMail
};
