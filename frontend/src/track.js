// Ghi nhận thống kê truy cập & lượt bấm các nút liên hệ.
// Gửi "fire-and-forget", không chặn giao diện.
import api from "./api";

export function track(type) {
  try {
    api.post("/track", { type }).catch(() => {});
  } catch { /* bỏ qua */ }
}

// Ghi 1 lượt truy cập, tối đa 1 lần / ngày cho mỗi trình duyệt
export function trackVisitOncePerDay() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("baotram_last_visit") === today) return;
    localStorage.setItem("baotram_last_visit", today);
    track("visit");
  } catch {
    track("visit");
  }
}

// Phân loại link để biết khách bấm nút gì
function classifyHref(href) {
  if (!href) return null;
  if (href.startsWith("tel:")) return "call";
  if (href.includes("zalo.me")) return "zalo";
  if (href.includes("m.me") || href.includes("messenger.com")) return "messenger";
  return null;
}

// Bắt mọi cú click vào link Gọi / Zalo / Messenger trên website.
// Trả về hàm gỡ listener.
export function attachClickTracking() {
  const handler = (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const type = classifyHref(a.getAttribute("href") || "");
    if (type) track(type);
  };
  document.addEventListener("click", handler, true);
  return () => document.removeEventListener("click", handler, true);
}
