// Định dạng tiền VND
export function formatVND(value) {
  if (value == null) return "Liên hệ";
  return value.toLocaleString("vi-VN") + "₫";
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
}
