import axios from "axios";

// Dùng proxy "/api" (cấu hình trong vite.config.js) trỏ về backend Express
const api = axios.create({
  baseURL: "/api"
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

export default api;
