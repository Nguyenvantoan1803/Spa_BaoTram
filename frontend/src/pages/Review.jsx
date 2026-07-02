import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getReviewInfo, postReview } from "../api";

export default function Review() {
  const { id } = useParams();
  const [info, setInfo] = useState(null);   // null=loading | {} | {error}
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  useEffect(() => {
    getReviewInfo(id)
      .then(setInfo)
      .catch(() => setInfo({ error: "Không tìm thấy lịch hẹn này." }));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await postReview(id, { rating, comment });
      setDoneMsg(r.message || "Cảm ơn đánh giá của bạn!");
      setTimeout(() => setDoneMsg(""), 5000);
    } catch (err) {
      setDoneMsg(err?.response?.data?.error || "Gửi đánh giá thất bại, thử lại nhé.");
      setTimeout(() => setDoneMsg(""), 5000);
    } finally { setSending(false); }
  };

  const wrap = {
    maxWidth: 520, margin: "40px auto", padding: "0 18px",
    fontFamily: '"Be Vietnam Pro", sans-serif', color: "#2b2b2b"
  };
  const card = { background: "#fff", border: "1px solid #e3e7e3", borderRadius: 16, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,.06)" };

  return (
    <div style={wrap}>
      <Helmet><title>Đánh giá dịch vụ · Bảo Trâm Spa</title></Helmet>
      <div style={card}>
        <h1 style={{ fontSize: 22, color: "#1f5c3d", marginBottom: 6, fontFamily: '"Playfair Display", serif' }}>
          Bảo Trâm Beauty Spa &amp; Salon
        </h1>

        {info === null ? (
          <p>Đang tải...</p>
        ) : info.error ? (
          <p style={{ color: "#c0392b" }}>{info.error}</p>
        ) : doneMsg ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48 }}>💚</div>
            <p style={{ fontSize: 16, marginTop: 8 }}>{doneMsg}</p>
          </div>
        ) : info.alreadyReviewed ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <p style={{ fontSize: 16, marginTop: 8 }}>Lịch này đã được đánh giá. Cảm ơn bạn rất nhiều!</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color: "#555", marginBottom: 4 }}>
              Xin chào <b>{info.name || "bạn"}</b>, cảm ơn bạn đã sử dụng dịch vụ:
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", backgroundColor: "#e3e7e3",
                backgroundImage: info.staffAvatar ? `url('${info.staffAvatar}')` : "none",
                backgroundSize: "cover", backgroundPosition: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, color: "#1f5c3d", fontWeight: 700
              }}>
                {!info.staffAvatar && info.staff?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 700, color: "#1f5c3d", marginBottom: 4 }}>
                  {info.service || "Dịch vụ tại Bảo Trâm Spa"}
                </p>
                {info.staff && <p style={{ fontWeight: 400, color: "#777", fontSize: 14 }}>KTV: {info.staff}</p>}
              </div>
            </div>

            <p style={{ marginBottom: 8 }}>Bạn hài lòng ở mức nào?</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 18, fontSize: 38, cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  style={{ color: (hover || rating) >= s ? "#f5b301" : "#d8dcd8", lineHeight: 1, transition: "color .1s" }}
                  role="button"
                  aria-label={`${s} sao`}
                  title={s === 1 ? "Rất không hài lòng" : s === 2 ? "Không hài lòng" : s === 3 ? "Bình thường" : s === 4 ? "Hài lòng" : "Rất hài lòng"}
                >★</span>
              ))}
            </div>

            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn (không bắt buộc)..."
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d8dcd8", fontFamily: "inherit", fontSize: 15, resize: "vertical" }}
            />

            <button
              type="submit"
              disabled={sending}
              style={{
                marginTop: 16, width: "100%", padding: 14, border: "none", borderRadius: 10,
                background: "#1f5c3d", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
                fontFamily: "inherit", opacity: sending ? 0.7 : 1
              }}
            >
              {sending ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
