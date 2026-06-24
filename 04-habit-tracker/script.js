"use strict";

// ─── Constants ────────────────────────────────────────────────────────────
const STORAGE_KEY = "habito_v1";

const EMOJIS = ["📚", "🏃", "💧", "🧘", "✍️", "🎯", "💪", "🥗", "😴", "🧹", "🎨", "🎵", "💊", "🌿", "☀️", "🚴", "🍎", "📝", "🧠", "❤️"];
const COLORS = ["#E53E3E", "#DD6B20", "#D69E2E", "#38A169", "#3182CE", "#805AD5", "#D53F8C", "#2B6CB0", "#C0392B", "#8E44AD"];
const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// ─── Storage ──────────────────────────────────────────────────────────────
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { habits: [], log: {} };
  } catch {
    return { habits: [], log: {} };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ─── State ────────────────────────────────────────────────────────────────
const store = load();
// store.habits = [ { id, name, desc, emoji, color, days:[0-6], goal, createdAt } ]
// store.log    = { 'YYYY-MM-DD': { habitId: count } }

let editingId = null;
let deletingId = null;
let selEmoji = EMOJIS[0];
let selColor = COLORS[4];
let selectedDays = new Set([0, 1, 2, 3, 4, 5, 6]);

// ─── Helpers ──────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function todayDow() {
  return new Date().getDay();
} // 0=Sun

function getLog(dateStr) {
  if (!store.log[dateStr]) store.log[dateStr] = {};
  return store.log[dateStr];
}

function getCount(habitId, dateStr) {
  return (store.log[dateStr] || {})[habitId] || 0;
}

function setCount(habitId, dateStr, val) {
  if (!store.log[dateStr]) store.log[dateStr] = {};
  store.log[dateStr][habitId] = Math.max(0, val);
  save();
}

// streak = consecutive days (ending today or yesterday) habit was completed
function calcStreak(habit) {
  let streak = 0;
  const cur = new Date();
  // check from today backwards
  for (let i = 0; i < 365; i++) {
    const d = new Date(cur);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (!habit.days.includes(dow)) continue; // not scheduled — skip, don't break
    const k = dateKey(d);
    const count = getCount(habit.id, k);
    if (count >= habit.goal) streak++;
    else break;
  }
  return streak;
}

