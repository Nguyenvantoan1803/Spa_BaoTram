import { Helmet } from "react-helmet-async";

export default function About() {
  return (
    <div>
      <Helmet>
        <title>Giới thiệu - Bảo Trâm Beauty Spa & Salon Châu Thành, Bến Tre</title>
        <meta name="description" content="Câu chuyện về Bảo Trâm Beauty Spa & Salon - Tận tâm với từng khách hàng, sử dụng 100% thảo dược tự nhiên. 3 chi nhánh tại Châu Thành, Bến Tre." />
        <link rel="canonical" href="https://spabaotram.com/gioi-thieu" />
      </Helmet>
      <section className="page-header">
        <div className="container">
          <h1>Giới thiệu</h1>
          <p>Câu chuyện về Bảo Trâm Beauty Spa & Salon</p>
        </div>
      </section>

      <section className="section">
        <div className="container about-split">
          <img
            src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80"
            alt="Bảo Trâm Spa"
          />
          <div>
            <div className="tag" style={{ textAlign: "left" }}>Về chúng tôi</div>
            <h2>Bảo Trâm Beauty Spa & Salon</h2>
            <p>
              Bảo Trâm Beauty Spa & Salon là hệ thống spa làm đẹp uy tín tại
              Châu Thành, Bến Tre. Chúng tôi cung cấp đa dạng dịch vụ từ chăm sóc
              tóc, da, nail đến massage trị liệu và thư giãn.
            </p>
            <p>
              Với phương châm "Tôn vinh vẻ đẹp tự nhiên của bạn", chúng tôi luôn
              nỗ lực mang đến những trải nghiệm tuyệt vời nhất cho khách hàng.
            </p>
            <ul className="feature-list">
              <li>Hơn nhiều năm kinh nghiệm trong ngành làm đẹp</li>
              <li>2 chi nhánh phục vụ tại Châu Thành, Bến Tre</li>
              <li>Đội ngũ kỹ thuật viên tận tâm, chuyên nghiệp</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container">
          <h2 className="section-title">Giá trị cốt lõi</h2>
          <div className="grid grid-3" style={{ marginTop: 30 }}>
            <div className="card service-card">
              <div className="icon">💖</div>
              <h3>Tận tâm</h3>
              <p>Luôn đặt sự hài lòng của khách hàng lên hàng đầu.</p>
            </div>
            <div className="card service-card">
              <div className="icon">🌿</div>
              <h3>Tự nhiên</h3>
              <p>Sử dụng sản phẩm thiên nhiên, an toàn cho làn da.</p>
            </div>
            <div className="card service-card">
              <div className="icon">⭐</div>
              <h3>Chuyên nghiệp</h3>
              <p>Quy trình chuẩn, kỹ thuật viên tay nghề cao.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
