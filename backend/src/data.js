// Dữ liệu mẫu cho Bảo Trâm Beauty Spa & Salon
// Trong thực tế có thể thay bằng database (MongoDB / MySQL...)

const businessInfo = {
  name: "Bảo Trâm Beauty Spa & Salon",
  slogan: "Tôn vinh vẻ đẹp tự nhiên của bạn",
  phone: "0327 322 722",
  email: "thanhhai.bnr@gmail.com",
  website: "https://spabaotram.com",
  branches: [
    "CN4: Chợ Ba Lai, Tam Phước, Châu Thành (đối diện Điện Máy Anh Khoa)",
    "CN5: Gần ngã tư huyện hướng ra vòng xoay An Khánh (kế bên Nhà xe Thịnh Phát)"
  ],
  workingHours: "08:00 - 21:00 (Thứ 2 - Chủ nhật)",
  socials: {
    facebook: "https://facebook.com/spabaotram",
    instagram: "https://instagram.com/spabaotram",
    zalo: "0327322722"
  }
};

// Các bước dùng chung cho gói Massage Body (90 phút / 120 phút)
const bodyMassageSteps = [
  "Đeo mặt nạ thảo dược thư giãn sâu",
  "Tác động 5 huyệt đạo kích hoạt tuần hoàn",
  "Kích thích khứu giác bằng tinh dầu thư giãn",
  "Làm ấm cơ thể và massage cổ - vai - gáy trị liệu",
  "Massage bằng gậy đá nóng thông kinh lạc",
  "Massage tay và chân giảm căng thẳng mỏi",
  "Đi đá nóng trên lưng thư giãn sâu",
  "Vận cột sống 6 chiều giải phóng áp lực"
];

const services = [
  {
    id: "goi-dau",
    name: "Gội đầu dưỡng sinh",
    icon: "💆‍♀️",
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
    id: "massage-body",
    name: "Massage trị liệu giải cơ",
    icon: "🧖‍♀️",
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
        steps: bodyMassageSteps
      },
      {
        name: "Gói Massage Body", duration: "120 phút", price: 400000,
        steps: bodyMassageSteps
      }
    ]
  }
];

const combos = [
  {
    id: "combo-goi-dau-vip",
    name: "Combo gội đầu dưỡng sinh VIP",
    badge: "HOT",
    best: false,
    oldPrice: "199K",
    price: "99K",
    image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&q=80",
    items: ["Gội đầu thảo dược", "Massage cổ vai gáy", "Đắp mặt nạ dưỡng da", "Xông thảo dược"],
    gift: "Thư giãn 10 phút"
  },
  {
    id: "combo-cham-soc-da",
    name: "Combo chăm sóc da mặt chuyên sâu",
    badge: "BEST SELLER",
    best: true,
    oldPrice: "299K",
    price: "149K",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
    items: ["Làm sạch sâu", "Massage nâng cơ mặt", "Đắp mặt nạ cao cấp", "Chiếu ánh sáng sinh học"],
    gift: "Serum dưỡng da"
  },
  {
    id: "combo-massage-body",
    name: "Combo massage body thư giãn",
    badge: "HOT",
    best: false,
    oldPrice: "399K",
    price: "199K",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80",
    items: ["Massage body toàn thân", "Tinh dầu thảo dược", "Giảm đau nhức, căng cơ", "Thư giãn, ngủ ngon hơn"],
    gift: "Giác hơi (vai gáy)"
  },
  {
    id: "combo-foot",
    name: "Combo Foot dưỡng sinh",
    badge: "HOT",
    best: false,
    oldPrice: "179K",
    price: "89K",
    image: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=600&q=80",
    items: ["Ngâm chân thảo dược", "Massage foot chuyên sâu", "Kích thích huyệt đạo", "Giảm đau nhức, mỏi chân"],
    gift: "Chườm nóng"
  }
];