// ─── Render: today's habits ────────────────────────────────────────────────
function renderToday() {
  const today = todayKey();
  const dow = todayDow();
  const visible = store.habits.filter((h) => h.days.includes(dow));

  const wrap = document.getElementById("habits-today");
  const empty = document.getElementById("empty-today");
  const subEl = document.getElementById("today-sub");

  if (visible.length === 0) {
    wrap.innerHTML = "";
    empty.classList.remove("hidden");
    subEl.textContent = "0 / 0 hoàn thành";
    updateOverallRing(0, 0);
    return;
  }

  empty.classList.add("hidden");

  let doneCount = 0;
  visible.forEach((h) => {
    const c = getCount(h.id, today);
    if (c >= h.goal) doneCount++;
  });

  subEl.textContent = `${doneCount} / ${visible.length} hoàn thành`;
  updateOverallRing(doneCount, visible.length);

  wrap.innerHTML = visible
    .map((h) => {
      const count = getCount(h.id, today);
      const done = count >= h.goal;
      const streak = calcStreak(h);
      const pct = Math.min(1, count / h.goal);

      const goalArea =
        h.goal > 1
          ? `<div class="count-controls">
          <button class="count-btn dec" data-id="${h.id}" title="Giảm">−</button>
          <span class="count-num">${count}</span>
          <button class="count-btn inc" data-id="${h.id}" title="Tăng">+</button>
        </div>
        <div class="goal-progress">
          <div class="goal-bar-wrap"><div class="goal-bar" style="width:${pct * 100}%"></div></div>
          <div class="goal-text">${count}/${h.goal}</div>
        </div>`
          : `<button class="check-btn${done ? " done" : ""}" data-id="${h.id}" title="${done ? "Bỏ đánh dấu" : "Hoàn thành"}">
          ${
            done
              ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M13.854 3.646a.5.5 0 0 1 0 .708l-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.793l7.146-7.147a.5.5 0 0 1 .708 0z" clip-rule="evenodd"/></svg>`
              : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg>`
          }
        </button>`;

      return `<div class="habit-card${done ? " completed" : ""}" style="--habit-color:${h.color}">
      <div class="habit-emoji">${h.emoji}</div>
      <div class="habit-info">
        <div class="habit-name">${escHtml(h.name)}</div>
        <div class="habit-meta">
          ${streak > 0 ? `<span class="habit-streak">🔥 ${streak} ngày</span>` : ""}
          ${h.desc ? `<span class="habit-desc-text">${escHtml(h.desc)}</span>` : ""}
        </div>
      </div>
      <div class="habit-right">${goalArea}</div>
    </div>`;
    })
    .join("");

  // bind events
  wrap.querySelectorAll(".check-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const h = store.habits.find((x) => x.id === btn.dataset.id);
      if (!h) return;
      const cur = getCount(h.id, today);
      setCount(h.id, today, cur >= h.goal ? 0 : h.goal);
      renderAll();
      toast(cur >= h.goal ? "Bỏ đánh dấu" : `✅ ${h.name} hoàn thành!`);
    });
  });

  wrap.querySelectorAll(".count-btn.inc").forEach((btn) => {
    btn.addEventListener("click", () => {
      const h = store.habits.find((x) => x.id === btn.dataset.id);
      if (!h) return;
      const cur = getCount(h.id, today);
      setCount(h.id, today, cur + 1);
      renderAll();
      if (cur + 1 >= h.goal) toast(`✅ ${h.name} hoàn thành!`);
    });
  });

  wrap.querySelectorAll(".count-btn.dec").forEach((btn) => {
    btn.addEventListener("click", () => {
      const h = store.habits.find((x) => x.id === btn.dataset.id);
      if (!h) return;
      setCount(h.id, today, getCount(h.id, today) - 1);
      renderAll();
    });
  });
}

// ─── Overall ring ─────────────────────────────────────────────────────────
function updateOverallRing(done, total) {
  const CIRC = 69.12; // 2π×11
  const pct = total > 0 ? done / total : 0;
  document.getElementById("chip-ring-fg").style.strokeDashoffset = CIRC * (1 - pct);
  document.getElementById("chip-pct").textContent = Math.round(pct * 100) + "%";
}

// ─── Render: streaks ───────────────────────────────────────────────────────
function renderStreaks() {
  const el = document.getElementById("streaks-list");
  if (store.habits.length === 0) {
    el.innerHTML = '<div class="streaks-empty">Hoàn thành thói quen để xem streak</div>';
    return;
  }
  const sorted = store.habits
    .map((h) => ({ h, streak: calcStreak(h) }))
    .filter((x) => x.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  if (sorted.length === 0) {
    el.innerHTML = '<div class="streaks-empty">Hoàn thành thói quen để xem streak</div>';
    return;
  }

  el.innerHTML = sorted
    .map(
      ({ h, streak }) => `
    <div class="streak-row">
      <span class="streak-emoji">${h.emoji}</span>
      <div class="streak-info">
        <div class="streak-name">${escHtml(h.name)}</div>
        <div class="streak-days">${streak} ngày liên tiếp</div>
      </div>
      <span class="streak-badge">${streak >= 7 ? "🔥" : "⭐"} ${streak}</span>
    </div>
  `,
    )
    .join("");
}

// ─── Render: weekly grid ───────────────────────────────────────────────────
function renderWeekly() {
  const grid = document.getElementById("weekly-grid");
  const today = new Date();
  const todayDow = today.getDay();

  // Build last 7 days ending today
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: d, key: dateKey(d), dow: d.getDay(), isToday: i === 0 });
  }

  // labels row
  let html = `<div class="weekly-day-labels">${days.map((d) => `<div class="weekly-day-label${d.isToday ? " today" : ""}">${DAY_LABELS[d.dow]}</div>`).join("")}</div>`;

  if (store.habits.length === 0) {
    grid.innerHTML = html + '<div style="font-size:13px;color:var(--text-3);text-align:center;padding:8px 0">Chưa có thói quen nào</div>';
    return;
  }

  html += store.habits
    .map((h) => {
      const cells = days
        .map((d) => {
          const scheduled = h.days.includes(d.dow);
          if (!scheduled) return `<div class="weekly-cell skipped" title="${DAY_LABELS[d.dow]}"></div>`;
          const count = getCount(h.id, d.key);
          const done = count >= h.goal;
          return `<div class="weekly-cell${done ? " done" : ""}${d.isToday ? " today" : ""}"
        style="${done ? `--habit-color:${h.color}` : ""}"
        title="${DAY_LABELS[d.dow]}: ${done ? "✓" : "✗"} (${count}/${h.goal})"></div>`;
        })
        .join("");
      return `<div class="weekly-row">
      <div class="weekly-name" title="${escHtml(h.name)}">${h.emoji} ${escHtml(h.name)}</div>
      <div class="weekly-cells" style="--habit-color:${h.color}">${cells}</div>
    </div>`;
    })
    .join("");

  grid.innerHTML = html;
}

