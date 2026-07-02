import { useEffect, useMemo, useState } from "react";
import { getBookings, getTraffic, getStaffStats } from "../../adminApi";

const MONTHS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

/* Lấy đối tượng Date từ 1 booking theo loại mốc thời gian đã chọn */
function pickDate(b, basis) {
  const raw = basis === "date" ? b.date : b.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/* Biểu đồ cột bằng SVG thuần (không cần thư viện ngoài) */
function BarChart({ labels, values, color = "#1f5c3d" }) {
  const W = 720, H = 280, padL = 36, padB = 34, padT = 16, padR = 12;
  const max = Math.max(1, ...values);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = values.length;
  const gap = plotW / n;
  const barW = Math.min(46, gap * 0.62);

  // 4 đường lưới ngang
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padT + plotH - plotH * t,
    v: Math.round(max * t)
  }));

  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img">
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke="#e3e7e3" strokeWidth="1" />
            <text x={padL - 6} y={tk.y + 4} textAnchor="end" className="chart-axis">{tk.v}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const h = (v / max) * plotH;
          const x = padL + gap * i + (gap - barW) / 2;
          const y = padT + plotH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx="5" fill={color}>
                <title>{labels[i]}: {v}</title>
              </rect>
              {v > 0 && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="chart-val">{v}</text>
              )}
              <text x={x + barW / 2} y={H - padB + 18} textAnchor="middle" className="chart-lbl">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Biểu đồ đường "nhịp sống" bằng SVG thuần */
