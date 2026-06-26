import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getNews } from "../api";
import { formatDate } from "../utils";

export default function News() {
  const [news, setNews] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNews()
      .then(setNews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Helmet>
        <title>Tin tức & Khuyến mãi - Bảo Trâm Beauty Spa Bến Tre</title>
        <meta name="description" content="Tin tức làm đẹp, mẹo chăm sóc da & tóc, khuyến mãi mới nhất tại Bảo Trâm Beauty Spa & Salon Bến Tre." />
        <link rel="canonical" href="https://spabaotram.com/tin-tuc" />
      </Helmet>
      <section className="page-header">
        <div className="container">
          <h1>Tin tức</h1>
          <p>Tin tức, ưu đãi và kiến thức làm đẹp</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div className="loading">Đang tải tin tức...</div>
          ) : (
            <div className="grid grid-3">
              {news.map((n) => (
                <div
                  key={n.id}
                  className="card news-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActive(active === n.id ? null : n.id)}
                >
                  <img src={n.image} alt={n.title} loading="lazy" decoding="async" />
                  <div className="body">
                    <div className="date">{formatDate(n.date)}</div>
                    <h3>{n.title}</h3>
                    <p>{active === n.id ? n.content : n.excerpt}</p>
                    <span
                      style={{
                        color: "#a86767",
                        fontWeight: 600,
                        fontSize: 14,
                        display: "inline-block",
                        marginTop: 8
                      }}
                    >
                      {active === n.id ? "Thu gọn ▲" : "Đọc thêm ▼"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
