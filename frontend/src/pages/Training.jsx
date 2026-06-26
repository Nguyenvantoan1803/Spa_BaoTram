import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getTrainings } from "../api";
import { formatVND } from "../utils";

export default function Training() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainings()
      .then(setTrainings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Helmet>
        <title>Khóa học Đào tạo nghề Spa & Làm đẹp - Bảo Trâm Beauty</title>
        <meta name="description" content="Các khóa đào tạo nghề spa, gội đầu dưỡng sinh, massage, nail, làm tóc chuyên nghiệp tại Bảo Trâm Beauty Spa & Salon Bến Tre." />
        <link rel="canonical" href="https://spabaotram.com/dao-tao" />
      </Helmet>
      <section className="page-header">
        <div className="container">
          <h1>Đào tạo</h1>
          <p>Các khóa học nghề làm đẹp chuyên nghiệp</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-sub">
            Bảo Trâm Spa nhận đào tạo học viên với chương trình bài bản, thực
            hành trên khách hàng thật, cam kết đầu ra.
          </p>
          {loading ? (
            <div className="loading">Đang tải khóa học...</div>
          ) : (
            <div className="grid grid-3">
              {trainings.map((t) => (
                <div key={t.id} className="card service-card">
                  <div className="icon">🎓</div>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  <ul className="price-list">
                    <li>
                      <span>Thời lượng</span>
                      <span>{t.duration}</span>
                    </li>
                    <li>
                      <span>Học phí</span>
                      <span className="price">{formatVND(t.price)}</span>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 45 }}>
            <Link to="/lien-he" className="btn btn-primary">
              Đăng ký tư vấn
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
