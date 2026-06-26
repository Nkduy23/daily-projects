"use strict";

// ─── Categories ───────────────────────────────────────────────────────────
const EXPENSE_CATS = [
  { id: "food", name: "Ăn uống", emoji: "🍜", color: "#E53E3E", bg: "#FEF2F2" },
  { id: "transport", name: "Di chuyển", emoji: "🚗", color: "#DD6B20", bg: "#FFF7ED" },
  { id: "shopping", name: "Mua sắm", emoji: "🛍️", color: "#D69E2E", bg: "#FFFBEB" },
  { id: "health", name: "Sức khoẻ", emoji: "💊", color: "#38A169", bg: "#F0FDF4" },
  { id: "entertain", name: "Giải trí", emoji: "🎮", color: "#805AD5", bg: "#FAF5FF" },
  { id: "bills", name: "Hoá đơn", emoji: "📃", color: "#3182CE", bg: "#EBF4FF" },
  { id: "education", name: "Học tập", emoji: "📚", color: "#2B6CB0", bg: "#EBF8FF" },
  { id: "home", name: "Nhà ở", emoji: "🏠", color: "#B7791F", bg: "#FFFAF0" },
  { id: "coffee", name: "Cà phê", emoji: "☕", color: "#744210", bg: "#FEFCE8" },
  { id: "other", name: "Khác", emoji: "💬", color: "#718096", bg: "#F7FAFC" },
];

const INCOME_CATS = [
  { id: "salary", name: "Lương", emoji: "💰", color: "#16A34A", bg: "#F0FDF4" },
  { id: "freelance", name: "Freelance", emoji: "💻", color: "#2B6CB0", bg: "#EBF4FF" },
  { id: "invest", name: "Đầu tư", emoji: "📈", color: "#805AD5", bg: "#FAF5FF" },
  { id: "gift", name: "Quà tặng", emoji: "🎁", color: "#D69E2E", bg: "#FFFBEB" },
  { id: "other_in", name: "Khác", emoji: "💬", color: "#718096", bg: "#F7FAFC" },
];

function catById(id) {
  return [...EXPENSE_CATS, ...INCOME_CATS].find((c) => c.id === id) || EXPENSE_CATS.at(-1);
}

// ─── Storage ──────────────────────────────────────────────────────────────
const KEY = "spendo_v1";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(txns));
}

// ─── State ────────────────────────────────────────────────────────────────
let txns = load();
let period = { year: new Date().getFullYear(), month: new Date().getMonth() }; // 0-indexed
let editingId = null;
let selType = "expense";
let selCat = "food";
let chartType = "expense";
let searchQ = "";
let filterCat = "all";

// ─── Helpers ──────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function fmt(n) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
}

function fmtShort(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

function periodTxns() {
  return txns.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === period.year && d.getMonth() === period.month;
  });
}

function periodLabel() {
  const now = new Date();
  const isNow = period.year === now.getFullYear() && period.month === now.getMonth();
  if (isNow) return "Tháng này";
  return new Date(period.year, period.month).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Render: summary ──────────────────────────────────────────────────────
function renderSummary() {
  const list = periodTxns();
  const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  document.getElementById("total-income").textContent = fmt(income);
  document.getElementById("total-expense").textContent = fmt(expense);
  document.getElementById("total-balance").textContent = fmt(balance);
  document.getElementById("total-txn").textContent = list.length;

  document.getElementById("total-balance").style.color = balance >= 0 ? "var(--green)" : "var(--red)";
}

// ─── Render: donut chart ──────────────────────────────────────────────────
const DONUT_R = 60;
const DONUT_CIRC = 2 * Math.PI * DONUT_R; // ≈ 376.99

function renderDonut() {
  const list = periodTxns().filter((t) => t.type === chartType);
  const total = list.reduce((s, t) => s + t.amount, 0);

  const svg = document.getElementById("donut-svg");
  const legend = document.getElementById("chart-legend");

  // group by category
  const groups = {};
  list.forEach((t) => {
    groups[t.cat] = (groups[t.cat] || 0) + t.amount;
  });
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);

  // clear old segments (keep the bg circle)
  svg.querySelectorAll(".donut-seg").forEach((el) => el.remove());

  document.getElementById("donut-total").textContent = fmt(total);

  if (total === 0) {
    legend.innerHTML = '<div style="font-size:12px;color:var(--text-3);text-align:center;padding:8px 0">Không có dữ liệu</div>';
    return;
  }

  let offset = 0;
  const segs = sorted.map(([catId, amt]) => {
    const cat = catById(catId);
    const pct = amt / total;
    const dash = pct * DONUT_CIRC;
    const gap = DONUT_CIRC - dash;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "donut-seg");
    circle.setAttribute("cx", "80");
    circle.setAttribute("cy", "80");
    circle.setAttribute("r", String(DONUT_R));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", cat.color);
    circle.setAttribute("stroke-width", "22");
    circle.setAttribute("stroke-dasharray", `${dash} ${gap}`);
    circle.setAttribute("stroke-dashoffset", String(-offset));
    circle.style.transition = "stroke-dashoffset 0.5s ease";
    circle.title = `${cat.name}: ${fmt(amt)}`;
    svg.appendChild(circle);

    offset += dash;
    return { cat, amt, pct };
  });

  legend.innerHTML = segs
    .map(
      ({ cat, amt, pct }) => `
    <div class="legend-row">
      <div class="legend-dot" style="background:${cat.color}"></div>
      <div class="legend-name">${cat.emoji} ${cat.name}</div>
      <div class="legend-amt">${fmtShort(amt)}₫</div>
      <div class="legend-pct">${Math.round(pct * 100)}%</div>
    </div>
  `,
    )
    .join("");
}

