import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getInfo, getServices, postBooking, postContact } from "../api";
import { buildServiceOptions } from "../servicesData";

export default function Contact() {
  const [info, setInfo] = useState(null);
  const [services, setServices] = useState([]);

  const [booking, setBooking] = useState({
    name: "",
    phone: "",
    service: "",
    branch: "",
    date: "",
    note: ""
  });
  const [bookingMsg, setBookingMsg] = useState(null);

  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [contactMsg, setContactMsg] = useState(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    getInfo().then(setInfo).catch(() => {});
    getServices().then(setServices).catch(() => {});
  }, []);

  // Tự điền dịch vụ/combo nếu khách bấm "Đặt lịch ngay" từ combo
  useEffect(() => {
    const s = searchParams.get("service");
    if (s) setBooking((b) => ({ ...b, service: s }));
  }, [searchParams]);

  const submitBooking = async (e) => {
    e.preventDefault();
    setBookingMsg(null);
    try {
      const res = await postBooking(booking);
      setBookingMsg({ type: "success", text: res.message });
      setBooking({ name: "", phone: "", service: "", branch: "", date: "", note: "" });
    } catch (err) {
      setBookingMsg({
        type: "error",
        text: err.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại."
      });
    }
  };

  const submitContact = async (e) => {
    e.preventDefault();
    setContactMsg(null);
    try {
      const res = await postContact(contact);
      setContactMsg({ type: "success", text: res.message });
      setContact({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setContactMsg({
        type: "error",
        text: err.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại."
      });
    }
  };

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <h1>Liên hệ & Đặt lịch</h1>
          <p>Hãy để Bảo Trâm Spa chăm sóc vẻ đẹp của bạn</p>
        </div>
      </section>

      {/* Đặt lịch */}
      <section className="section">
        <div className="container contact-grid">
          <div>
            <div className="tag" style={{ textAlign: "left" }}>Đặt lịch hẹn</div>
            <h2 style={{ marginBottom: 18 }}>Đặt lịch dịch vụ</h2>
            <form className="form" onSubmit={submitBooking}>
              {bookingMsg && (
                <div className={"alert alert-" + bookingMsg.type}>
                  {bookingMsg.text}
                </div>
              )}
              <div className="form-group">
                <label>Họ và tên *</label>
                <input
                  value={booking.name}
                  onChange={(e) => setBooking({ ...booking, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại *</label>
                <input
                  value={booking.phone}
                  onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
                  placeholder="0901 234 567"
                  required
                />
              </div>
              <div className="form-group">
                <label>Dịch vụ *</label>
                <select
                  value={booking.service}
                  onChange={(e) => setBooking({ ...booking, service: e.target.value })}
                  required
                >
                  <option value="">-- Chọn dịch vụ --</option>
                  {booking.service && !buildServiceOptions(services).includes(booking.service) && (
                    <option value={booking.service}>{booking.service}</option>
                  )}
                  {buildServiceOptions(services).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Cơ sở</label>
                <select
                  value={booking.branch}
                  onChange={(e) => setBooking({ ...booking, branch: e.target.value })}
                >
                  <option value="">-- Chọn cơ sở gần bạn --</option>
                  {(info?.branches || []).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ngày & giờ hẹn</label>
                <input
                  type="datetime-local"
                  value={booking.date}
                  onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <textarea
                  rows="3"
                  value={booking.note}
                  onChange={(e) => setBooking({ ...booking, note: e.target.value })}
                  placeholder="Yêu cầu thêm (nếu có)"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Gửi đặt lịch
              </button>
            </form>
          </div>

          {/* Thông tin liên hệ */}
          <div>
            <div className="tag" style={{ textAlign: "left" }}>Thông tin</div>
            <h2 style={{ marginBottom: 18 }}>Liên hệ với chúng tôi</h2>
            {info && (
              <div style={{ marginBottom: 24 }}>
                <div className="info-item">
                  <span className="ic">📞</span>
                  <div>
                    <h4>Điện thoại</h4>
                    <p>{info.phone}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="ic">✉️</span>
                  <div>
                    <h4>Email</h4>
                    <p>{info.email}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="ic">🕐</span>
                  <div>
                    <h4>Giờ làm việc</h4>
                    <p>{info.workingHours}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="ic">📍</span>
                  <div>
                    <h4>Chi nhánh</h4>
                    {info.branches.map((b, i) => (
                      <p key={i}>{b}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <form className="form" onSubmit={submitContact}>
              <h4 style={{ marginBottom: 14 }}>Gửi tin nhắn</h4>
              {contactMsg && (
                <div className={"alert alert-" + contactMsg.type}>
                  {contactMsg.text}
                </div>
              )}
              <div className="form-group">
                <label>Họ và tên *</label>
                <input
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Nội dung *</label>
                <textarea
                  rows="4"
                  value={contact.message}
                  onChange={(e) => setContact({ ...contact, message: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Gửi tin nhắn
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
