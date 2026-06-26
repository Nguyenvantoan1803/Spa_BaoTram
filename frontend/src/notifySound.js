// Tạo tiếng "ding" báo có tin nhắn mới bằng Web Audio API.
// Không cần file âm thanh, chạy offline, nhẹ.
let audioCtx = null;

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = audioCtx || new AC();
  return audioCtx;
}

// Gọi 1 lần khi người dùng vừa tương tác (click/gõ phím) để "mở khoá" âm thanh,
// vượt qua chính sách autoplay của trình duyệt. Không mở khoá thì tiếng đầu sẽ bị chặn.
export function unlockAudio() {
  try {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch { /* bỏ qua */ }
}

export function playDing() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    // Trình duyệt có thể "treo" AudioContext cho tới khi có tương tác
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const tone = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };
    // Hai nốt cao dần cho dễ nghe
    tone(880, 0, 0.18);
    tone(1175, 0.16, 0.24);
  } catch { /* bỏ qua nếu trình duyệt chặn âm thanh */ }
}

/* ---------- Thông báo trình duyệt (Notification API) ---------- */

// Xin quyền hiện thông báo. Nên gọi sau khi người dùng đã tương tác.
export function requestNotifyPermission() {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  } catch { /* bỏ qua */ }
}

// Hiện thông báo trên màn hình (kể cả khi admin đang ở tab/ứng dụng khác).
// onClick: hàm chạy khi bấm vào thông báo (vd: mở trang tin nhắn).
export function showNotify(title, body, onClick) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const n = new Notification(title, {
      body,
      icon: "/images/logo.jpg",
      tag: "baotram-chat",   // gộp nhiều tin vào 1 thông báo, không spam
      renotify: true
    });
    n.onclick = () => {
      try { window.focus(); } catch {}
      if (onClick) onClick();
      n.close();
    };
  } catch { /* bỏ qua */ }
}