const products = [
  {
    id: "p1",
    name: "Dầu gội thảo dược Bảo Trâm",
    price: 180000,
    category: "Chăm sóc tóc",
    image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&q=80",
    description: "Dầu gội chiết xuất thảo dược thiên nhiên, sạch gàu, mượt tóc."
  },
  {
    id: "p2",
    name: "Dầu xả phục hồi tóc hư tổn",
    price: 160000,
    category: "Chăm sóc tóc",
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&q=80",
    description: "Phục hồi tóc khô xơ, chẻ ngọn, nuôi dưỡng tóc từ gốc."
  },
  {
    id: "p3",
    name: "Serum dưỡng da ban đêm",
    price: 320000,
    category: "Chăm sóc da",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
    description: "Cấp ẩm, tái tạo da, giúp da căng mịn rạng rỡ."
  },
  {
    id: "p4",
    name: "Mặt nạ đất sét thanh lọc",
    price: 150000,
    category: "Chăm sóc da",
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=500&q=80",
    description: "Làm sạch sâu lỗ chân lông, kiểm soát dầu nhờn hiệu quả."
  }
];

const news = [
  {
    id: "n1",
    title: "Ưu đãi 30% combo làm đẹp dịp hè 2026",
    date: "2026-06-01",
    excerpt: "Nhân dịp hè, Bảo Trâm Spa giảm giá 30% cho tất cả combo làm đẹp.",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
    content: "Từ ngày 01/06 đến 31/08/2026, Bảo Trâm Beauty Spa & Salon triển khai chương trình ưu đãi giảm 30% cho tất cả các combo làm đẹp. Đây là cơ hội tuyệt vời để bạn chăm sóc bản thân với mức giá ưu đãi nhất."
  },
  {
    id: "n2",
    title: "Khai trương chi nhánh 3 tại An Hiệp",
    date: "2026-05-15",
    excerpt: "Bảo Trâm Spa chính thức khai trương chi nhánh thứ 3 tại xã An Hiệp.",
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
    content: "Với sự tin yêu của khách hàng, Bảo Trâm Beauty Spa & Salon vui mừng khai trương chi nhánh thứ 3 tại xã An Hiệp, Châu Thành, Bến Tre. Nhiều quà tặng hấp dẫn dành cho 100 khách hàng đầu tiên."
  },
  {
    id: "n3",
    title: "Bí quyết chăm sóc da mùa hè",
    date: "2026-05-02",
    excerpt: "Những lưu ý quan trọng để giữ làn da khỏe đẹp trong mùa hè nắng nóng.",
    image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80",
    content: "Mùa hè với ánh nắng gay gắt là thử thách lớn cho làn da. Hãy cùng Bảo Trâm Spa tìm hiểu những bí quyết chăm sóc da đúng cách: chống nắng, cấp ẩm, làm sạch sâu và bổ sung dưỡng chất phù hợp."
  }
];

const trainings = [
  {
    id: "t1",
    name: "Khóa học Spa chuyên nghiệp",
    duration: "3 tháng",
    price: 8000000,
    description: "Đào tạo từ cơ bản đến nâng cao về chăm sóc da, massage, spa trị liệu."
  },
  {
    id: "t2",
    name: "Khóa học Nail nghệ thuật",
    duration: "2 tháng",
    price: 5000000,
    description: "Học sơn gel, vẽ nail, đắp bột, thiết kế mẫu nail theo xu hướng."
  },
  {
    id: "t3",
    name: "Khóa học Tạo mẫu tóc",
    duration: "4 tháng",
    price: 10000000,
    description: "Đào tạo cắt, uốn, nhuộm, tạo kiểu tóc chuyên nghiệp."
  }
];

const testimonials = [
  {
    id: "r1",
    name: "Minh Anh",
    loc: "Châu Thành, Bến Tre",
    rating: 5,
    img: "https://i.pravatar.cc/120?img=47",
    comment: "Gội đầu rất thư giãn, nhẹ đầu hẳn, ngủ ngon hơn. Sẽ quay lại thường xuyên!"
  },
  {
    id: "r2",
    name: "Thanh Trúc",
    loc: "Tam Phước, Bến Tre",
    rating: 5,
    img: "https://i.pravatar.cc/120?img=32",
    comment: "Da mặt sáng lên thấy rõ, nhân viên dễ thương, phục vụ chu đáo."
  },
  {
    id: "r3",
    name: "Kim Ngân",
    loc: "Tân Thạch, Bến Tre",
    rating: 5,
    img: "https://i.pravatar.cc/120?img=45",
    comment: "Massage body rất đã, hết đau mỏi vai gáy. Không gian đẹp và sạch sẽ."
  }
];

module.exports = {
  businessInfo,
  services,
  combos,
  products,
  news,
  trainings,
  testimonials
};
