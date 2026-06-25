import axios from "axios";

const TOKEN_KEY = "baotram_admin_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();

const adminApi = axios.create({ baseURL: "/api" });

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

export default adminApi;
