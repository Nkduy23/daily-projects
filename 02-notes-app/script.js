"use strict";

// ─── Storage ───────────────────────────────────────────────────────────────
const KEY = "noted_v1";

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

// ─── State ────────────────────────────────────────────────────────────────
let notes = loadNotes();
let activeId = null;
let searchQuery = "";
let activeTag = "all";
let saveTimer = null;
let ctxTargetId = null;

// ─── Helpers ──────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function now() {
  return Date.now();
}

function relativeTime(ts) {
  const diff = now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d < 7) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
}

function plainText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || "";
}

function wordCount(html) {
  const txt = plainText(html).trim();
  if (!txt) return 0;
  return txt.split(/\s+/).filter(Boolean).length;
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(text, q) {
  if (!q) return escHtml(text);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escHtml(text).replace(re, "<mark>$1</mark>");
}

// ─── Filtering / sorting ───────────────────────────────────────────────────
function getVisible() {
  let list = [...notes];

  // Tag filter
  if (activeTag !== "all") {
    list = list.filter((n) => n.tags && n.tags.includes(activeTag));
  }

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((n) => n.title.toLowerCase().includes(q) || plainText(n.body).toLowerCase().includes(q) || (n.tags || []).some((t) => t.toLowerCase().includes(q)));
  }

  // Pinned first, then by updatedAt
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  return list;
}

// ─── All tags across all notes ─────────────────────────────────────────────
function allTags() {
  const set = new Set();
  notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}

// ─── Render list ───────────────────────────────────────────────────────────
function renderList() {
  const list = getVisible();
  const listEl = document.getElementById("note-list");
  const countEl = document.getElementById("note-count");

  countEl.textContent = `${notes.length} ghi chú`;

  if (list.length === 0) {
    listEl.innerHTML = `<div style="padding:24px 14px;text-align:center;color:var(--text-3);font-size:13px;">
      ${searchQuery ? "Không tìm thấy kết quả" : "Chưa có ghi chú nào"}
    </div>`;
    return;
  }

  const q = searchQuery;
  listEl.innerHTML = list
    .map((n) => {
      const preview = plainText(n.body).slice(0, 80);
      const tagHtml = (n.tags || []).map((t) => `<span class="note-tag">${escHtml(t)}</span>`).join("");
      return `<div class="note-item${n.id === activeId ? " active" : ""}"
      data-id="${n.id}"
      oncontextmenu="openCtxMenu(event,'${n.id}')">
      <div class="note-item-header">
        <span class="note-item-title">${highlight(n.title || "Không có tiêu đề", q)}</span>
        ${n.pinned ? `<span class="note-pin-icon" title="Đã ghim">📌</span>` : ""}
      </div>
      <div class="note-item-meta">${relativeTime(n.updatedAt)}</div>
      <div class="note-item-preview">${highlight(preview || "...", q)}</div>
      ${tagHtml ? `<div class="note-item-tags">${tagHtml}</div>` : ""}
    </div>`;
    })
    .join("");

  // Click handlers
  listEl.querySelectorAll(".note-item").forEach((el) => {
    el.addEventListener("click", () => openNote(el.dataset.id));
  });
}

// ─── Render tags filter ────────────────────────────────────────────────────
function renderTagsFilter() {
  const tags = allTags();
  const tagsEl = document.getElementById("tags-list");
  tagsEl.innerHTML = `<button class="tag-filter${activeTag === "all" ? " active" : ""}" data-tag="all" onclick="setTag('all',this)">Tất cả</button>`;
  tags.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = `tag-filter${activeTag === t ? " active" : ""}`;
    btn.dataset.tag = t;
    btn.textContent = t;
    btn.onclick = () => setTag(t, btn);
    tagsEl.appendChild(btn);
  });
}

function setTag(t, btn) {
  activeTag = t;
  document.querySelectorAll(".tag-filter").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderList();
}

