// ─── DATA ───────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    day: 1,
    slug: "01-todo-app",
    title: "Todo App",
    desc: "Ứng dụng quản lý công việc với drag & drop, priority levels, due dates và localStorage persistence.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/01-todo-app/index.html",
    accent: "#2CB043",
    date: "2026-06-22",
  },
  {
    day: 2,
    slug: "02-notes-app",
    title: "Notes App",
    desc: "Ghi chú nhanh với markdown support và tìm kiếm real-time.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/02-notes-app/index.html",
    accent: "#2B6CB0",
    date: "2026-06-23",
  },
  {
    day: 3,
    slug: "03-pomodoro-timer",
    title: "Pomodoro Timer",
    desc: "Bộ đếm giờ Pomodoro với âm thanh và thống kê session.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/03-pomodoro-timer/index.html",
    accent: "#C0392B",
    date: "2026-06-24",
  },
  {
    day: 4,
    slug: "04-habit-tracker",
    title: "Habit Tracker",
    desc: "Theo dõi thói quen hàng ngày với streak counter và heatmap.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/04-habit-tracker/index.html",
    accent: "#8E44AD",
    date: "2026-06-25",
  },
  {
    day: 5,
    slug: "05-expense-tracker",
    title: "Expense Tracker",
    desc: "Quản lý chi tiêu cá nhân với biểu đồ phân loại.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/05-expense-tracker/index.html",
    accent: "#E67E22",
    date: "2026-06-26",
  },
  {
    day: 6,
    slug: "06-bmi-calculator",
    title: "BMI Calculator",
    desc: "Tính chỉ số BMI với visual indicator và gợi ý sức khoẻ.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/06-bmi-calculator/index.html",
    accent: "#16A085",
    date: "2026-06-27",
  },
  {
    day: 7,
    slug: "07-unit-converter",
    title: "Unit Converter",
    desc: "Chuyển đổi đơn vị đo lường tổng hợp: nhiệt độ, độ dài, khối lượng.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/07-unit-converter/index.html",
    accent: "#2980B9",
    date: "2026-06-28",
  },
  {
    day: 8,
    slug: "08-password-generator",
    title: "Password Generator",
    desc: "Tạo mật khẩu mạnh với tùy chọn ký tự và strength meter.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/08-password-generator/index.html",
    accent: "#1A1916",
    date: "2026-06-29",
  },
  {
    day: 9,
    slug: "09-color-palette-generator",
    title: "Color Palette",
    desc: "Tạo bảng màu harmonious từ màu gốc với export hex.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/09-color-palette-generator/index.html",
    accent: "#E84393",
    date: "2026-06-30",
  },
  {
    day: 10,
    slug: "10-markdown-previewer",
    title: "Markdown Previewer",
    desc: "Editor markdown split-view với live preview và syntax highlight.",
    langs: ["html", "css", "js"],
    status: "done",
    file: "/10-markdown-previewer/index.html",
    accent: "#6C3483",
    date: "2026-06-30",
  },
  {
    day: 11,
    slug: "11-modal-component",
    title: "Modal Component",
    desc: "Thư viện modal reusable với animation, stacking và accessibility.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#117A65",
    date: null,
  },
  {
    day: 12,
    slug: "12-image-slider",
    title: "Image Slider",
    desc: "Carousel slider mượt với touch swipe, autoplay và thumbnails.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#B7950B",
    date: null,
  },
];

