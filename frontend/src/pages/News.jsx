import { useEffect, useState } from "react";
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
                  <img src={n.image} alt={n.title} />
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
