// Kiểm tra & làm sạch dữ liệu đầu vào cho các endpoint công khai.
// Dùng express-validator: nếu sai sẽ trả 400 kèm thông báo tiếng Việt.
const { body, validationResult } = require("express-validator");

// Middleware gom lỗi: đặt SAU danh sách rule. Có lỗi -> 400 với câu đầu tiên.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ error: errors.array()[0].msg });
}

// SĐT: cho phép số, khoảng trắng, dấu + và -, độ dài 8-15 ký tự
const PHONE_RE = /^[0-9+\-\s]{8,15}$/;

const rules = {
  // Đăng nhập admin (không trim mật khẩu)
  login: [
    body("username").trim().notEmpty().withMessage("Vui lòng nhập tài khoản")
      .bail().isLength({ max: 80 }).withMessage("Tài khoản quá dài"),
    body("password").notEmpty().withMessage("Vui lòng nhập mật khẩu")
      .bail().isLength({ max: 200 }).withMessage("Mật khẩu quá dài")
  ],

  // Đặt lịch
  booking: [
    body("name").trim().notEmpty().withMessage("Vui lòng nhập họ tên")
      .bail().isLength({ max: 80 }).withMessage("Họ tên quá dài"),
    body("phone").trim().notEmpty().withMessage("Vui lòng nhập số điện thoại")
      .bail().matches(PHONE_RE).withMessage("Số điện thoại không hợp lệ"),
    body("service").trim().notEmpty().withMessage("Vui lòng chọn dịch vụ")
      .bail().isLength({ max: 200 }).withMessage("Tên dịch vụ quá dài"),
    body("branch").optional({ checkFalsy: true }).isLength({ max: 200 }).withMessage("Tên cơ sở quá dài"),
    body("date").optional({ checkFalsy: true }).isLength({ max: 50 }).withMessage("Ngày hẹn không hợp lệ"),
    body("note").optional({ checkFalsy: true }).isLength({ max: 1000 }).withMessage("Ghi chú quá dài")
  ],

  // Liên hệ
  contact: [
    body("name").trim().notEmpty().withMessage("Vui lòng nhập họ tên")
      .bail().isLength({ max: 80 }).withMessage("Họ tên quá dài"),
    body("message").trim().notEmpty().withMessage("Vui lòng nhập nội dung")
      .bail().isLength({ max: 2000 }).withMessage("Nội dung quá dài"),
    body("email").optional({ checkFalsy: true }).isEmail().withMessage("Email không hợp lệ")
      .bail().isLength({ max: 120 }).withMessage("Email quá dài"),
    body("phone").optional({ checkFalsy: true }).matches(PHONE_RE).withMessage("Số điện thoại không hợp lệ")
  ]
};

module.exports = { validate, rules };
