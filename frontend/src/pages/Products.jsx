import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getProducts } from "../api";
import { formatVND } from "../utils";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Helmet>
        <title>Sản phẩm Mỹ phẩm chính hãng - Bảo Trâm Beauty Spa</title>
        <meta name="description" content="Mỹ phẩm & sản phẩm chăm sóc da, tóc chính hãng tại Bảo Trâm Beauty Spa & Salon Bến Tre. Giá tốt - Cam kết chất lượng." />
        <link rel="canonical" href="https://spabaotram.com/san-pham" />
      </Helmet>
      <section className="page-header">
        <div className="container">
          <h1>Sản phẩm</h1>
          <p>Mỹ phẩm & sản phẩm chăm sóc chính hãng</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div className="loading">Đang tải sản phẩm...</div>
          ) : (
            <div className="grid grid-4">
              {products.map((p) => (
                <div key={p.id} className="card product-card">
                  <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
                  <div className="body">
                    <div className="cat">{p.category}</div>
                    <h3>{p.name}</h3>
                    <div className="desc">{p.description}</div>
                    <div className="price">{formatVND(p.price)}</div>
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
