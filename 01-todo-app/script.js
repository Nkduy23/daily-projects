const STORAGE_KEY = "taskly_v1";
let tasks = [];
let currentView = "today";
let currentFilter = "all";
let currentSort = "created";
let editingId = null;
let dragSrcId = null;
let currentPriority = "medium";

const prioMap = { low: { label: "Thấp", order: 1 }, medium: { label: "Trung bình", order: 2 }, high: { label: "Cao", order: 3 } };
const catLabels = { work: "Công việc", personal: "Cá nhân", study: "Học tập", other: "Khác" };

function load() {
  try {
    tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    tasks = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function isOverdue(task) {
  if (!task.due || task.done) return false;
  return task.due < todayStr();
}

function setView(v) {
  currentView = v;
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.view === v));
  const titles = {
    today: ["Công việc hôm nay", "Hãy bắt đầu ngày mới thật hiệu quả!"],
    all: ["Tất cả nhiệm vụ", "Danh sách đầy đủ của bạn"],
    upcoming: ["Sắp tới", "Những việc cần làm trong thời gian tới"],
    done: ["Đã hoàn thành", "Nhìn lại những gì bạn đã làm được"],
    "cat-work": ["Công việc", "Nhiệm vụ liên quan đến công việc"],
    "cat-personal": ["Cá nhân", "Việc cá nhân của bạn"],
    "cat-study": ["Học tập", "Nhiệm vụ học tập và phát triển"],
  };
  const [title, sub] = titles[v] || ["Tất cả", ""];
  document.getElementById("view-title").textContent = title;
  document.getElementById("view-subtitle").textContent = sub;
  render();
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll(".filter-tab").forEach((el) => el.classList.remove("active"));
  btn.classList.add("active");
  render();
}

function setSort(s) {
  currentSort = s;
  render();
}

function cyclePriority() {
  const order = ["low", "medium", "high"];
  currentPriority = order[(order.indexOf(currentPriority) + 1) % 3];
  const btn = document.getElementById("prio-btn");
  btn.dataset.prio = currentPriority;
  document.getElementById("prio-label").textContent = prioMap[currentPriority].label;
}

function addTask() {
  const input = document.getElementById("task-input");
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }
  const task = {
    id: uid(),
    text,
    done: false,
    priority: currentPriority,
    category: document.getElementById("cat-select").value,
    due: document.getElementById("due-input").value || "",
    note: "",
    created: Date.now(),
  };
  tasks.unshift(task);
  save();
  input.value = "";
  document.getElementById("due-input").value = "";
  updateCounts();
  render();
  toast("Đã thêm nhiệm vụ!");
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  updateCounts();
  render();
  if (t.done) toast("Hoàn thành! 🎉");
}

function deleteTask(id) {
  tasks = tasks.filter((x) => x.id !== id);
  save();
  updateCounts();
  render();
  toast("Đã xóa nhiệm vụ");
}

function openEdit(id) {
  editingId = id;
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  document.getElementById("edit-text").value = t.text;
  document.getElementById("edit-note").value = t.note || "";
  document.getElementById("edit-prio").value = t.priority;
  document.getElementById("edit-cat").value = t.category;
  document.getElementById("edit-due").value = t.due;
  document.getElementById("modal").classList.add("open");
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  editingId = null;
}

function saveEdit() {
  const t = tasks.find((x) => x.id === editingId);
  if (!t) return closeModal();
  t.text = document.getElementById("edit-text").value.trim() || t.text;
  t.note = document.getElementById("edit-note").value;
  t.priority = document.getElementById("edit-prio").value;
  t.category = document.getElementById("edit-cat").value;
  t.due = document.getElementById("edit-due").value;
  save();
  closeModal();
  updateCounts();
  render();
  toast("Đã lưu thay đổi");
}

function getViewTasks() {
  const today = todayStr();
  switch (currentView) {
    case "today":
      return tasks.filter((t) => !t.due || t.due === today || isOverdue(t));
    case "done":
      return tasks.filter((t) => t.done);
    case "upcoming":
      return tasks.filter((t) => t.due && t.due > today && !t.done);
    case "cat-work":
      return tasks.filter((t) => t.category === "work");
    case "cat-personal":
      return tasks.filter((t) => t.category === "personal");
    case "cat-study":
      return tasks.filter((t) => t.category === "study");
    default:
      return [...tasks];
  }
}

function getFiltered(list) {
  switch (currentFilter) {
    case "active":
      return list.filter((t) => !t.done);
    case "done":
      return list.filter((t) => t.done);
    case "high":
      return list.filter((t) => t.priority === "high");
    default:
      return list;
  }
}

function getSorted(list) {
  const s = [...list];
  switch (currentSort) {
    case "priority":
      return s.sort((a, b) => prioMap[b.priority].order - prioMap[a.priority].order);
    case "due":
      return s.sort((a, b) => ((a.due || "9999") < (b.due || "9999") ? -1 : 1));
    case "alpha":
      return s.sort((a, b) => a.text.localeCompare(b.text, "vi"));
    default:
      return s.sort((a, b) => b.created - a.created);
  }
}

