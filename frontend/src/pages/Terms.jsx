import { Helmet } from "react-helmet-async";

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Điều khoản sử dụng - Bảo Trâm Beauty Spa & Salon</title>
        <meta name="description" content="Điều khoản sử dụng dịch vụ và website của Bảo Trâm Beauty Spa & Salon." />
        <link rel="canonical" href="https://spabaotram.com/dieu-khoan" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <section className="container" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
        <h1>Điều khoản sử dụng</h1>
        <p><em>Cập nhật lần cuối: 26/06/2026</em></p>

        <p>
          Khi truy cập và sử dụng website spabaotram.com, Khách hàng đồng ý tuân thủ các điều khoản dưới đây.
        </p>

        <h2>1. Phạm vi áp dụng</h2>
        <p>
          Điều khoản này áp dụng cho mọi cá nhân/tổ chức truy cập, đặt lịch, mua dịch vụ
          hoặc tương tác với website của Bảo Trâm Beauty Spa & Salon.
        </p>

        <h2>2. Đặt lịch dịch vụ</h2>
        <ul>
          <li>Khách hàng cung cấp thông tin chính xác (họ tên, SĐT) khi đặt lịch.</li>
          <li>Lịch hẹn được xác nhận qua điện thoại/Zalo bởi nhân viên spa.</li>
          <li>Vui lòng đến đúng giờ. Nếu muốn đổi/hủy, báo trước ít nhất 2 giờ.</li>
          <li>Đến trễ quá 15 phút có thể bị hủy lịch hoặc dời sang khung giờ khác.</li>
        </ul>

        <h2>3. Thanh toán</h2>
        <ul>
          <li>Thanh toán bằng tiền mặt, chuyển khoản hoặc thẻ tại quầy.</li>
          <li>Giá dịch vụ niêm yết tại spa và trên website là giá đã bao gồm VAT.</li>
          <li>Combo và khuyến mãi không cộng dồn trừ khi có thông báo riêng.</li>
        </ul>

        <h2>4. Cam kết dịch vụ</h2>
        <ul>
          <li>Sản phẩm/dụng cụ sử dụng có nguồn gốc rõ ràng, an toàn vệ sinh.</li>
          <li>Nhân viên được đào tạo chuyên nghiệp.</li>
          <li>Nếu không hài lòng, vui lòng phản ánh trực tiếp với quản lý chi nhánh.</li>
        </ul>

        <h2>5. Sở hữu trí tuệ</h2>
        <p>
          Toàn bộ nội dung trên website (logo, hình ảnh, bài viết, video) thuộc bản quyền của
          Bảo Trâm Beauty Spa & Salon. Cấm sao chép, sử dụng cho mục đích thương mại khi chưa được đồng ý.
        </p>

        <h2>6. Hành vi cấm</h2>
        <p>Khách hàng KHÔNG được:</p>
        <ul>
          <li>Đặt lịch giả mạo, spam.</li>
          <li>Tấn công, thử khai thác lỗ hổng website.</li>
          <li>Đăng tải nội dung vi phạm pháp luật, đồi trụy qua hộp chat.</li>
          <li>Sao chép, tái phân phối nội dung website mà không xin phép.</li>
        </ul>

        <h2>7. Giới hạn trách nhiệm</h2>
        <p>
          Website cố gắng cung cấp thông tin chính xác. Tuy nhiên, trong trường hợp lỗi kỹ thuật,
          gián đoạn dịch vụ, chúng tôi không chịu trách nhiệm về tổn thất gián tiếp.
        </p>

        <h2>8. Bảo vệ dữ liệu</h2>
        <p>
          Việc thu thập, sử dụng dữ liệu cá nhân được quy định chi tiết trong
          <a href="/chinh-sach-bao-mat"> Chính sách bảo mật</a>.
        </p>

        <h2>9. Pháp luật áp dụng</h2>
        <p>
          Điều khoản được điều chỉnh theo pháp luật Việt Nam. Mọi tranh chấp được giải quyết tại
          Tòa án có thẩm quyền tại Bến Tre.
        </p>

        <h2>10. Liên hệ</h2>
        <ul>
          <li>📞 Hotline: <a href="tel:+84327322722">032 732 2722</a></li>
          <li>✉️ Email: <a href="mailto:thanhhai.bnr@gmail.com">thanhhai.bnr@gmail.com</a></li>
        </ul>
      </section>
    </>
  );
}