// ─── Render: manage list ──────────────────────────────────────────────────
function renderManage() {
  const el = document.getElementById("manage-list");
  document.getElementById("habit-total-count").textContent = store.habits.length;

  if (store.habits.length === 0) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text-3);text-align:center;padding:8px 0">Chưa có thói quen nào</div>';
    return;
  }

  el.innerHTML = store.habits
    .map(
      (h) => `
    <div class="manage-item">
      <span class="manage-emoji">${h.emoji}</span>
      <div class="manage-dot" style="background:${h.color}"></div>
      <span class="manage-name">${escHtml(h.name)}</span>
      <div class="manage-actions">
        <button class="icon-btn edit-btn" data-id="${h.id}" title="Chỉnh sửa">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M9.854.146a.5.5 0 0 0-.707 0l-1.5 1.5a.5.5 0 0 0 0 .707l3 3a.5.5 0 0 0 .707 0l1.5-1.5a.5.5 0 0 0 0-.707l-3-3zM8.5 3.207 10.793 5.5 4.5 11.793V11.5a.5.5 0 0 0-.5-.5H3.5a.5.5 0 0 0-.5.5v.5H2.5a.5.5 0 0 0-.5.5v.5h-.5a.5.5 0 0 0-.5.5V14h1.5a.5.5 0 0 0 .5-.5v-.5h.5a.5.5 0 0 0 .5-.5v-.5h.293L8.5 3.207z"/></svg>
        </button>
        <button class="icon-btn danger del-btn" data-id="${h.id}" title="Xóa">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  el.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.id));
  });

  el.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => openConfirm(btn.dataset.id));
  });
}

// ─── Nav date ──────────────────────────────────────────────────────────────
function renderNavDate() {
  const d = new Date();
  document.getElementById("nav-date").textContent = d.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── Render all ───────────────────────────────────────────────────────────
function renderAll() {
  renderToday();
  renderStreaks();
  renderWeekly();
  renderManage();
}

// ─── Modal: add / edit ────────────────────────────────────────────────────
function openModal(id = null) {
  editingId = id;
  const habit = id ? store.habits.find((h) => h.id === id) : null;

  document.getElementById("modal-title").textContent = id ? "Chỉnh sửa thói quen" : "Thêm thói quen";
  document.getElementById("habit-name").value = habit ? habit.name : "";
  document.getElementById("habit-desc").value = habit ? habit.desc : "";
  document.getElementById("habit-goal").value = habit ? habit.goal : 1;

  selEmoji = habit ? habit.emoji : EMOJIS[0];
  selColor = habit ? habit.color : COLORS[4];
  selectedDays = habit ? new Set(habit.days) : new Set([0, 1, 2, 3, 4, 5, 6]);

  renderEmojiPicker();
  renderColorPicker();
  renderDaysPicker();

  document.getElementById("modal-backdrop").classList.add("open");
  setTimeout(() => document.getElementById("habit-name").focus(), 50);
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
  editingId = null;
}

function saveHabit() {
  const name = document.getElementById("habit-name").value.trim();
  if (!name) {
    document.getElementById("habit-name").focus();
    return;
  }
  if (selectedDays.size === 0) {
    toast("Chọn ít nhất 1 ngày trong tuần");
    return;
  }

  const goal = Math.max(1, Math.min(99, +document.getElementById("habit-goal").value || 1));

  if (editingId) {
    const h = store.habits.find((x) => x.id === editingId);
    if (h) {
      h.name = name;
      h.desc = document.getElementById("habit-desc").value.trim();
      h.emoji = selEmoji;
      h.color = selColor;
      h.days = [...selectedDays].sort();
      h.goal = goal;
    }
    toast("Đã cập nhật thói quen ✓");
  } else {
    store.habits.push({
      id: uid(),
      name,
      desc: document.getElementById("habit-desc").value.trim(),
      emoji: selEmoji,
      color: selColor,
      days: [...selectedDays].sort(),
      goal,
      createdAt: Date.now(),
    });
    toast(`🌱 Thêm thói quen "${name}" thành công!`);
  }

  save();
  closeModal();
  renderAll();
}

// ─── Emoji picker ─────────────────────────────────────────────────────────
function renderEmojiPicker() {
  const el = document.getElementById("emoji-picker");
  el.innerHTML = EMOJIS.map((e) => `<button class="emoji-opt${e === selEmoji ? " selected" : ""}" data-e="${e}">${e}</button>`).join("");
  el.querySelectorAll(".emoji-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      selEmoji = btn.dataset.e;
      renderEmojiPicker();
    });
  });
}

// ─── Color picker ─────────────────────────────────────────────────────────
function renderColorPicker() {
  const el = document.getElementById("color-picker");
  el.innerHTML = COLORS.map((c) => `<button class="color-opt${c === selColor ? " selected" : ""}" style="background:${c};color:${c}" data-c="${c}" title="${c}"></button>`).join("");
  el.querySelectorAll(".color-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      selColor = btn.dataset.c;
      renderColorPicker();
    });
  });
}

// ─── Days picker ──────────────────────────────────────────────────────────
function renderDaysPicker() {
  document.querySelectorAll(".day-btn").forEach((btn) => {
    const d = +btn.dataset.day;
    btn.classList.toggle("active", selectedDays.has(d));
    btn.onclick = () => {
      selectedDays.has(d) ? selectedDays.delete(d) : selectedDays.add(d);
      renderDaysPicker();
    };
  });
}

// ─── Confirm delete ───────────────────────────────────────────────────────
function openConfirm(id) {
  deletingId = id;
  document.getElementById("confirm-backdrop").classList.add("open");
}

function closeConfirm() {
  document.getElementById("confirm-backdrop").classList.remove("open");
  deletingId = null;
}

function deleteHabit() {
  if (!deletingId) return;
  store.habits = store.habits.filter((h) => h.id !== deletingId);
  // clean up log entries
  Object.keys(store.log).forEach((k) => {
    delete store.log[k][deletingId];
  });
  save();
  closeConfirm();
  renderAll();
  toast("Đã xóa thói quen");
}

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Event wiring ─────────────────────────────────────────────────────────
document.getElementById("add-habit-btn").addEventListener("click", () => openModal());
document.getElementById("empty-add-btn").addEventListener("click", () => openModal());
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.getElementById("modal-save").addEventListener("click", saveHabit);

document.getElementById("modal-backdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-backdrop")) closeModal();
});

document.getElementById("confirm-cancel").addEventListener("click", closeConfirm);
document.getElementById("confirm-delete").addEventListener("click", deleteHabit);

document.getElementById("confirm-backdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("confirm-backdrop")) closeConfirm();
});

// Goal +/−
document.getElementById("goal-plus").addEventListener("click", () => {
  const el = document.getElementById("habit-goal");
  el.value = Math.min(99, +el.value + 1);
});

document.getElementById("goal-minus").addEventListener("click", () => {
  const el = document.getElementById("habit-goal");
  el.value = Math.max(1, +el.value - 1);
});

// Enter to save
document.getElementById("habit-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveHabit();
});

// Keyboard shortcut
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeConfirm();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openModal();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────
renderNavDate();
renderAll();

// refresh date every minute
setInterval(renderNavDate, 60000);