// ─── Render: daily bars ───────────────────────────────────────────────────
function renderDailyBars() {
  const daysInMonth = new Date(period.year, period.month + 1, 0).getDate();
  const todayDate = new Date();
  const isCurrentMonth = period.year === todayDate.getFullYear() && period.month === todayDate.getMonth();

  const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${period.year}-${String(period.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const amt = txns.filter((t) => t.type === "expense" && t.date === dateStr).reduce((s, t) => s + t.amount, 0);
    return { day, amt, isToday: isCurrentMonth && day === todayDate.getDate() };
  });

  const maxAmt = Math.max(1, ...dailyTotals.map((d) => d.amt));

  const barsEl = document.getElementById("daily-bars");
  const labelsEl = document.getElementById("daily-labels");

  // Show last 14 days max for readability
  const visible = isCurrentMonth ? dailyTotals.slice(Math.max(0, todayDate.getDate() - 14), todayDate.getDate()) : dailyTotals.slice(-14);

  barsEl.innerHTML = visible
    .map(
      (d) => `
    <div class="daily-bar-wrap">
      <div class="daily-bar${d.isToday ? " today" : ""}"
        style="height:${Math.max(2, Math.round((d.amt / maxAmt) * 76))}px"
        title="${d.day}/${period.month + 1}: ${fmt(d.amt)}"></div>
    </div>
  `,
    )
    .join("");

  labelsEl.innerHTML = visible
    .map(
      (d) => `
    <div class="bar-label${d.isToday ? " today" : ""}">${d.day}</div>
  `,
    )
    .join("");
}

// ─── Render: filter chips ─────────────────────────────────────────────────
function renderFilterChips() {
  const list = periodTxns();
  const cats = [...new Set(list.map((t) => t.cat))];
  const row = document.getElementById("filter-chips");
  row.innerHTML = `<button class="fchip${filterCat === "all" ? " active" : ""}" data-cat="all">Tất cả</button>`;
  cats.forEach((catId) => {
    const cat = catById(catId);
    const btn = document.createElement("button");
    btn.className = `fchip${filterCat === catId ? " active" : ""}`;
    btn.dataset.cat = catId;
    btn.textContent = `${cat.emoji} ${cat.name}`;
    btn.addEventListener("click", () => {
      filterCat = catId;
      renderFilterChips();
      renderTxnList();
    });
    row.appendChild(btn);
  });
  row.querySelector('[data-cat="all"]').addEventListener("click", () => {
    filterCat = "all";
    renderFilterChips();
    renderTxnList();
  });
}

