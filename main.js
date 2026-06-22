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
    status: "planned",
    file: null,
    accent: "#2B6CB0",
    date: null,
  },
  {
    day: 3,
    slug: "03-pomodoro-timer",
    title: "Pomodoro Timer",
    desc: "Bộ đếm giờ Pomodoro với âm thanh và thống kê session.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#C0392B",
    date: null,
  },
  {
    day: 4,
    slug: "04-habit-tracker",
    title: "Habit Tracker",
    desc: "Theo dõi thói quen hàng ngày với streak counter và heatmap.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#8E44AD",
    date: null,
  },
  {
    day: 5,
    slug: "05-expense-tracker",
    title: "Expense Tracker",
    desc: "Quản lý chi tiêu cá nhân với biểu đồ phân loại.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#E67E22",
    date: null,
  },
  {
    day: 6,
    slug: "06-bmi-calculator",
    title: "BMI Calculator",
    desc: "Tính chỉ số BMI với visual indicator và gợi ý sức khoẻ.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#16A085",
    date: null,
  },
  {
    day: 7,
    slug: "07-unit-converter",
    title: "Unit Converter",
    desc: "Chuyển đổi đơn vị đo lường tổng hợp: nhiệt độ, độ dài, khối lượng.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#2980B9",
    date: null,
  },
  {
    day: 8,
    slug: "08-password-generator",
    title: "Password Generator",
    desc: "Tạo mật khẩu mạnh với tùy chọn ký tự và strength meter.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#1A1916",
    date: null,
  },
  {
    day: 9,
    slug: "09-color-palette-generator",
    title: "Color Palette",
    desc: "Tạo bảng màu harmonious từ màu gốc với export hex.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#E84393",
    date: null,
  },
  {
    day: 10,
    slug: "10-markdown-previewer",
    title: "Markdown Previewer",
    desc: "Editor markdown split-view với live preview và syntax highlight.",
    langs: ["html", "css", "js"],
    status: "planned",
    file: null,
    accent: "#6C3483",
    date: null,
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
// FIX: Build heatmap data purely from PROJECTS array — no localStorage accumulation.
// Each time the page loads, we count done projects per date directly from source.
function buildProjectCountMap() {
  const map = {};
  PROJECTS.forEach((p) => {
    if (p.status === "done" && p.date) {
      map[p.date] = (map[p.date] || 0) + 1;
    }
  });
  return map;
}

function buildHeatmap() {
  // FIX: read directly from PROJECTS, not localStorage
  const countMap = buildProjectCountMap();

  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  end.setDate(end.getDate() + 364);

  const cur = new Date(start);
  const startDow = cur.getDay(); // 0=Sun
  const cols = [];
  let col = [];

  // Pad the first week so Sunday is row 0
  for (let i = 0; i < startDow; i++) col.push(null);

  let totalProjects = 0;

  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const count = countMap[ds] || 0;
    totalProjects += count;
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    col.push({ date: ds, count, level });
    if (cur.getDay() === 6) {
      cols.push(col);
      col = [];
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (col.length) cols.push(col);

  // Build month labels
  const grid = document.getElementById("heatmap-grid");
  grid.innerHTML = "";
  const monthsEl = document.getElementById("heatmap-months");
  monthsEl.innerHTML = "";
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = -1;

  cols.forEach((col) => {
    const colEl = document.createElement("div");
    colEl.className = "heatmap-col";

    const firstReal = col.find((c) => c !== null);
    if (firstReal) {
      const m = new Date(firstReal.date).getMonth();
      const mEl = document.createElement("div");
      mEl.className = "month-label";
      if (m !== lastMonth) {
        lastMonth = m;
        mEl.textContent = monthNames[m];
      }
      monthsEl.appendChild(mEl);
    } else {
      monthsEl.appendChild(Object.assign(document.createElement("div"), { className: "month-label" }));
    }

    for (let r = 0; r < 7; r++) {
      const cell = document.createElement("div");
      const d = col[r];
      if (!d) {
        cell.className = "heatmap-cell";
        cell.style.opacity = "0";
        cell.style.pointerEvents = "none";
      } else {
        cell.className = "heatmap-cell";
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
  document.getElementById("heatmap-summary").textContent = `${totalProjects} project trong 365 ngày tới`;
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

  // Streak: count consecutive days backwards from today that have a done project
  const doneDates = PROJECTS.filter((p) => p.date && p.status === "done")
    .map((p) => p.date)
    .sort();

  let streak = 0;
  if (doneDates.length) {
    const today = todayStr();
    let cur = new Date(today);
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
buildHeatmap();
buildFilterChips();
renderCards();
updateStats();
