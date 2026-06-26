import { Helmet } from "react-helmet-async";

// Trang Chinh sach bao mat - BAT BUOC de chay Google Ads + tuan thu Nghi dinh 13/2023/ND-CP
export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Chính sách bảo mật - Bảo Trâm Beauty Spa & Salon</title>
        <meta name="description" content="Chính sách bảo mật thông tin khách hàng của Bảo Trâm Beauty Spa & Salon." />
        <link rel="canonical" href="https://spabaotram.com/chinh-sach-bao-mat" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <section className="container" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
        <h1>Chính sách bảo mật</h1>
        <p><em>Cập nhật lần cuối: 26/06/2026</em></p>

        <p>
          Bảo Trâm Beauty Spa & Salon (sau đây gọi là <strong>"chúng tôi"</strong>) cam kết bảo vệ
          thông tin cá nhân của Khách hàng theo Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
        </p>

        <h2>1. Thông tin chúng tôi thu thập</h2>
        <ul>
          <li><strong>Thông tin cá nhân:</strong> họ tên, số điện thoại, email, địa chỉ (nếu khách cung cấp).</li>
          <li><strong>Thông tin đặt lịch:</strong> dịch vụ chọn, chi nhánh, ngày giờ hẹn, ghi chú.</li>
          <li><strong>Thông tin chat:</strong> nội dung tin nhắn khách gửi qua hộp chat trên website.</li>
          <li><strong>Dữ liệu kỹ thuật:</strong> IP, loại thiết bị, trình duyệt, hành vi duyệt web (qua cookie).</li>
        </ul>

        <h2>2. Mục đích sử dụng</h2>
        <ul>
          <li>Xác nhận, xử lý và quản lý lịch hẹn dịch vụ.</li>
          <li>Liên hệ tư vấn, hỗ trợ và chăm sóc khách hàng.</li>
          <li>Gửi thông báo khuyến mãi, ưu đãi (chỉ khi khách đồng ý).</li>
          <li>Cải thiện chất lượng dịch vụ và trải nghiệm website.</li>
          <li>Tuân thủ nghĩa vụ pháp luật.</li>
        </ul>

        <h2>3. Chia sẻ thông tin với bên thứ ba</h2>
        <p>Chúng tôi <strong>KHÔNG bán</strong> thông tin khách hàng. Chỉ chia sẻ trong các trường hợp:</p>
        <ul>
          <li><strong>Nhà cung cấp dịch vụ kỹ thuật:</strong> MongoDB Atlas (lưu trữ dữ liệu), Gmail SMTP (gửi email thông báo).</li>
          <li><strong>Cơ quan nhà nước:</strong> khi có yêu cầu hợp pháp.</li>
        </ul>

        <h2>4. Thời gian lưu trữ</h2>
        <p>
          Thông tin khách hàng được lưu trữ trong suốt thời gian khách sử dụng dịch vụ và 24 tháng sau
          lần tương tác cuối cùng, trừ khi pháp luật yêu cầu lưu lâu hơn.
        </p>

        <h2>5. Bảo mật thông tin</h2>
        <ul>
          <li>Dữ liệu được mã hóa khi truyền qua mạng (HTTPS/TLS).</li>
          <li>Mật khẩu admin được mã hóa bằng bcrypt.</li>
          <li>Chỉ nhân viên được ủy quyền mới được truy cập thông tin khách.</li>
          <li>Backup dữ liệu định kỳ.</li>
        </ul>

        <h2>6. Quyền của khách hàng</h2>
        <p>Khách hàng có quyền:</p>
        <ul>
          <li>Yêu cầu xem thông tin cá nhân mà chúng tôi đang lưu giữ.</li>
          <li>Yêu cầu sửa đổi thông tin sai/cũ.</li>
          <li>Yêu cầu xóa toàn bộ dữ liệu cá nhân.</li>
          <li>Rút lại đồng ý nhận tin khuyến mãi bất cứ lúc nào.</li>
          <li>Khiếu nại nếu phát hiện vi phạm.</li>
        </ul>

        <h2>7. Cookie</h2>
        <p>
          Website sử dụng cookie để: ghi nhớ phiên đăng nhập admin, ghi nhận lượt truy cập (thống kê),
          và lưu mã visitor cho hộp chat. Khách có thể xóa cookie bất cứ lúc nào trong trình duyệt.
        </p>

        <h2>8. Liên hệ về dữ liệu</h2>
        <p>Để thực hiện các quyền trên hoặc khiếu nại, vui lòng liên hệ:</p>
        <ul>
          <li>📞 Hotline: <a href="tel:+84327322722">032 732 2722</a></li>
          <li>✉️ Email: <a href="mailto:thanhhai.bnr@gmail.com">thanhhai.bnr@gmail.com</a></li>
          <li>🏢 Địa chỉ: Châu Thành, Bến Tre</li>
        </ul>

        <h2>9. Thay đổi chính sách</h2>
        <p>
          Chúng tôi có thể cập nhật chính sách này. Phiên bản mới có hiệu lực kể từ ngày đăng tải lên website.
        </p>
      </section>
    </>
  );
}
