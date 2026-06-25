// Tạo tiếng "ding" báo có tin nhắn mới bằng Web Audio API.
// Không cần file âm thanh, chạy offline, nhẹ.
let audioCtx = null;

export function playDing() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    // Trình duyệt có thể "treo" AudioContext cho tới khi có tương tác
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    const tone = (freq, start, dur) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };
    // Hai nốt cao dần cho dễ nghe
    tone(880, 0, 0.18);
    tone(1175, 0.16, 0.24);
  } catch { /* bỏ qua nếu trình duyệt chặn âm thanh */ }
}