function render() {
  const list = getSorted(getFiltered(getViewTasks()));
  const el = document.getElementById("task-list");

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor"><path d="M8 10a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10zm2 0v28h28V10H10zm5 7h18v2H15v-2zm0 6h18v2H15v-2zm0 6h12v2H15v-2z"/></svg>
        <p><strong>Không có nhiệm vụ nào</strong></p>
        <p>Thêm nhiệm vụ mới ở trên để bắt đầu!</p>
      </div>`;
    return;
  }

  el.innerHTML = list
    .map((t) => {
      const overdue = isOverdue(t);
      return `<div class="task-item${t.done ? " done" : ""}" draggable="true" data-id="${t.id}"
        ondragstart="dragStart(event,'${t.id}')" ondragover="dragOver(event)" ondrop="drop(event,'${t.id}')" ondragleave="dragLeave(event)" ondragend="dragEnd(event)">
        <div class="drag-handle" aria-hidden="true">
          <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor"><circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/><circle cx="4" cy="9" r="1.5"/><circle cx="8" cy="9" r="1.5"/><circle cx="4" cy="15" r="1.5"/><circle cx="8" cy="15" r="1.5"/></svg>
        </div>
        <div class="checkbox${t.done ? " checked" : ""}" onclick="toggleTask('${t.id}')" role="checkbox" aria-checked="${t.done}" tabindex="0" onkeydown="if(event.key===' ')toggleTask('${t.id}')">
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,4.5 4,7.5 10,1"/></svg>
        </div>
        <div class="task-body">
          <div class="task-text">${escHtml(t.text)}</div>
          <div class="task-tags">
            <span class="tag tag-prio-${t.priority}">${prioMap[t.priority].label}</span>
            <span class="tag tag-category">${catLabels[t.category] || t.category}</span>
            ${t.due ? `<span class="tag ${overdue ? "tag-overdue" : "tag-due"}">${overdue ? "Quá hạn · " : ""}${formatDate(t.due)}</span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn" onclick="openEdit('${t.id}')" title="Chỉnh sửa">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M9.854.146a.5.5 0 0 0-.707 0l-1.5 1.5a.5.5 0 0 0 0 .707l3 3a.5.5 0 0 0 .707 0l1.5-1.5a.5.5 0 0 0 0-.707l-3-3zM8.5 3.207 10.793 5.5 4.5 11.793V11.5a.5.5 0 0 0-.5-.5H3.5a.5.5 0 0 0-.5.5v.5H2.5a.5.5 0 0 0-.5.5v.5h-.5a.5.5 0 0 0-.5.5V14h1.5a.5.5 0 0 0 .5-.5v-.5h.5a.5.5 0 0 0 .5-.5v-.5h.293L8.5 3.207z"/></svg>
          </button>
          <button class="action-btn del" onclick="deleteTask('${t.id}')" title="Xóa">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>`;
    })
    .join("");
}

function updateCounts() {
  const today = todayStr();
  const all = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pending = all - done;
  const overdue = tasks.filter((t) => isOverdue(t)).length;
  const todayTasks = tasks.filter((t) => !t.due || t.due === today || isOverdue(t));
  const upcomingTasks = tasks.filter((t) => t.due && t.due > today && !t.done);

  document.getElementById("s-total").textContent = all;
  document.getElementById("s-done").textContent = done;
  document.getElementById("s-pending").textContent = pending;
  document.getElementById("s-overdue").textContent = overdue;
  document.getElementById("count-today").textContent = todayTasks.filter((t) => !t.done).length;
  document.getElementById("count-all").textContent = all;
  document.getElementById("count-upcoming").textContent = upcomingTasks.length;
  document.getElementById("count-done").textContent = done;
  document.getElementById("count-work").textContent = tasks.filter((t) => t.category === "work").length;
  document.getElementById("count-personal").textContent = tasks.filter((t) => t.category === "personal").length;
  document.getElementById("count-study").textContent = tasks.filter((t) => t.category === "study").length;

  const todayDone = todayTasks.filter((t) => t.done).length;
  const todayTotal = todayTasks.length;
  const pct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0;
  document.getElementById("progress-pct").textContent = pct + "%";
  document.getElementById("progress-fill").style.width = pct + "%";
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="white"><path fill-rule="evenodd" d="M13.293 3.293a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L5.5 9.586l6.293-6.293a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg> ${msg}`;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// Drag & drop
function dragStart(e, id) {
  dragSrcId = id;
  e.currentTarget.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function dragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
  e.dataTransfer.dropEffect = "move";
}

function dragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function dragEnd(e) {
  e.currentTarget.classList.remove("dragging");
}

function drop(e, targetId) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  if (dragSrcId === targetId) return;
  const srcIdx = tasks.findIndex((t) => t.id === dragSrcId);
  const tgtIdx = tasks.findIndex((t) => t.id === targetId);
  if (srcIdx < 0 || tgtIdx < 0) return;
  const [moved] = tasks.splice(srcIdx, 1);
  tasks.splice(tgtIdx, 0, moved);
  save();
  render();
}

// Close modal on backdrop click
document.getElementById("modal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});

// Set today date label
const dateOpts = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
document.getElementById("today-label").textContent = new Date().toLocaleDateString("vi-VN", dateOpts);

// Init
load();
updateCounts();
render();