// ─── Render: transaction list ─────────────────────────────────────────────
function renderTxnList() {
  let list = periodTxns();

  if (filterCat !== "all") list = list.filter((t) => t.cat === filterCat);

  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter((t) => t.desc.toLowerCase().includes(q) || (t.note || "").toLowerCase().includes(q) || catById(t.cat).name.toLowerCase().includes(q));
  }

  // sort by date desc
  list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const el = document.getElementById("txn-list");
  const empty = document.getElementById("txn-empty");

  if (list.length === 0) {
    el.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  // group by date
  const groups = {};
  list.forEach((t) => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });

  el.innerHTML = Object.entries(groups)
    .map(([date, items]) => {
      const d = new Date(date + "T00:00:00");
      const lbl = d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "short" });
      const dayExpense = items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const dayIncome = items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const dayNet = dayIncome - dayExpense;

      return `<div class="txn-day-group">
      <div class="txn-day-header">
        <span>${lbl}</span>
        <span class="txn-day-total" style="color:${dayNet >= 0 ? "var(--green)" : "var(--red)"}">
          ${dayNet >= 0 ? "+" : ""}${fmt(dayNet)}
        </span>
      </div>
      ${items
        .map((t) => {
          const cat = catById(t.cat);
          return `<div class="txn-item" data-id="${t.id}">
          <div class="txn-cat-icon" style="background:${cat.bg}">${cat.emoji}</div>
          <div class="txn-body">
            <div class="txn-desc">${escHtml(t.desc)}</div>
            <div class="txn-meta">
              <span class="txn-cat-badge">${cat.name}</span>
              ${t.note ? `<span>· ${escHtml(t.note)}</span>` : ""}
            </div>
          </div>
          <span class="txn-amount ${t.type}">${t.type === "expense" ? "-" : "+"}${fmt(t.amount)}</span>
          <div class="txn-actions">
            <button class="icon-btn edit-btn" data-id="${t.id}" title="Sửa">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M9.854.146a.5.5 0 0 0-.707 0l-1.5 1.5a.5.5 0 0 0 0 .707l3 3a.5.5 0 0 0 .707 0l1.5-1.5a.5.5 0 0 0 0-.707l-3-3zM8.5 3.207 10.793 5.5 4.5 11.793V11.5a.5.5 0 0 0-.5-.5H3.5a.5.5 0 0 0-.5.5v.5H2.5a.5.5 0 0 0-.5.5v.5h-.5a.5.5 0 0 0-.5.5V14h1.5a.5.5 0 0 0 .5-.5v-.5h.5a.5.5 0 0 0 .5-.5v-.5h.293L8.5 3.207z"/></svg>
            </button>
            <button class="icon-btn danger del-btn" data-id="${t.id}" title="Xóa">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>`;
        })
        .join("")}
    </div>`;
    })
    .join("");

  // bind edit/delete
  el.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(btn.dataset.id);
    });
  });

  el.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Xóa giao dịch này?")) {
        txns = txns.filter((t) => t.id !== btn.dataset.id);
        save();
        renderAll();
        toast("Đã xóa giao dịch");
      }
    });
  });
}

// ─── Render all ───────────────────────────────────────────────────────────
function renderAll() {
  document.getElementById("period-label").textContent = periodLabel();
  renderSummary();
  renderDonut();
  renderDailyBars();
  renderFilterChips();
  renderTxnList();
}

// ─── Category grid (modal) ────────────────────────────────────────────────
function renderCatGrid() {
  const cats = selType === "expense" ? EXPENSE_CATS : INCOME_CATS;
  // default to first cat of this type if selCat doesn't exist
  if (!cats.find((c) => c.id === selCat)) selCat = cats[0].id;

  document.getElementById("cat-grid").innerHTML = cats
    .map(
      (c) => `
    <button class="cat-opt${c.id === selCat ? " selected" : ""}"
      data-id="${c.id}"
      style="--cat-color:${c.color};--cat-bg:${c.bg}">
      <span class="cat-emoji">${c.emoji}</span>
      <span class="cat-name">${c.name}</span>
    </button>
  `,
    )
    .join("");

  document.querySelectorAll(".cat-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      selCat = btn.dataset.id;
      renderCatGrid();
    });
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────
function openModal(id = null) {
  editingId = id;
  const t = id ? txns.find((x) => x.id === id) : null;

  document.getElementById("modal-title").textContent = id ? "Sửa giao dịch" : "Thêm giao dịch";

  selType = t ? t.type : "expense";
  selCat = t ? t.cat : "food";

  document.getElementById("txn-amount").value = t ? String(t.amount) : "";
  document.getElementById("txn-desc").value = t ? t.desc : "";
  document.getElementById("txn-date").value = t ? t.date : todayStr();
  document.getElementById("txn-note").value = t ? t.note || "" : "";

  updateTypeToggle();
  renderCatGrid();
  document.getElementById("modal-backdrop").classList.add("open");
  setTimeout(() => document.getElementById("txn-amount").focus(), 50);
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
  editingId = null;
}