function LineChart({ labels, values, color = "#1f5c3d" }) {
  const W = 720, H = 240, padL = 36, padB = 28, padT = 30, padR = 12;
  const max = Math.max(1, ...values);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = values.length;
  const xAt = (i) => (n <= 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
  const yAt = (v) => padT + plotH - (v / max) * plotH;
  const pts = values.map((v, i) => `${xAt(i)},${yAt(v)}`);
  const linePath = "M" + pts.join(" L");
  const areaPath = `M${xAt(0)},${padT + plotH} L` + pts.join(" L") + ` L${xAt(n - 1)},${padT + plotH} Z`;
  const ticks = [0, 0.5, 1].map((t) => ({ y: padT + plotH - plotH * t, v: Math.round(max * t) }));

  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img">
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke="#e3e7e3" strokeWidth="1" />
            <text x={padL - 6} y={tk.y + 4} textAnchor="end" className="chart-axis">{tk.v}</text>
          </g>
        ))}
        <path d={areaPath} fill={color} opacity="0.12" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => {
          const cy = yAt(v);
          return (
            <g key={i}>
              <circle cx={xAt(i)} cy={cy} r={v > 0 ? 4 : 2.5}
                fill={v > 0 ? "#fff" : color} stroke={color} strokeWidth={v > 0 ? 2.5 : 0}>
                <title>Ngày {labels[i]}: {v}</title>
              </circle>
              {v > 0 && (
                <text x={xAt(i)} y={cy - 10} textAnchor="middle" className="chart-val">{v}</text>
              )}
              {(n <= 16 || i % 2 === 0) && (
                <text x={xAt(i)} y={H - padB + 16} textAnchor="middle" className="chart-lbl">{labels[i]}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Biểu đồ cột chồng (nhiều trạng thái xếp chồng trên 1 cột) */
function StackedBarChart({ labels, series }) {
  const W = 720, H = 300, padL = 36, padB = 34, padT = 16, padR = 12;
  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((s, se) => s + (se.values[i] || 0), 0));
  const max = Math.max(1, ...totals);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const gap = plotW / n;
  const barW = Math.min(46, gap * 0.62);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ y: padT + plotH - plotH * t, v: Math.round(max * t) }));

  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img">
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke="#e3e7e3" strokeWidth="1" />
            <text x={padL - 6} y={tk.y + 4} textAnchor="end" className="chart-axis">{tk.v}</text>
          </g>
        ))}
        {labels.map((lb, i) => {
          const x = padL + gap * i + (gap - barW) / 2;
          let yCursor = padT + plotH;
          return (
            <g key={i}>
              {series.map((se, si) => {
                const v = se.values[i] || 0;
                if (!v) return null;
                const h = (v / max) * plotH;
                yCursor -= h;
                return (
                  <rect key={si} x={x} y={yCursor} width={barW} height={h} fill={se.color}>
                    <title>{lb} • {se.label}: {v}</title>
                  </rect>
                );
              })}
              {totals[i] > 0 && (
                <text x={x + barW / 2} y={padT + plotH - (totals[i] / max) * plotH - 6} textAnchor="middle" className="chart-val">{totals[i]}</text>
              )}
              <text x={x + barW / 2} y={H - padB + 18} textAnchor="middle" className="chart-lbl">{lb}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Biểu đồ đường nhiều tuyến (cho dữ liệu nhiều trạng thái) */
function MultiLineChart({ labels, series }) {
  const W = 720, H = 300, padL = 36, padB = 34, padT = 16, padR = 12;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = labels.length;
  const xAt = (i) => (n <= 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
  const yAt = (v) => padT + plotH - (v / max) * plotH;
  const ticks = [0, 0.5, 1].map((t) => ({ y: padT + plotH - plotH * t, v: Math.round(max * t) }));
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img">
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke="#e3e7e3" strokeWidth="1" />
            <text x={padL - 6} y={tk.y + 4} textAnchor="end" className="chart-axis">{tk.v}</text>
          </g>
        ))}
        {series.map((se, si) => {
          const pts = se.values.map((v, i) => `${xAt(i)},${yAt(v)}`);
          return <path key={si} d={"M" + pts.join(" L")} fill="none" stroke={se.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />;
        })}
        {series.map((se, si) => se.values.map((v, i) => (v > 0 ? (
          <g key={si + "-" + i}>
            <circle cx={xAt(i)} cy={yAt(v)} r="3.5" fill="#fff" stroke={se.color} strokeWidth="2">
              <title>{labels[i]} • {se.label}: {v}</title>
            </circle>
            <text x={xAt(i)} y={yAt(v) - 8} textAnchor="middle" className="chart-val" style={{ fill: se.color }}>{v}</text>
          </g>
        ) : null)))}
        {labels.map((lb, i) => (
          (n <= 16 || i % 2 === 0) && (
            <text key={i} x={xAt(i)} y={H - padB + 18} textAnchor="middle" className="chart-lbl">{lb}</text>
          )
        ))}
      </svg>
    </div>
  );
}

/* Nút chọn Cột | Nhịp sống đặt phía trên biểu đồ */
function ChartSwitch({ value, onChange, options }) {
  return (
    <div className="chart-switch">
      <div className="basis-switch">
        {options.map((o) => (
          <button key={o.key} className={value === o.key ? "on" : ""} onClick={() => onChange(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Biểu đồ 1 chuỗi: chuyển Cột <-> Nhịp sống */
function ToggleChart({ labels, values, color = "#1f5c3d" }) {
  const [t, setT] = useState("bar");
  return (
    <>
      <ChartSwitch value={t} onChange={setT}
        options={[{ key: "bar", label: "Cột" }, { key: "line", label: "Nhịp sống" }]} />
      {t === "bar"
        ? <BarChart labels={labels} values={values} color={color} />
        : <LineChart labels={labels} values={values} color={color} />}
    </>
  );
}

/* Biểu đồ nhiều trạng thái: Cột chồng <-> Nhịp sống (nhiều tuyến) */
function StackedToggleChart({ labels, series }) {
  const [t, setT] = useState("bar");
  return (
    <>
      <ChartSwitch value={t} onChange={setT}
        options={[{ key: "bar", label: "Cột chồng" }, { key: "line", label: "Nhịp sống" }]} />
      {t === "bar"
        ? <StackedBarChart labels={labels} series={series} />
        : <MultiLineChart labels={labels} series={series} />}
    </>
  );
}

/* Biểu đồ tỉ lệ: Tròn (donut) <-> Cột */
function DonutToggle({ data }) {
  const [t, setT] = useState("donut");
  return (
    <>
      <ChartSwitch value={t} onChange={setT}
        options={[{ key: "donut", label: "Tròn" }, { key: "bar", label: "Cột" }]} />
      {t === "donut"
        ? <DonutChart data={data} />
        : <BarChart labels={data.map((d) => d.label)} values={data.map((d) => d.value)} color="#1f5c3d" />}
    </>
  );
}

const PIE_COLORS = ["#1f5c3d", "#c9a55c", "#c98a8a", "#6f9e7f", "#b08d44", "#8aa1b4"];

/* Biểu đồ tròn (donut) bằng SVG thuần */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 60, SW = 26, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" className="donut" role="img">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#eef2ef" strokeWidth={SW} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const seg = (
            <circle
              key={i} cx="80" cy="80" r={R} fill="none" stroke={d.color} strokeWidth={SW}
              strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C}
              transform="rotate(-90 80 80)"
            >
              <title>{d.label}: {d.value} ({Math.round(frac * 100)}%)</title>
            </circle>
          );
          acc += frac;
          return seg;
        })}
        <text x="80" y="75" textAnchor="middle" className="donut-num">{total}</text>
        <text x="80" y="93" textAnchor="middle" className="donut-lbl">lượt</text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div key={i} className="lg-row">
            <span className="lg-dot" style={{ background: d.color }} />
            <span className="lg-name" title={d.label}>{d.label}</span>
            <span className="lg-val">{d.value} • {Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingStats() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [basis, setBasis] = useState("createdAt"); // createdAt = ngày đặt | date = ngày hẹn
  const [year, setYear] = useState(null);
  const [pieScope, setPieScope] = useState("year"); // year | month
  const [pieMonth, setPieMonth] = useState(new Date().getMonth());

  useEffect(() => {
    setLoading(true);
    getBookings()
      .then((d) => { setBookings(Array.isArray(d) ? d : []); setErr(""); })
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  }, []);

  // Gom dữ liệu theo năm/tháng dựa trên loại mốc thời gian
  const { years, byYear, byMonth, total, valid } = useMemo(() => {
    const byYear = {};
    const byMonthOfYear = {};
    let valid = 0;
    for (const b of bookings) {
      const d = pickDate(b, basis);
      if (!d) continue;
      valid++;
      const y = d.getFullYear();
      byYear[y] = (byYear[y] || 0) + 1;
      byMonthOfYear[y] = byMonthOfYear[y] || Array(12).fill(0);
      byMonthOfYear[y][d.getMonth()]++;
    }
    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
    return { years, byYear, byMonth: byMonthOfYear, total: bookings.length, valid };
  }, [bookings, basis]);

  // Chọn năm mặc định = năm mới nhất có dữ liệu
  useEffect(() => {
    if (years.length && (year === null || !years.includes(year))) setYear(years[0]);
  }, [years]); // eslint-disable-line

  // Gom theo dịch vụ/combo được chọn (lọc theo năm đang chọn)
  const serviceStats = useMemo(() => {
    const counts = {};
    for (const b of bookings) {
      const d = pickDate(b, basis);
      if (year != null && (!d || d.getFullYear() !== year)) continue;
      if (pieScope === "month" && (!d || d.getMonth() !== pieMonth)) continue;
      const key = (b.service || "Khác").trim() || "Khác";
      counts[key] = (counts[key] || 0) + 1;
    }
    let arr = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    if (arr.length > 6) {
      const top = arr.slice(0, 5);
      const rest = arr.slice(5).reduce((s, x) => s + x.value, 0);
      top.push({ label: "Dịch vụ khác", value: rest });
      arr = top;
    }
    return arr.map((x, i) => ({ ...x, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [bookings, basis, year, pieScope, pieMonth]);

  const topService = serviceStats[0];

  const monthData = (year != null && byMonth[year]) || Array(12).fill(0);
  const yearLabels = years.slice().sort((a, b) => a - b);
  const yearValues = yearLabels.map((y) => byYear[y]);

  const now = new Date();
  const thisYear = byYear[now.getFullYear()] || 0;
  const thisMonth =
    (byMonth[now.getFullYear()] && byMonth[now.getFullYear()][now.getMonth()]) || 0;
  const yearTotal = year != null ? byYear[year] || 0 : 0;
  const avgPerMonth = year != null ? (yearTotal / 12).toFixed(1) : "0";

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Thống kê đặt lịch</h2>
        <div className="basis-switch">
          <button className={basis === "createdAt" ? "on" : ""} onClick={() => setBasis("createdAt")}>
            Theo ngày đặt
          </button>
          <button className={basis === "date" ? "on" : ""} onClick={() => setBasis("date")}>
            Theo ngày hẹn
          </button>
        </div>
      </div>

      {err && <div className="admin-msg err">{err}</div>}

      {loading ? (
        <div className="admin-empty">Đang tải...</div>
      ) : total === 0 ? (
        <div className="admin-empty">Chưa có lượt đặt lịch nào.</div>
      ) : (
        <>
          <div className="admin-stats">
            <div className="stat-card"><div className="n">{total}</div><div className="l">Tổng lượt đặt lịch</div></div>
            <div className="stat-card"><div className="n">{thisYear}</div><div className="l">Năm nay ({now.getFullYear()})</div></div>
            <div className="stat-card"><div className="n">{thisMonth}</div><div className="l">Tháng này</div></div>
            <div className="stat-card"><div className="n">{avgPerMonth}</div><div className="l">TB/tháng (năm {year ?? "—"})</div></div>
          </div>

          {basis === "date" && valid < total && (
            <div className="admin-msg" style={{ background: "#fff7e6", color: "#8a5a00", marginBottom: 16 }}>
              ⚠️ Có {total - valid} lượt không có/ sai "Ngày hẹn" nên không tính được. Thử chuyển sang <b>Theo ngày đặt</b>.
            </div>
          )}

          <div className="chart-card">
            <div className="chart-head">
              <h3>Số lượt đặt lịch theo tháng</h3>
              <select value={year ?? ""} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>
            <ToggleChart labels={MONTHS} values={monthData} color="#1f5c3d" />
          </div>

          <div className="chart-card">
            <div className="chart-head">
              <h3>
                Combo / dịch vụ được chọn nhiều nhất{" "}
                {pieScope === "month"
                  ? `(${MONTHS[pieMonth]}/${year ?? ""})`
                  : year != null && `(năm ${year})`}
              </h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {pieScope === "month" && (
                  <select value={pieMonth} onChange={(e) => setPieMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                )}
                <div className="basis-switch">
                  <button className={pieScope === "month" ? "on" : ""} onClick={() => setPieScope("month")}>Theo tháng</button>
                  <button className={pieScope === "year" ? "on" : ""} onClick={() => setPieScope("year")}>Theo năm</button>
                </div>
              </div>
            </div>
            {serviceStats.length === 0 ? (
              <div className="admin-empty">Chưa có dữ liệu cho {pieScope === "month" ? "tháng" : "năm"} này.</div>
            ) : (
              <>
                {topService && (
                  <div className="top-service">
                    🏆 Được chọn nhiều nhất: <b>{topService.label}</b> — {topService.value} lượt
                  </div>
                )}
                <DonutToggle data={serviceStats} />
              </>
            )}
          </div>

          {yearLabels.length > 1 && (
            <div className="chart-card">
              <div className="chart-head"><h3>Số lượt đặt lịch theo năm</h3></div>
              <ToggleChart labels={yearLabels.map(String)} values={yearValues} color="#b8893a" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Dữ liệu thống kê truy cập/tương tác dùng chung ---------- */
const pad2 = (n) => String(n).padStart(2, "0");

function useTraffic() {
  const [traffic, setTraffic] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getTraffic()
      .then(setTraffic)
      .catch(() => setErr("Không tải được dữ liệu thống kê. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  }, []);
  return { traffic, err, loading };
}

/* Bộ chọn năm + biểu đồ cột theo 12 tháng của 1 chỉ số */
function MonthlyByYear({ byMonth, byYear, field, color, title }) {
  const yearsAvail = byYear.map((y) => y.year).sort((a, b) => b.localeCompare(a));
  const [year, setYear] = useState(yearsAvail[0] || String(new Date().getFullYear()));
  const [chartType, setChartType] = useState("bar"); // bar = cột (mặc định) | line = nhịp sống
  const values = MONTHS.map((_, i) => {
    const row = byMonth.find((m) => m.month === `${year}-${pad2(i + 1)}`);
    return row ? row[field] : 0;
  });
  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="basis-switch">
            <button className={chartType === "bar" ? "on" : ""} onClick={() => setChartType("bar")}>Cột</button>
            <button className={chartType === "line" ? "on" : ""} onClick={() => setChartType("line")}>Nhịp sống</button>
          </div>
          {yearsAvail.length > 0 && (
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {yearsAvail.map((y) => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          )}
        </div>
      </div>
      {chartType === "bar" ? (
        <BarChart labels={MONTHS} values={values} color={color} />
      ) : (
        <LineChart labels={MONTHS} values={values} color={color} />
      )}
    </div>
  );
}

/* Số liệu theo từng ngày của 1 tháng (chọn tháng) — dùng chung cho truy cập & tương tác */
function DailyChart({ byDay, field = "visit", title = "Theo ngày" }) {
  const map = {};
  byDay.forEach((d) => { map[d.day] = d[field]; });

  const now = new Date();
  const curMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const monthsSet = new Set(byDay.map((d) => d.day.slice(0, 7)));
  monthsSet.add(curMonth);
  const months = [...monthsSet].sort((a, b) => b.localeCompare(a));

  const [month, setMonth] = useState(curMonth);
  const [chartType, setChartType] = useState("bar"); // bar = cột (mặc định) | line = nhịp sống
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate(); // số ngày đúng của tháng được chọn
  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const values = Array.from({ length: daysInMonth }, (_, i) => map[`${month}-${pad2(i + 1)}`] || 0);
  const monthTotal = values.reduce((s, v) => s + v, 0);

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title} — tổng {monthTotal}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="basis-switch">
            <button className={chartType === "bar" ? "on" : ""} onClick={() => setChartType("bar")}>Cột</button>
            <button className={chartType === "line" ? "on" : ""} onClick={() => setChartType("line")}>Nhịp sống</button>
          </div>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((mm) => (
              <option key={mm} value={mm}>Tháng {mm.slice(5)}/{mm.slice(0, 4)}</option>
            ))}
          </select>
        </div>
      </div>
      {chartType === "bar" ? (
        <BarChart labels={labels} values={values} color="#1f5c3d" />
      ) : (
        <LineChart labels={labels} values={values} color="#1f5c3d" />
      )}
    </div>
  );
}

/* ---------- Tab: Lượt truy cập ---------- */
function TrafficStats({ traffic, err, loading }) {
  if (err) return <div className="admin-msg err">{err}</div>;
  if (loading || !traffic) return <div className="admin-empty">Đang tải...</div>;

  const { totals, today, byDay, byMonth, byYear } = traffic;
  const now = new Date();
  const curYear = String(now.getFullYear());
  const curMonth = `${curYear}-${pad2(now.getMonth() + 1)}`;
  const monthRow = byMonth.find((m) => m.month === curMonth);
  const yearRow = byYear.find((y) => y.year === curYear);

  if (totals.visit === 0) return <div className="admin-empty">Chưa ghi nhận lượt truy cập nào.</div>;

  return (
    <>
      <div className="admin-stats">
        <div className="stat-card"><div className="n">{today.visit}</div><div className="l">Hôm nay</div></div>
        <div className="stat-card"><div className="n">{monthRow?.visit || 0}</div><div className="l">Tháng này</div></div>
        <div className="stat-card"><div className="n">{yearRow?.visit || 0}</div><div className="l">Năm nay ({curYear})</div></div>
        <div className="stat-card"><div className="n">{totals.visit}</div><div className="l">Tổng lượt truy cập</div></div>
      </div>

      <DailyChart byDay={byDay} field="visit" title="Lượt truy cập theo ngày" />

      <MonthlyByYear
        byMonth={byMonth} byYear={byYear} field="visit" color="#1f5c3d"
        title="Lượt truy cập theo tháng"
      />

      {byYear.length > 1 && (
        <div className="chart-card">
          <div className="chart-head"><h3>Lượt truy cập theo năm</h3></div>
          <ToggleChart labels={byYear.map((y) => y.year)} values={byYear.map((y) => y.visit)} color="#b8893a" />
        </div>
      )}
    </>
  );
}

/* ---------- Tab: Tương tác (gọi/zalo/messenger/chat) ---------- */
const ITYPES = [
  { key: "call", label: "Gọi điện", color: "#2fae60" },
  { key: "zalo", label: "Zalo", color: "#0068ff" },
  { key: "messenger", label: "Messenger", color: "#0084ff" },
  { key: "chat", label: "Chat box", color: "#c9a55c" }
];

function InteractionStats({ traffic, err, loading }) {
  if (err) return <div className="admin-msg err">{err}</div>;
  if (loading || !traffic) return <div className="admin-empty">Đang tải...</div>;

  const { totals, byMonth, byYear } = traffic;
  const totalAll = ITYPES.reduce((s, t) => s + (totals[t.key] || 0), 0);
  if (totalAll === 0) return <div className="admin-empty">Chưa ghi nhận lượt tương tác nào.</div>;

  // Thêm trường tổng tương tác mỗi ngày/tháng/năm để vẽ biểu đồ chung
  const byDaySum = traffic.byDay.map((d) => ({ ...d, all: d.call + d.zalo + d.messenger + d.chat }));
  const byMonthSum = byMonth.map((m) => ({ ...m, all: m.call + m.zalo + m.messenger + m.chat }));
  const byYearSum = byYear.map((y) => ({ ...y, all: y.call + y.zalo + y.messenger + y.chat }));

  const donut = ITYPES.map((t) => ({ label: t.label, value: totals[t.key] || 0, color: t.color }))
    .filter((d) => d.value > 0);

  return (
    <>
      <div className="admin-stats">
        {ITYPES.map((t) => (
          <div className="stat-card" key={t.key}>
            <div className="n" style={{ color: t.color }}>{totals[t.key] || 0}</div>
            <div className="l">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-head"><h3>Tỉ lệ các kênh tương tác</h3></div>
        <DonutToggle data={donut} />
      </div>

      <DailyChart byDay={byDaySum} field="all" title="Lượt tương tác theo ngày" />

      <MonthlyByYear
        byMonth={byMonthSum} byYear={byYearSum} field="all" color="#c98a8a"
        title="Tổng lượt tương tác theo tháng"
      />

      {byYearSum.length > 1 && (
        <div className="chart-card">
          <div className="chart-head"><h3>Tổng lượt tương tác theo năm</h3></div>
          <ToggleChart labels={byYearSum.map((y) => y.year)} values={byYearSum.map((y) => y.all)} color="#b8893a" />
        </div>
      )}
    </>
  );
}

/* ---------- Tab: Lịch hẹn theo ngày trong tháng ---------- */
const APPT_STATUS = [
  { key: "moi", label: "Mới / Sắp tới", color: "#e0a800" },
  { key: "dang_dung", label: "Đang phục vụ", color: "#00897b" },
  { key: "da_dung", label: "Hoàn tất", color: "#1e7a3e" },
  { key: "doi_dv", label: "Đổi DV", color: "#1c5fb0" },
  { key: "huy", label: "Đã huỷ", color: "#c0392b" }
];

// Lấy ngày hẹn (YYYY-MM-DD) từ 1 booking
function apptDay(b) {
  const raw = b.date;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  return isNaN(d.getTime())
    ? null
    : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function AppointmentStats() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);

  useEffect(() => {
    getBookings()
      .then((d) => setBookings(Array.isArray(d) ? d : []))
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  }, []);

  const { months, days, series, cards, noDate } = useMemo(() => {
    // Gom theo ngày + trạng thái
    const byDayStatus = {}; // "YYYY-MM-DD" -> { moi, da_dung, doi_dv, huy }
    const monthsSet = new Set();
    let noDate = 0;
    for (const b of bookings) {
      const day = apptDay(b);
      if (!day) { noDate++; continue; }
      monthsSet.add(day.slice(0, 7));
      const st = APPT_STATUS.some((s) => s.key === b.status) ? b.status : "moi";
      (byDayStatus[day] = byDayStatus[day] || { moi: 0, dang_dung: 0, da_dung: 0, doi_dv: 0, huy: 0 })[st]++;
    }
    monthsSet.add(month);
    const months = [...monthsSet].sort((a, b) => b.localeCompare(a));

    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

    const series = APPT_STATUS.map((s) => ({
      label: s.label,
      color: s.color,
      values: Array.from({ length: daysInMonth }, (_, i) => {
        const row = byDayStatus[`${month}-${pad2(i + 1)}`];
        return row ? row[s.key] : 0;
      })
    }));

    const cards = { total: 0, moi: 0, dang_dung: 0, da_dung: 0, doi_dv: 0, huy: 0 };
    series.forEach((se, idx) => {
      const sum = se.values.reduce((a, b) => a + b, 0);
      cards[APPT_STATUS[idx].key] = sum;
      cards.total += sum;
    });

    return { months, days, series, cards, noDate };
  }, [bookings, month]);

  if (err) return <div className="admin-msg err">{err}</div>;
  if (loading) return <div className="admin-empty">Đang tải...</div>;

  return (
    <>
      <div className="admin-stats">
        <div className="stat-card"><div className="n">{cards.total}</div><div className="l">Tổng lịch trong tháng</div></div>
        <div className="stat-card"><div className="n" style={{ color: "#1e7a3e" }}>{cards.da_dung}</div><div className="l">Đã dùng DV</div></div>
        <div className="stat-card"><div className="n" style={{ color: "#e0a800" }}>{cards.moi}</div><div className="l">Mới / Sắp tới</div></div>
        <div className="stat-card"><div className="n" style={{ color: "#c0392b" }}>{cards.huy}</div><div className="l">Đã huỷ</div></div>
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <h3>Lịch hẹn theo ngày</h3>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((mm) => (
              <option key={mm} value={mm}>Tháng {mm.slice(5)}/{mm.slice(0, 4)}</option>
            ))}
          </select>
        </div>

        <div className="appt-legend">
          {APPT_STATUS.map((s) => (
            <span key={s.key} className="al-item">
              <span className="al-dot" style={{ background: s.color }} />{s.label}
            </span>
          ))}
        </div>

        {cards.total === 0 ? (
          <div className="admin-empty">Tháng này chưa có lịch hẹn nào.</div>
        ) : (
          <StackedToggleChart labels={days} series={series} />
        )}

        {noDate > 0 && (
          <div className="chart-sub" style={{ textTransform: "none" }}>
            * Có {noDate} lịch chưa chọn ngày hẹn nên không hiển thị trên biểu đồ.
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Tab: Doanh thu & báo cáo kinh doanh ---------- */
const fmtMoney = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const fmtShort = (n) => {
  const x = Number(n) || 0;
  if (x >= 1e9) return (x / 1e9).toFixed(1) + "B";
  if (x >= 1e6) return (x / 1e6).toFixed(1) + "tr";
  if (x >= 1e3) return Math.round(x / 1e3) + "k";
  return String(x);
};
const DOW_LBL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/* Biểu đồ cột hiển thị nhãn giá trị đã rút gọn (cho tiền) */
function MoneyBarChart({ labels, values, color = "#1e7a3e" }) {
  const W = 720, H = 280, padL = 44, padB = 34, padT = 16, padR = 12;
  const max = Math.max(1, ...values);
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = values.length, gap = plotW / n, barW = Math.min(46, gap * 0.62);
  const ticks = [0, 0.5, 1].map((t) => ({ y: padT + plotH - plotH * t, v: max * t }));
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img">
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke="#e3e7e3" strokeWidth="1" />
            <text x={padL - 6} y={tk.y + 4} textAnchor="end" className="chart-axis">{fmtShort(tk.v)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const h = (v / max) * plotH;
          const x = padL + gap * i + (gap - barW) / 2;
          const y = padT + plotH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx="5" fill={color}><title>{labels[i]}: {fmtMoney(v)}</title></rect>
              {v > 0 && <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="chart-val">{fmtShort(v)}</text>}
              <text x={x + barW / 2} y={H - padB + 18} textAnchor="middle" className="chart-lbl">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RevenueStats() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    getBookings()
      .then((d) => setBookings(Array.isArray(d) ? d : []))
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  }, []);

  const done = useMemo(() => bookings.filter((b) => b.status === "da_dung"), [bookings]);

  const dateOf = (b) => {
    const raw = b.date && /^\d{4}-\d{2}-\d{2}/.test(b.date) ? b.date : b.createdAt;
    const d = raw ? new Date(raw) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  };

  const { years, revByMonth, topServices, byDow, byHour, totals } = useMemo(() => {
    const yearsSet = new Set();
    const revByMonthMap = {};
    const svc = {};
    const dow = Array(7).fill(0);
    const hour = {};
    let totalRev = 0, totalThisYear = 0, totalThisMonth = 0;
    for (const b of done) {
      const d = dateOf(b);
      const amt = b.amount || 0;
      totalRev += amt;
      if (d) {
        yearsSet.add(d.getFullYear());
        if (d.getFullYear() === year) {
          (revByMonthMap[d.getMonth()] = (revByMonthMap[d.getMonth()] || 0) + amt);
          totalThisYear += amt;
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) totalThisMonth += amt;
        }
        dow[(d.getDay() + 6) % 7] += 1;
        const hk = b.date && b.date.includes("T") ? b.date.split("T")[1].slice(0, 2) : null;
        if (hk) hour[hk] = (hour[hk] || 0) + 1;
      }
      const key = (b.service || "Khác").trim() || "Khác";
      const s = (svc[key] = svc[key] || { label: key, count: 0, revenue: 0 });
      s.count += 1; s.revenue += amt;
    }
    const revByMonth = MONTHS.map((_, i) => revByMonthMap[i] || 0);
    const topServices = Object.values(svc).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const hourKeys = Object.keys(hour).sort();
    const byHour = { labels: hourKeys.map((h) => h + "h"), values: hourKeys.map((h) => hour[h]) };
    return {
      years: [...yearsSet].sort((a, b) => b - a),
      revByMonth, topServices, byDow: dow,
      byHour,
      totals: { totalRev, totalThisYear, totalThisMonth, count: done.length, avg: done.length ? Math.round(totalRev / done.length) : 0 }
    };
  }, [done, year]); // eslint-disable-line

  if (err) return <div className="admin-msg err">{err}</div>;
  if (loading) return <div className="admin-empty">Đang tải...</div>;
  if (done.length === 0) return <div className="admin-empty">Chưa có lịch nào “Đã dùng DV” để tính doanh thu. Hãy đánh dấu hoàn tất & nhập số tiền ở mục Đặt lịch.</div>;

  const maxSvcRev = Math.max(1, ...topServices.map((s) => s.revenue));

  return (
    <>
      <div className="admin-stats">
        <div className="stat-card"><div className="n">{fmtShort(totals.totalRev)}</div><div className="l">Tổng doanh thu</div></div>
        <div className="stat-card"><div className="n">{fmtShort(totals.totalThisMonth)}</div><div className="l">Tháng này</div></div>
        <div className="stat-card"><div className="n">{fmtShort(totals.totalThisYear)}</div><div className="l">Năm {now.getFullYear()}</div></div>
        <div className="stat-card"><div className="n">{fmtShort(totals.avg)}</div><div className="l">TB/lượt ({totals.count} lượt)</div></div>
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <h3>Doanh thu theo tháng</h3>
          {years.length > 0 && (
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          )}
        </div>
        <MoneyBarChart labels={MONTHS} values={revByMonth} />
      </div>

      <div className="chart-card">
        <div className="chart-head"><h3>Dịch vụ doanh thu cao nhất</h3></div>
        {topServices.length === 0 ? <div className="admin-empty">Chưa có dữ liệu.</div> : (
          <div className="rev-rank">
            {topServices.map((s, i) => (
              <div key={s.label} className="rev-row">
                <span className="rev-name" title={s.label}>{i + 1}. {s.label}</span>
                <span className="rev-bar"><span style={{ width: `${(s.revenue / maxSvcRev) * 100}%` }} /></span>
                <span className="rev-val">{fmtMoney(s.revenue)} <small>· {s.count} lượt</small></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-head"><h3>Ngày đông khách trong tuần</h3></div>
        <BarChart labels={DOW_LBL} values={byDow} color="#c9a55c" />
      </div>

      {byHour.labels.length > 0 && (
        <div className="chart-card">
          <div className="chart-head"><h3>Khung giờ đông khách</h3></div>
          <BarChart labels={byHour.labels} values={byHour.values} color="#6f9e7f" />
          <div className="chart-sub" style={{ textTransform: "none" }}>* Chỉ tính các lịch có nhập giờ hẹn.</div>
        </div>
      )}
    </>
  );
}

/* ---------- Tab: Thống kê nhân viên (sao & số khách) ---------- */
const Stars = ({ n }) => (
  <span style={{ color: "#f5b301", letterSpacing: 1, whiteSpace: "nowrap" }}>
    {"★".repeat(Math.round(n))}<span style={{ color: "#d8dcd8" }}>{"★".repeat(5 - Math.round(n))}</span>
  </span>
);

function StaffStats() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 12 tháng gần nhất + "Tất cả thời gian"
  const monthOpts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOpts.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  }

  useEffect(() => {
    setLoading(true); setErr("");
    getStaffStats(month)
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setErr("Không tải được dữ liệu. Kiểm tra backend & đăng nhập."))
      .finally(() => setLoading(false));
  }, [month]);

  const top = rows[0];
  const maxServed = Math.max(1, ...rows.map((r) => r.served));

  return (
    <div>
      <div className="chart-card">
        <div className="chart-head">
          <h3>Thống kê theo nhân viên</h3>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Tất cả thời gian</option>
            {monthOpts.map((m) => <option key={m} value={m}>Tháng {m.slice(5)}/{m.slice(0, 4)}</option>)}
          </select>
        </div>

        {err && <div className="admin-msg err">{err}</div>}
        {loading ? (
          <div className="admin-empty">Đang tải...</div>
        ) : rows.length === 0 ? (
          <div className="admin-empty">Chưa có dữ liệu nhân viên trong {month ? "tháng này" : "khoảng này"}. Cần gán KTV cho lịch & có đánh giá.</div>
        ) : (
          <>
            {top && top.reviews > 0 && (
              <div className="top-service">
                🏆 Nhiều sao nhất: <b>{top.staff}</b> — {top.avg} ★ ({top.reviews} đánh giá), phục vụ {top.served} khách
              </div>
            )}
            <div className="staff-stat-list">
              {rows.map((r) => (
                <div key={r.staff} className="staff-stat">
                  <div className="ss-name">{r.staff}</div>
                  <div className="ss-rating">
                    <Stars n={r.avg} /> <b>{r.avg || "—"}</b>
                    <span className="ss-sub">{r.reviews} đánh giá</span>
                  </div>
                  <div className="ss-served">
                    <div className="ss-served-bar"><span style={{ width: `${(r.served / maxServed) * 100}%` }} /></div>
                    <span className="ss-served-n">{r.served} khách</span>
                  </div>
                  <div className="ss-stars">
                    {[5, 4, 3, 2, 1].map((s) => r.stars[s] ? (
                      <span key={s} className="ss-star-chip">{s}★ <b>{r.stars[s]}</b></span>
                    ) : null)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Trang Thống kê có nhiều tab ---------- */
export default function Stats() {
  const [tab, setTab] = useState("booking");
  const { traffic, err, loading } = useTraffic();

  return (
    <div>
      <div className="admin-toolbar">
        <h2>Thống kê</h2>
        <div className="basis-switch stats-tabs">
          <button className={tab === "booking" ? "on" : ""} onClick={() => setTab("booking")}>📅 Đặt lịch</button>
          <button className={tab === "revenue" ? "on" : ""} onClick={() => setTab("revenue")}>💰 Doanh thu</button>
          <button className={tab === "appointment" ? "on" : ""} onClick={() => setTab("appointment")}>📋 Lịch hẹn</button>
          <button className={tab === "staff" ? "on" : ""} onClick={() => setTab("staff")}>🧑‍🔧 Nhân viên</button>
          <button className={tab === "traffic" ? "on" : ""} onClick={() => setTab("traffic")}>👥 Truy cập</button>
          <button className={tab === "interaction" ? "on" : ""} onClick={() => setTab("interaction")}>📞 Tương tác</button>
        </div>
      </div>

      {tab === "booking" && <BookingStats />}
      {tab === "revenue" && <RevenueStats />}
      {tab === "appointment" && <AppointmentStats />}
      {tab === "staff" && <StaffStats />}
      {tab === "traffic" && <TrafficStats traffic={traffic} err={err} loading={loading} />}
      {tab === "interaction" && <InteractionStats traffic={traffic} err={err} loading={loading} />}
    </div>
  );
}
