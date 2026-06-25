// Dữ liệu dịch vụ dùng chung cho cả trang Dịch vụ và các form đặt lịch.
// Dùng làm dự phòng khi backend chưa chạy (đồng bộ với backend/src/data.js).

// Các bước dùng chung cho gói Massage Body (90 phút / 120 phút)
export const BODY_MASSAGE_STEPS = [
  "Đeo mặt nạ thảo dược thư giãn sâu",
  "Tác động 5 huyệt đạo kích hoạt tuần hoàn",
  "Kích thích khứu giác bằng tinh dầu thư giãn",
  "Làm ấm cơ thể và massage cổ - vai - gáy trị liệu",
  "Massage bằng gậy đá nóng thông kinh lạc",
  "Massage tay và chân giảm căng thẳng mỏi",
  "Đi đá nóng trên lưng thư giãn sâu",
  "Vận cột sống 6 chiều giải phóng áp lực"
];

export const SERVICES_DATA = [
  {
    id: "goi-dau", name: "Gội đầu dưỡng sinh", icon: "💆‍♀️",
    description: "Gội đầu thảo dược kết hợp massage cổ vai gáy, giải tỏa căng thẳng.",
    items: [
      {
        name: "Gội siêu sạch", duration: "30 phút", price: 60000,
        steps: [
          "Tẩy trang - rửa mặt",
          "Massage sữa non nâng cơ",
          "Đắp mặt nạ dưỡng da",
          "Gội thảo dược 2 lần",
          "Ủ tóc mềm mượt",
          "Massage da đầu",
          "Massage cổ - vai - gáy",
          "Xả + xịt dưỡng + sấy"
        ]
      },
      {
        name: "Gội tiện lợi", duration: "45 phút", price: 80000,
        steps: [
          "Cạo mặt - Tẩy trang - Rửa mặt",
          "Massage mặt nâng cơ + ấn huyệt bằng sữa non",
          "Đắp nạ B5 + nạ mặt giảm thâm",
          "Chườm bụng + chân thảo dược",
          "Ủ tóc mềm mượt",
          "Massage da đầu",
          "Massage cổ - vai - gáy",
          "Xả + xịt dưỡng + sấy"
        ]
      },
      {
        name: "Gội thư giãn", duration: "90 phút", price: 129000,
        steps: [
          "Chườm thảo dược mắt - bụng - chân",
          "Massage thư giãn cổ - vai - gáy",
          "Tẩy trang - tẩy tế bào chết da mặt",
          "Rửa mặt dịu nhẹ",
          "Massage mặt nâng cơ sữa non",
          "Đắp nạ B5 dưỡng da + nạ mặt giảm thâm",
          "Gội đầu thảo dược 2 lần",
          "Ủ tóc phục hồi mềm mượt",
          "Massage tay giảm mỏi",
          "Massage chân lưu thông khí huyết",
          "Massage tinh dầu - hỗ trợ ngủ ngon",
          "Xông tai thư giãn - làm dịu thần kinh",
          "Xả - sấy - xịt dưỡng"
        ]
      }
    ]
  },
  {
    id: "massage-body", name: "Massage trị liệu giải cơ", icon: "🧖‍♀️",
    description: "Trị liệu giải phóng cơ, thư giãn sâu toàn thân bằng thảo dược.",
    items: [
      {
        name: "Gói Giải Phóng Cơ", duration: "90 phút", price: 219000,
        steps: [
          "Khởi động khí huyết",
          "Đả thông vai gáy",
          "Liệu pháp nhiệt thảo dược",
          "Thư giãn tay - chân",
          "Thanh lọc làn da",
          "Nâng cơ - thư giãn sâu",
          "Tinh lọc da đầu thảo dược",
          "Phục hồi tóc - an thần",
          "Hoàn thiện dưỡng ẩm"
        ]
      },
      {
        name: "Gói Massage Body", duration: "90 phút", price: 350000,
        steps: BODY_MASSAGE_STEPS
      },
      {
        name: "Gói Massage Body", duration: "120 phút", price: 400000,
        steps: BODY_MASSAGE_STEPS
      }
    ]
  }
];

// Gộp tất cả gói dịch vụ thành danh sách tên để đổ vào ô "Chọn dịch vụ".
// Mỗi mục: "Tên dịch vụ - Tên gói (thời lượng)"
export function buildServiceOptions(services) {
  const list = services && services.length ? services : SERVICES_DATA;
  const opts = [];
  list.forEach((s) => {
    if (s.items && s.items.length) {
      s.items.forEach((it) => {
        const dur = it.duration ? ` (${it.duration})` : "";
        opts.push(`${s.name} - ${it.name}${dur}`);
      });
    } else {
      opts.push(s.name);
    }
  });
  return opts;
}