function updateTypeToggle() {
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === selType);
    if (btn.dataset.type === selType) btn.classList.add(selType);
    else btn.classList.remove("expense", "income");
  });
  renderCatGrid();
}

function saveTransaction() {
  const rawAmt = document.getElementById("txn-amount").value.replace(/[^0-9]/g, "");
  const amount = parseInt(rawAmt, 10);
  const desc = document.getElementById("txn-desc").value.trim();
  const date = document.getElementById("txn-date").value;

  if (!amount || amount <= 0) {
    toast("Vui lòng nhập số tiền hợp lệ");
    return;
  }
  if (!desc) {
    toast("Vui lòng nhập mô tả");
    return;
  }
  if (!date) {
    toast("Vui lòng chọn ngày");
    return;
  }

  const note = document.getElementById("txn-note").value.trim();

  if (editingId) {
    const t = txns.find((x) => x.id === editingId);
    if (t) {
      t.amount = amount;
      t.desc = desc;
      t.date = date;
      t.note = note;
      t.type = selType;
      t.cat = selCat;
    }
    toast("Đã cập nhật giao dịch ✓");
  } else {
    txns.push({ id: uid(), type: selType, amount, desc, cat: selCat, date, note, createdAt: Date.now() });
    toast(selType === "expense" ? `💸 Đã thêm chi tiêu ${fmt(amount)}` : `💰 Đã thêm thu nhập ${fmt(amount)}`);
  }

  save();
  closeModal();
  // jump to the period of the saved txn
  const d = new Date(date + "T00:00:00");
  period = { year: d.getFullYear(), month: d.getMonth() };
  renderAll();
}

// ─── CSV Export ───────────────────────────────────────────────────────────
function exportCSV() {
  const list = periodTxns().sort((a, b) => a.date.localeCompare(b.date));
  if (list.length === 0) {
    toast("Không có dữ liệu để xuất");
    return;
  }

  const rows = [["Ngày", "Loại", "Danh mục", "Mô tả", "Số tiền", "Ghi chú"]];
  list.forEach((t) => {
    const cat = catById(t.cat);
    rows.push([t.date, t.type === "expense" ? "Chi tiêu" : "Thu nhập", cat.name, t.desc, t.amount, t.note || ""]);
  });

  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `spendo_${period.year}_${period.month + 1}.csv` });
  a.click();
  URL.revokeObjectURL(url);
  toast("Đã xuất CSV ✓");
}

// ─── Amount input formatting ──────────────────────────────────────────────
document.getElementById("txn-amount").addEventListener("input", function () {
  const raw = this.value.replace(/[^0-9]/g, "");
  this.value = raw;
});

// ─── Event wiring ─────────────────────────────────────────────────────────
document.getElementById("add-btn").addEventListener("click", () => openModal());
document.getElementById("empty-add-btn").addEventListener("click", () => openModal());
document.getElementById("export-btn").addEventListener("click", exportCSV);
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.getElementById("modal-save").addEventListener("click", saveTransaction);

document.getElementById("modal-backdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-backdrop")) closeModal();
});

// Type toggle
document.querySelectorAll(".type-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selType = btn.dataset.type;
    updateTypeToggle();
  });
});

// Chart toggle
document.querySelectorAll(".toggle-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    chartType = btn.dataset.type;
    document.querySelectorAll(".toggle-tab").forEach((b) => b.classList.toggle("active", b.dataset.type === chartType));
    renderDonut();
  });
});

// Period navigation
document.getElementById("prev-period").addEventListener("click", () => {
  period.month--;
  if (period.month < 0) {
    period.month = 11;
    period.year--;
  }
  renderAll();
});

document.getElementById("next-period").addEventListener("click", () => {
  const now = new Date();
  if (period.year === now.getFullYear() && period.month === now.getMonth()) return;
  period.month++;
  if (period.month > 11) {
    period.month = 0;
    period.year++;
  }
  renderAll();
});

// Search
document.getElementById("search-input").addEventListener("input", function () {
  searchQ = this.value.trim();
  renderTxnList();
});

// Keyboard
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openModal();
  }
});

// Enter to save in modal
document.getElementById("txn-desc").addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveTransaction();
});

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ─── Init ─────────────────────────────────────────────────────────────────
renderAll();