const langMeta = {
  html: { label: "HTML", cls: "lang-html", dot: "#E34F26" },
  css: { label: "CSS", cls: "lang-css", dot: "#1572B6" },
  js: { label: "JS", cls: "lang-js", dot: "#F7DF1E" },
  ts: { label: "TS", cls: "lang-ts", dot: "#3178C6" },
  react: { label: "React", cls: "lang-react", dot: "#61DAFB" },
  python: { label: "Python", cls: "lang-python", dot: "#3776AB" },
  vue: { label: "Vue", cls: "lang-vue", dot: "#4FC08D" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── HEATMAP ─────────────────────────────────────────────────────────────
function buildProjectCountMap() {
  const map = {};
  PROJECTS.forEach((p) => {
    if (p.status === "done" && p.date) map[p.date] = (map[p.date] || 0) + 1;
  });
  return map;
}

/**
 * Render heatmap fitting exactly `numWeeks` columns into the container.
 * Called once on load and again on resize via ResizeObserver.
 */
function renderHeatmap(numWeeks) {
  const countMap = buildProjectCountMap();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Build date range: numWeeks*7 days ending today
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (numWeeks * 7 - 1));

  // Align start to the Sunday of its week
  const cur = new Date(start);
  cur.setDate(cur.getDate() - cur.getDay()); // back to Sunday

  // Build column data
  const cols = [];
  let col = [];
  let totalProjects = 0;

  const tmpCur = new Date(cur);
  while (tmpCur <= end) {
    const ds = tmpCur.toISOString().slice(0, 10);
    const inRange = tmpCur >= start;
    const count = inRange ? countMap[ds] || 0 : 0;
    if (inRange) totalProjects += count;
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    col.push({ date: ds, count, level, inRange });
    if (tmpCur.getDay() === 6) {
      cols.push(col);
      col = [];
    }
    tmpCur.setDate(tmpCur.getDate() + 1);
  }
  if (col.length) {
    while (col.length < 7) col.push(null);
    cols.push(col);
  }

  // Trim to exactly numWeeks (drop leading empty cols if alignment added extra)
  while (cols.length > numWeeks) cols.shift();

  // ── Render month labels ──
  const monthsEl = document.getElementById("heatmap-months");
  monthsEl.innerHTML = "";
  let lastMonth = -1;
  cols.forEach((col) => {
    const firstReal = col.find((c) => c && c.inRange);
    const mEl = document.createElement("div");
    mEl.className = "month-label";
    if (firstReal) {
      const m = new Date(firstReal.date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        mEl.textContent = monthNames[m];
      }
    }
    monthsEl.appendChild(mEl);
  });

  // ── Render grid ──
  const grid = document.getElementById("heatmap-grid");
  grid.innerHTML = "";

  cols.forEach((col) => {
    const colEl = document.createElement("div");
    colEl.className = "heatmap-col";
    for (let r = 0; r < 7; r++) {
      const cell = document.createElement("div");
      const d = col ? col[r] : null;
      cell.className = "heatmap-cell";
      if (!d || !d.inRange) {
        cell.style.opacity = "0";
        cell.style.pointerEvents = "none";
      } else {
        if (d.level > 0) cell.dataset.level = d.level;
        cell.dataset.date = d.date;
        cell.dataset.count = d.count;
        cell.addEventListener("mouseenter", showTooltip);
        cell.addEventListener("mouseleave", hideTooltip);
      }
      colEl.appendChild(cell);
    }
    grid.appendChild(colEl);
  });

  document.getElementById("heatmap-total").innerHTML = `<strong>${totalProjects}</strong> projects completed`;
  document.getElementById("heatmap-summary").textContent = `${totalProjects} project trong ${numWeeks} tuần qua`;
}

/**
 * Measure the grid container width and compute how many week-columns fit
 * given cell size + gap. Re-renders the heatmap to fit perfectly.
 */
function fitHeatmap() {
  const grid = document.getElementById("heatmap-grid");
  if (!grid) return;

  // Available width for the grid (parent minus the days-label column)
  const wrap = grid.closest(".heatmap-wrap");
  const wrapW = wrap.clientWidth - 48; // 24px padding each side
  const daysColW = 28 + 4; // .heatmap-days width + body gap
  const available = wrapW - daysColW;

  // Cell size: we target ~13px cells with 3px gap, but allow them to grow.
  // Compute max weeks that keep cells ≥ 10px wide.
  const minCell = 10;
  const gap = 3;
  // available = numWeeks * cellW + (numWeeks-1) * gap
  // → numWeeks = (available + gap) / (minCell + gap)
  const maxWeeks = Math.floor((available + gap) / (minCell + gap));

  // Cap at 52 weeks (1 year), minimum 12 weeks
  const numWeeks = Math.max(12, Math.min(52, maxWeeks));
  renderHeatmap(numWeeks);
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────
const tooltip = document.getElementById("tooltip");

function showTooltip(e) {
  const { date, count } = e.target.dataset;
  if (!date) return;
  const d = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const cnt = parseInt(count);
  tooltip.textContent = cnt > 0 ? `${cnt} project · ${label}` : `Không có project · ${label}`;
  tooltip.style.opacity = "1";
  moveTooltip(e);
  e.target.addEventListener("mousemove", moveTooltip);
}

function moveTooltip(e) {
  tooltip.style.left = e.clientX + 12 + "px";
  tooltip.style.top = e.clientY - 28 + "px";
}

function hideTooltip(e) {
  tooltip.style.opacity = "0";
  e.target.removeEventListener("mousemove", moveTooltip);
}

// ─── FILTER & CARDS ──────────────────────────────────────────────────────
let activeFilter = "all";

function filterProjects(lang, btn) {
  activeFilter = lang;
  document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  renderCards();
}

function renderCards() {
  const grid = document.getElementById("project-grid");
  const filtered = activeFilter === "all" ? PROJECTS : PROJECTS.filter((p) => p.langs.includes(activeFilter));
  grid.innerHTML = filtered
    .map((p) => {
      const statusLabel = { done: "Hoàn thành", wip: "Đang làm", planned: "Sắp tới" }[p.status];
      const statusCls = { done: "status-done", wip: "status-wip", planned: "status-planned" }[p.status];
      const langBadges = p.langs
        .map((l) => {
          const m = langMeta[l] || { label: l, cls: "", dot: "#888" };
          return `<span class="lang-badge ${m.cls}"><span class="lang-dot" style="background:${m.dot}"></span>${m.label}</span>`;
        })
        .join("");
      const cardClass = `project-card${p.status === "planned" ? " planned" : ""}`;
      const href = p.file ? p.file : "#";
      return `<a class="${cardClass}" href="${href}" style="--card-accent:${p.accent}">
      <div class="card-header">
        <div class="card-day-badge">D${String(p.day).padStart(2, "0")}</div>
        <span class="card-status ${statusCls}">${statusLabel}</span>
      </div>
      <div>
        <div class="card-title">${p.title}</div>
        <div class="card-desc">${p.desc}</div>
      </div>
      <div class="card-footer">
        <div class="lang-badges">${langBadges}</div>
        ${
          p.status !== "planned"
            ? `<div class="card-link-icon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6.5 1.5h4v4l-1.5-1.5-4 4-1-1 4-4L6.5 1.5zM2 3h3v1H2.5v6h6V8.5h1V10a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 1.5 10V3.5A.5.5 0 0 1 2 3z"/></svg>
        </div>`
            : ""
        }
      </div>
    </a>`;
    })
    .join("");
}

function buildFilterChips() {
  const allLangs = [...new Set(PROJECTS.flatMap((p) => p.langs))];
  const row = document.getElementById("filter-row");
  allLangs.forEach((l) => {
    const m = langMeta[l] || { label: l, dot: "#888" };
    const btn = document.createElement("button");
    btn.className = "filter-chip";
    btn.dataset.lang = l;
    btn.innerHTML = `<span class="filter-dot" style="background:${m.dot}"></span>${m.label}`;
    btn.onclick = () => filterProjects(l, btn);
    row.appendChild(btn);
  });
}

// ─── STATS ───────────────────────────────────────────────────────────────
function updateStats() {
  const done = PROJECTS.filter((p) => p.status === "done").length;
  const remaining = 30 - done;
  const usedLangs = new Set(PROJECTS.filter((p) => p.status === "done").flatMap((p) => p.langs)).size;

  const doneDates = PROJECTS.filter((p) => p.date && p.status === "done")
    .map((p) => p.date)
    .sort();
  let streak = 0;
  if (doneDates.length) {
    let cur = new Date(todayStr());
    while (true) {
      const ds = cur.toISOString().slice(0, 10);
      if (doneDates.includes(ds)) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else break;
    }
  }

  document.getElementById("stat-done").textContent = done;
  document.getElementById("stat-streak").textContent = streak;
  document.getElementById("stat-remaining").textContent = remaining;
  document.getElementById("stat-langs").textContent = usedLangs;
  document.getElementById("nav-day-count").textContent = `Day ${done}`;
}

// ─── INIT ─────────────────────────────────────────────────────────────────
buildFilterChips();
renderCards();
updateStats();

// Fit heatmap on load and on every resize
fitHeatmap();
const ro = new ResizeObserver(() => fitHeatmap());
ro.observe(document.getElementById("heatmap-grid").closest(".heatmap-wrap"));
