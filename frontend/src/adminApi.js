import axios from "axios";

const TOKEN_KEY = "baotram_admin_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();

// Dev: proxy "/api". Production: đặt VITE_API_URL trỏ tới backend thật.
const adminApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

// Tự gắn token vào mọi request
adminApi.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Token hết hạn -> tự đăng xuất
adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && getToken()) {
      clearToken();
      if (!location.pathname.endsWith("/login")) {
        location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

// Đăng nhập
export async function login(username, password) {
  const { data } = await adminApi.post("/admin/login", { username, password });
  setToken(data.token);
  return data;
}

// CRUD chung theo "path" (news, combos, services, products, testimonials)
export const listItems = (path) => adminApi.get(`/${path}?all=1`).then((r) => r.data);
export const createItem = (path, body) =>
  adminApi.post(`/${path}`, body).then((r) => r.data);
export const updateItem = (path, id, body) =>
  adminApi.put(`/${path}/${id}`, body).then((r) => r.data);
export const deleteItem = (path, id) =>
  adminApi.delete(`/${path}/${id}`).then((r) => r.data);

// Đặt lịch & liên hệ
export const getBookings = () => adminApi.get("/booking").then((r) => r.data);
export const createBooking = (body) =>
  adminApi.post("/booking", body).then((r) => r.data);
export const getContacts = () => adminApi.get("/contact").then((r) => r.data);
export const updateBooking = (id, body) =>
  adminApi.put(`/booking/${id}`, body).then((r) => r.data);
export const createBookingReview = (id, body) =>
  adminApi.post(`/booking/${id}/review`, body).then((r) => r.data);

// Chat tư vấn (admin)
export const getConversations = () => adminApi.get("/chat").then((r) => r.data);
export const getConversation = (id) =>
  adminApi.get(`/chat/${id}`).then((r) => r.data);
export const replyConversation = (id, body) =>
  adminApi.post(`/chat/${id}/reply`, body).then((r) => r.data);
export const renameConversation = (id, name) =>
  adminApi.put(`/chat/${id}`, { name }).then((r) => r.data);
export const pingStaffTyping = (id) =>
  adminApi.post(`/chat/${id}/typing`).then((r) => r.data);
export const deleteConversation = (id) =>
  adminApi.delete(`/chat/${id}`).then((r) => r.data);
export const getChatUnread = () =>
  adminApi.get("/chat/unread/count").then((r) => r.data.count);

// Thống kê truy cập & tương tác
export const getTraffic = () =>
  adminApi.get("/stats/traffic").then((r) => r.data);

// Khách hàng
export const getCustomers = () => adminApi.get("/customers").then((r) => r.data);
export const createCustomer = (body) => adminApi.post("/customers", body).then((r) => r.data);
export const updateCustomer = (id, body) => adminApi.put(`/customers/${id}`, body).then((r) => r.data);
export const deleteCustomer = (id) => adminApi.delete(`/customers/${id}`).then((r) => r.data);
export const getCustomerHistory = (id) =>
  adminApi.get(`/customers/${id}/history`).then((r) => r.data);

// Chăm sóc khách hàng (nhắc lịch / khách lâu chưa quay lại / sinh nhật)
export const getReminders = (days = 1) =>
  adminApi.get(`/care/reminders?days=${days}`).then((r) => r.data);
export const sendReminder = (id) =>
  adminApi.post(`/care/reminders/${id}/send`).then((r) => r.data);
export const getSleeping = (days = 30) =>
  adminApi.get(`/care/sleeping?days=${days}`).then((r) => r.data);
export const getBirthdays = (days = 7) =>
  adminApi.get(`/care/birthdays?days=${days}`).then((r) => r.data);
export const sendBirthday = (id, body = {}) =>
  adminApi.post(`/care/birthdays/${id}/send`, body).then((r) => r.data);
export const scheduleBirthday = (id, body) =>
  adminApi.post(`/care/birthdays/${id}/schedule`, body).then((r) => r.data);
export const getScheduled = () => adminApi.get("/care/scheduled").then((r) => r.data);
export const cancelScheduled = (id) => adminApi.delete(`/care/scheduled/${id}`).then((r) => r.data);

// Chiến dịch khuyến mãi
export const getCampaigns = () => adminApi.get("/care/campaigns").then((r) => r.data);
export const createCampaign = (body) => adminApi.post("/care/campaigns", body).then((r) => r.data);
export const updateCampaign = (id, body) => adminApi.put(`/care/campaigns/${id}`, body).then((r) => r.data);
export const deleteCampaign = (id) => adminApi.delete(`/care/campaigns/${id}`).then((r) => r.data);
export const sendCampaignNow = (id) => adminApi.post(`/care/campaigns/${id}/send-now`).then((r) => r.data);
export const previewAudience = (audience, count) =>
  adminApi.get(`/care/campaigns/preview?audience=${audience}&count=${count || 0}`).then((r) => r.data);

// Voucher / mã giảm giá
export const getVouchers = () => adminApi.get("/vouchers").then((r) => r.data);
export const createVoucher = (body) => adminApi.post("/vouchers", body).then((r) => r.data);
export const updateVoucher = (id, body) => adminApi.put(`/vouchers/${id}`, body).then((r) => r.data);
export const deleteVoucher = (id) => adminApi.delete(`/vouchers/${id}`).then((r) => r.data);
export const genVoucherCode = () => adminApi.get("/vouchers/gen-code").then((r) => r.data.code);
export const redeemVoucher = (code, discount) => adminApi.post("/vouchers/redeem", { code, discount }).then((r) => r.data);

// Nhân viên / kỹ thuật viên
export const getStaff = () => adminApi.get("/staff").then((r) => r.data);
export const createStaff = (body) => adminApi.post("/staff", body).then((r) => r.data);
export const updateStaff = (id, body) => adminApi.put(`/staff/${id}`, body).then((r) => r.data);
export const deleteStaff = (id) => adminApi.delete(`/staff/${id}`).then((r) => r.data);
export const getStaffPerformance = () => adminApi.get("/staff/performance").then((r) => r.data);
export const getStaffStats = (month = "") =>
  adminApi.get("/staff/stats" + (month ? `?month=${month}` : "")).then((r) => r.data);

// Đánh giá sau dịch vụ
export const getReviews = () => adminApi.get("/reviews").then((r) => r.data);
export const publishReview = (id) => adminApi.post(`/reviews/${id}/publish`).then((r) => r.data);
export const deleteReview = (id) => adminApi.delete(`/reviews/${id}`).then((r) => r.data);
export const getReviewRequests = () => adminApi.get("/care/reviews").then((r) => r.data);
export const sendReviewRequest = (id) => adminApi.post(`/care/reviews/${id}/send`).then((r) => r.data);

export default adminApi;
