import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getServices } from "../api";
import { formatVND } from "../utils";
import { SERVICES_DATA as FALLBACK_SERVICES } from "../servicesData";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // gói đang mở các bước

  useEffect(() => {
    getServices()
      .then((d) => setServices(d && d.length ? d : FALLBACK_SERVICES))
      .catch(() => setServices(FALLBACK_SERVICES))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <h1>Dịch vụ</h1>
          <p>Bảng giá dịch vụ tại Bảo Trâm Beauty Spa & Salon</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div className="loading">Đang tải dịch vụ...</div>
          ) : (
            <div className={"grid grid-3" + (services.length < 3 ? " grid-center" : "")}>
              {services.map((s) => (
                <div key={s.id} className="card service-card">
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <ul className="price-list">
                    {s.items.map((it, i) => {
                      const key = `${s.id}-${i}`;
                      const hasSteps = it.steps && it.steps.length > 0;
                      const isOpen = open === key;
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            className={"price-row" + (isOpen ? " open" : "")}
                            onClick={() => hasSteps && setOpen(isOpen ? null : key)}
                            style={hasSteps ? undefined : { cursor: "default" }}
                          >
                            <span>
                              {it.name}{" "}
                              <em style={{ color: "#b09c94", fontWeight: 500 }}>({it.duration})</em>
                              {hasSteps && <i className="caret">▾</i>}
                            </span>
                            <span className="price">{formatVND(it.price)}</span>
                          </button>
                          {hasSteps && isOpen && (
                            <ol className="steps">
                              {it.steps.map((st, j) => (
                                <li key={j}>{st}</li>
                              ))}
                            </ol>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 45 }}>
            <Link to="/lien-he" className="btn btn-primary">
              Đặt lịch dịch vụ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
