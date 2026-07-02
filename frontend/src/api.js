import axios from "axios";

// Dev: dùng proxy "/api" (vite.config.js) trỏ về backend Express.
// Production: đặt VITE_API_URL (vd https://api.tenmien.com) lúc build để trỏ backend thật.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});

export const getInfo = () => api.get("/info").then((r) => r.data);
export const getServices = () => api.get("/services").then((r) => r.data);
export const getCombos = () => api.get("/combos").then((r) => r.data);
export const getProducts = () => api.get("/products").then((r) => r.data);
export const getNews = () => api.get("/news").then((r) => r.data);
export const getNewsItem = (id) => api.get(`/news/${id}`).then((r) => r.data);
export const getTrainings = () => api.get("/trainings").then((r) => r.data);
export const getTestimonials = () =>
  api.get("/testimonials").then((r) => r.data);
export const postBooking = (data) =>
  api.post("/booking", data).then((r) => r.data);
export const postContact = (data) =>
  api.post("/contact", data).then((r) => r.data);

// --- Chat trực tiếp với tư vấn viên ---
export const getChatSession = (visitorId) =>
  api.get(`/chat/session/${visitorId}`).then((r) => r.data);
export const sendChatMessage = (visitorId, data) =>
  api.post(`/chat/session/${visitorId}`, data).then((r) => r.data);
export const pingChatTyping = (visitorId) =>
  api.post(`/chat/session/${visitorId}/typing`).then((r) => r.data);

// --- Đánh giá sau dịch vụ (qua link gửi cho khách) ---
export const getReviewInfo = (bookingId) =>
  api.get(`/review/${bookingId}`).then((r) => r.data);
export const postReview = (bookingId, data) =>
  api.post(`/review/${bookingId}`, data).then((r) => r.data);

export default api;