// ─── Open note ─────────────────────────────────────────────────────────────
function openNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  activeId = id;

  // Show editor, hide empty state
  document.getElementById("empty-state").classList.add("hidden");
  document.getElementById("toolbar").style.display = "";
  document.getElementById("title-wrap").style.display = "";

  // Populate
  document.getElementById("note-title").value = note.title;
  document.getElementById("editor").innerHTML = note.body;

  // Tags inline
  renderInlineTags(note.tags || []);

  // Pin btn
  document.getElementById("pin-btn").classList.toggle("active", !!note.pinned);

  // Word count
  updateWordCount();

  // Delete btn in sidebar footer
  const delBtn = document.getElementById("delete-btn");
  delBtn.style.display = "";
  delBtn.onclick = () => deleteNote(id);

  renderList();
}

// ─── Create note ───────────────────────────────────────────────────────────
function createNote() {
  const note = {
    id: uid(),
    title: "",
    body: "",
    tags: [],
    pinned: false,
    createdAt: now(),
    updatedAt: now(),
  };
  notes.unshift(note);
  saveNotes();
  renderTagsFilter();
  openNote(note.id);
  // Focus title
  setTimeout(() => document.getElementById("note-title").focus(), 50);
  toast("Tạo ghi chú mới");
}

// ─── Save (debounced) ──────────────────────────────────────────────────────
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 600);
}

function doSave() {
  const note = notes.find((n) => n.id === activeId);
  if (!note) return;
  note.title = document.getElementById("note-title").value;
  note.body = document.getElementById("editor").innerHTML;
  note.updatedAt = now();
  saveNotes();
  renderList();
  updateWordCount();
}

// ─── Delete note ───────────────────────────────────────────────────────────
function deleteNote(id) {
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return;
  notes.splice(idx, 1);
  saveNotes();

  if (activeId === id) {
    activeId = null;
    document.getElementById("empty-state").classList.remove("hidden");
    document.getElementById("delete-btn").style.display = "none";
  }

  renderTagsFilter();
  renderList();
  toast("Đã xóa ghi chú");
}

// ─── Pin ───────────────────────────────────────────────────────────────────
function togglePin(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  note.updatedAt = now();
  saveNotes();
  document.getElementById("pin-btn").classList.toggle("active", note.pinned);
  renderList();
  toast(note.pinned ? "Đã ghim 📌" : "Bỏ ghim");
}

// ─── Tags (inline editor) ─────────────────────────────────────────────────
function renderInlineTags(tags) {
  const el = document.getElementById("tags-inline");
  el.innerHTML = tags
    .map(
      (t, i) =>
        `<span class="tag-inline">${escHtml(t)}
      <button class="tag-inline-remove" data-idx="${i}" title="Xóa tag">×</button>
    </span>`,
    )
    .join("");
  el.querySelectorAll(".tag-inline-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = notes.find((n) => n.id === activeId);
      if (!note) return;
      note.tags.splice(+btn.dataset.idx, 1);
      note.updatedAt = now();
      saveNotes();
      renderInlineTags(note.tags);
      renderTagsFilter();
      renderList();
    });
  });
}

function addTag(raw) {
  const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (!tag) return;
  const note = notes.find((n) => n.id === activeId);
  if (!note) return;
  if (!note.tags) note.tags = [];
  if (note.tags.includes(tag)) return;
  note.tags.push(tag);
  note.updatedAt = now();
  saveNotes();
  renderInlineTags(note.tags);
  renderTagsFilter();
  renderList();
}

// ─── Word count ────────────────────────────────────────────────────────────
function updateWordCount() {
  const body = document.getElementById("editor").innerHTML;
  const wc = wordCount(body);
  document.getElementById("word-count").textContent = `${wc} từ`;
}

// ─── Rich text toolbar ─────────────────────────────────────────────────────
function execFmt(cmd) {
  document.execCommand(cmd, false, null);
  document.getElementById("editor").focus();
  scheduleSave();
}

function execAction(action) {
  const ed = document.getElementById("editor");
  ed.focus();
  switch (action) {
    case "h1":
      document.execCommand("formatBlock", false, "<h1>");
      break;
    case "h2":
      document.execCommand("formatBlock", false, "<h2>");
      break;
    case "code": {
      const sel = window.getSelection();
      if (sel && sel.toString()) {
        document.execCommand("insertHTML", false, `<code>${escHtml(sel.toString())}</code>`);
      } else {
        document.execCommand("insertHTML", false, `<pre><code>// code here</code></pre>`);
      }
      break;
    }
    case "quote":
      document.execCommand("formatBlock", false, "<blockquote>");
      break;
  }
  scheduleSave();
}

// ─── Context menu ──────────────────────────────────────────────────────────
function openCtxMenu(e, id) {
  e.preventDefault();
  ctxTargetId = id;
  const note = notes.find((n) => n.id === id);
  const menu = document.getElementById("ctx-menu");
  document.getElementById("ctx-pin-label").textContent = note && note.pinned ? "Bỏ ghim" : "Ghim";
  menu.style.left = Math.min(e.clientX, window.innerWidth - 160) + "px";
  menu.style.top = Math.min(e.clientY, window.innerHeight - 80) + "px";
  menu.classList.add("open");
}

function closeCtxMenu() {
  document.getElementById("ctx-menu").classList.remove("open");
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path fill-rule="evenodd" d="M13.293 3.293a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L5.5 9.586l6.293-6.293a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg> ${msg}`;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ─── Sidebar toggle ────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

// ─── Event wiring ──────────────────────────────────────────────────────────
document.getElementById("new-btn").addEventListener("click", createNote);
document.getElementById("create-from-empty").addEventListener("click", createNote);
document.getElementById("sidebar-toggle").addEventListener("click", toggleSidebar);

// Toolbar format buttons
document.querySelectorAll(".fmt-btn[data-cmd]").forEach((btn) => {
  btn.addEventListener("click", () => execFmt(btn.dataset.cmd));
});
document.querySelectorAll(".fmt-btn[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => execAction(btn.dataset.action));
});

// Pin button
document.getElementById("pin-btn").addEventListener("click", () => {
  if (activeId) togglePin(activeId);
});

// Title input
document.getElementById("note-title").addEventListener("input", scheduleSave);

// Editor input
document.getElementById("editor").addEventListener("input", () => {
  updateWordCount();
  scheduleSave();
});

// Editor paste — strip styling
document.getElementById("editor").addEventListener("paste", (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
});

// Search
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  searchClear.classList.toggle("visible", !!searchQuery);
  renderList();
});

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  searchClear.classList.remove("visible");
  renderList();
  searchInput.focus();
});

// Tag input
const tagInput = document.getElementById("tag-input");
tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTag(tagInput.value);
    tagInput.value = "";
  }
});

// Context menu actions
document.getElementById("ctx-pin").addEventListener("click", () => {
  if (ctxTargetId) togglePin(ctxTargetId);
  closeCtxMenu();
});

document.getElementById("ctx-delete").addEventListener("click", () => {
  if (ctxTargetId) deleteNote(ctxTargetId);
  closeCtxMenu();
});

// Close context menu on outside click
document.addEventListener("click", (e) => {
  if (!document.getElementById("ctx-menu").contains(e.target)) closeCtxMenu();
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "n") {
    e.preventDefault();
    createNote();
  }
  if (ctrl && e.key === "f") {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === "Escape") {
    closeCtxMenu();
    if (document.activeElement === searchInput) searchInput.blur();
  }
});

// selectionchange → highlight active format buttons
document.addEventListener("selectionchange", () => {
  ["bold", "italic", "strikethrough", "insertUnorderedList", "insertOrderedList"].forEach((cmd) => {
    const btn = document.querySelector(`.fmt-btn[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle("active", document.queryCommandState(cmd));
  });
});

// ─── Init ──────────────────────────────────────────────────────────────────
renderTagsFilter();
renderList();

// Open the most recent note automatically
if (notes.length > 0) {
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  openNote(sorted[0].id);
} else {
  // Show empty state
  document.getElementById("toolbar").style.display = "none";
  document.getElementById("title-wrap").style.display = "none";
}
