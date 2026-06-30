"use strict";

// ─── Storage ──────────────────────────────────────────────────────────────
const DOCS_KEY = "markly_docs_v1";
const ACTIVE_KEY = "markly_active_v1";

// ─── State ────────────────────────────────────────────────────────────────
let docs = loadDocs();
let activeId = localStorage.getItem(ACTIVE_KEY) || null;
let viewMode = "split";
let tocOpen = false;
let saveTimer = null;

// ─── Default content ──────────────────────────────────────────────────────
const DEFAULT_MD = `# Chào mừng đến với Markly! 👋

Markly là trình soạn thảo Markdown với **live preview** tích hợp sẵn.

## Tính năng chính

- ✅ **Live preview** — xem kết quả ngay khi gõ
- ✅ **Split / Editor / Preview** — 3 chế độ xem
- ✅ **Toolbar** — chèn định dạng nhanh
- ✅ **Nhiều tài liệu** — quản lý nhiều file cùng lúc
- ✅ **TOC** — mục lục tự động
- ✅ **Dark mode** — theo hệ thống

---

## Hướng dẫn nhanh

### Định dạng văn bản

| Cú pháp | Kết quả |
|---------|---------|
| \`**in đậm**\` | **in đậm** |
| \`*in nghiêng*\` | *in nghiêng* |
| \`~~gạch ngang~~\` | ~~gạch ngang~~ |
| \`\`code\`\` | \`code\` |

### Code block

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}

greet('Markly');
\`\`\`

### Trích dẫn

> "The only way to do great work is to love what you do."
> — Steve Jobs

---

## Phím tắt

| Phím | Chức năng |
|------|-----------|
| \`Ctrl+S\` | Lưu tài liệu |
| \`Ctrl+B\` | In đậm |
| \`Ctrl+I\` | In nghiêng |
| \`Ctrl+P\` | Mở tài liệu |
| \`Ctrl+D\` | Tải xuống .md |

---

Hãy bắt đầu viết ngay! 🚀
`;

// ─── Docs ──────────────────────────────────────────────────────────────────
function loadDocs() {
  try {
    return JSON.parse(localStorage.getItem(DOCS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDocs() {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

function newDoc() {
  const doc = { id: uid(), name: "Tài liệu mới", content: "", updatedAt: Date.now() };
  docs.unshift(doc);
  saveDocs();
  setActive(doc.id);
  renderDocsSidebar();
  setTimeout(() => editor.focus(), 50);
}

function setActive(id) {
  activeId = id;
  localStorage.setItem(ACTIVE_KEY, id);
  const doc = docs.find((d) => d.id === id);
  if (doc) editor.value = doc.content;
  renderPreview();
  updateStats();
  renderDocsSidebar();
}

function deleteDoc(id) {
  docs = docs.filter((d) => d.id !== id);
  saveDocs();
  if (activeId === id) {
    activeId = docs[0]?.id || null;
    if (activeId) setActive(activeId);
    else {
      editor.value = "";
      renderPreview();
    }
  }
  renderDocsSidebar();
}

function saveCurrentDoc() {
  const doc = docs.find((d) => d.id === activeId);
  if (!doc) return;
  doc.content = editor.value;
  doc.updatedAt = Date.now();
  // auto-name from first heading
  const match = doc.content.match(/^#+\s+(.+)/m);
  if (match) doc.name = match[1].replace(/[*_`]/g, "").trim().slice(0, 40);
  saveDocs();
  renderDocsSidebar();
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function relTime(ts) {
  const d = Math.floor((Date.now() - ts) / 60000);
  if (d < 1) return "vừa xong";
  if (d < 60) return `${d}p trước`;
  if (d < 1440) return `${Math.floor(d / 60)}h trước`;
  return `${Math.floor(d / 1440)}d trước`;
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Markdown parser ──────────────────────────────────────────────────────
// Lightweight custom parser — no dependencies
function parseMarkdown(md) {
  let html = md;

  // Escape HTML in non-code contexts later — first extract code blocks
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang, code: code.trimEnd() });
    return `%%CODEBLOCK${idx}%%`;
  });

  const inlineCodes = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(escHtml(code));
    return `%%INLINECODE${idx}%%`;
  });

  // Escape remaining HTML
  html = html
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, "&amp;")
    .replace(/(?<!%%\w+\d+%%)<(?!%%)/g, "&lt;")
    .replace(/(?<!%%\w+\d+%%)>(?!%%)/g, "&gt;");

  // Headings
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
    const level = hashes.length;
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\u00C0-\u024F\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  // Horizontal rule
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "<hr/>");

  // Blockquote
  html = html.replace(/^(>[ ]?.*)(\n>[ ]?.*)*/gm, (block) => {
    const content = block.replace(/^>[ ]?/gm, "");
    return `<blockquote>${content}</blockquote>`;
  });

  // Tables
  html = html.replace(/^\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/gm, (_, header, body) => {
    const ths = header
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => `<th>${c}</th>`)
      .join("");
    const trs = body
      .trim()
      .split("\n")
      .map((row) => {
        const tds = row
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => `<td>${c}</td>`)
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });

  // Task lists (before ul)
  html = html.replace(/^- \[x\] (.+)$/gim, '<li><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gim, '<li><input type="checkbox" disabled> $1</li>');

  // Unordered list
  html = html.replace(/((?:^[-*+] .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => `<li>${l.replace(/^[-*+] /, "")}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Ordered list
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  // Bold, italic, strikethrough
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Links and images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1"/>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Restore code blocks with copy button
  codeBlocks.forEach(({ lang, code }, i) => {
    const escaped = escHtml(code);
    html = html.replace(`%%CODEBLOCK${i}%%`, `<pre><button class="code-copy-btn" onclick="copyCode(this)">Sao chép</button><code class="lang-${lang}">${escaped}</code></pre>`);
  });

  // Restore inline codes
  inlineCodes.forEach((code, i) => {
    html = html.replace(`%%INLINECODE${i}%%`, `<code>${code}</code>`);
  });

  // Paragraphs — wrap lines not already wrapped
  html = html.replace(/^(?!<[a-z%]|%%|$)(.+)$/gm, "<p>$1</p>");

  // Clean up extra blank lines
  html = html.replace(/\n{3,}/g, "\n\n");

  return html;
}

window.copyCode = function (btn) {
  const code = btn.nextElementSibling.textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = "✓ Đã copy";
    setTimeout(() => {
      btn.textContent = "Sao chép";
    }, 1500);
  });
};

// ─── Render preview ───────────────────────────────────────────────────────
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");

function renderPreview() {
  const md = editor.value;
  preview.innerHTML = parseMarkdown(md);
  renderTOC();
}

// ─── TOC ──────────────────────────────────────────────────────────────────
function renderTOC() {
  const headings = preview.querySelectorAll("h1,h2,h3");
  const tocList = document.getElementById("toc-list");
  if (headings.length === 0) {
    tocList.innerHTML = '<div style="font-size:12px;color:var(--text-3)">Không có tiêu đề</div>';
    return;
  }
  tocList.innerHTML = Array.from(headings)
    .map((h) => {
      const level = h.tagName.toLowerCase();
      return `<a class="toc-item ${level}" href="#${h.id}">${h.textContent}</a>`;
    })
    .join("");
  tocList.querySelectorAll(".toc-item").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = preview.querySelector(a.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────
function updateStats() {
  const txt = editor.value;
  const words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
  const lines = txt.split("\n").length;
  document.getElementById("editor-stats").textContent = `${words} từ · ${lines} dòng`;
}

// ─── Docs sidebar ─────────────────────────────────────────────────────────
function renderDocsSidebar() {
  const list = document.getElementById("docs-list");
  if (docs.length === 0) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text-3);padding:12px">Chưa có tài liệu nào</div>';
    return;
  }
  list.innerHTML = docs
    .map(
      (d) => `
    <div class="doc-item${d.id === activeId ? " active" : ""}" data-id="${d.id}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="doc-name">${escHtml(d.name)}</div>
        <button class="doc-del-btn" data-id="${d.id}" title="Xóa">✕</button>
      </div>
      <div class="doc-meta">
        <span>${d.content.split(/\s+/).filter(Boolean).length} từ</span>
        <span>${relTime(d.updatedAt)}</span>
      </div>
    </div>
  `,
    )
    .join("");

  list.querySelectorAll(".doc-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("doc-del-btn")) return;
      setActive(el.dataset.id);
      closeSidebar();
    });
  });

  list.querySelectorAll(".doc-del-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (docs.length === 1) {
        toast("Không thể xóa tài liệu duy nhất");
        return;
      }
      deleteDoc(btn.dataset.id);
    });
  });
}

function openSidebar() {
  document.getElementById("docs-sidebar").classList.remove("hidden");
  document.getElementById("docs-backdrop").classList.remove("hidden");
  setTimeout(() => document.getElementById("docs-sidebar").classList.add("open"), 10);
}

function closeSidebar() {
  document.getElementById("docs-sidebar").classList.remove("open");
  setTimeout(() => {
    document.getElementById("docs-sidebar").classList.add("hidden");
    document.getElementById("docs-backdrop").classList.add("hidden");
  }, 250);
}

// ─── Toolbar actions ──────────────────────────────────────────────────────
const SNIPPETS = {
  bold: { wrap: ["**", "**"], placeholder: "in đậm" },
  italic: { wrap: ["*", "*"], placeholder: "in nghiêng" },
  strikethrough: { wrap: ["~~", "~~"], placeholder: "gạch ngang" },
  h1: { prefix: "# " },
  h2: { prefix: "## " },
  h3: { prefix: "### " },
  ul: { prefix: "- " },
  ol: { prefix: "1. " },
  blockquote: { prefix: "> " },
  code: { wrap: ["`", "`"], placeholder: "code" },
  hr: { insert: "\n---\n" },
  link: { wrap: ["[", "](url)"], placeholder: "link text" },
};

const CODEBLOCK_SNIPPET = "```javascript\n// code here\n```";
const TABLE_SNIPPET = "| Cột 1 | Cột 2 | Cột 3 |\n|-------|-------|-------|\n| A     | B     | C     |\n| D     | E     | F     |";

function insertSnippet(action) {
  const ta = editor;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const sel = ta.value.slice(start, end);
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);

  let newVal, cursorStart, cursorEnd;

  if (action === "codeblock") {
    newVal = before + CODEBLOCK_SNIPPET + after;
    cursorStart = cursorEnd = start + CODEBLOCK_SNIPPET.length;
  } else if (action === "table") {
    newVal = before + "\n" + TABLE_SNIPPET + "\n" + after;
    cursorStart = cursorEnd = start + TABLE_SNIPPET.length + 2;
  } else {
    const s = SNIPPETS[action];
    if (!s) return;

    if (s.insert) {
      newVal = before + s.insert + after;
      cursorStart = cursorEnd = start + s.insert.length;
    } else if (s.prefix) {
      const lineStart = before.lastIndexOf("\n") + 1;
      const linePrefix = ta.value.slice(lineStart, start);
      if (linePrefix.startsWith(s.prefix)) {
        // toggle off
        newVal = ta.value.slice(0, lineStart) + linePrefix.slice(s.prefix.length) + ta.value.slice(lineStart + linePrefix.length);
        cursorStart = cursorEnd = start - s.prefix.length;
      } else {
        newVal = ta.value.slice(0, lineStart) + s.prefix + ta.value.slice(lineStart);
        cursorStart = cursorEnd = start + s.prefix.length;
      }
    } else if (s.wrap) {
      const [open, close] = s.wrap;
      const text = sel || s.placeholder;
      newVal = before + open + text + close + after;
      if (sel) {
        cursorStart = start + open.length;
        cursorEnd = start + open.length + text.length;
      } else {
        cursorStart = start + open.length;
        cursorEnd = start + open.length + text.length;
      }
    }
  }

  ta.value = newVal;
  ta.setSelectionRange(cursorStart, cursorEnd);
  ta.focus();
  onEditorInput();
}

// ─── View mode ────────────────────────────────────────────────────────────
function setViewMode(mode) {
  viewMode = mode;
  const ws = document.getElementById("workspace");
  ws.className = "workspace " + (mode === "editor" ? "editor-only" : mode === "preview" ? "preview-only" : "");
  document.querySelectorAll(".view-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === mode));
}

// ─── Drag to resize ───────────────────────────────────────────────────────
let dragging = false;
let dragStartX = 0;
let editorStartW = 0;

document.getElementById("divider-bar").addEventListener("mousedown", (e) => {
  dragging = true;
  dragStartX = e.clientX;
  editorStartW = document.getElementById("editor-pane").offsetWidth;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const delta = e.clientX - dragStartX;
  const ws = document.getElementById("workspace");
  const total = ws.offsetWidth;
  const newW = Math.max(200, Math.min(total - 200, editorStartW + delta));
  document.getElementById("editor-pane").style.flex = "none";
  document.getElementById("editor-pane").style.width = newW + "px";
});

document.addEventListener("mouseup", () => {
  dragging = false;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});

// ─── Download ─────────────────────────────────────────────────────────────
function downloadMd() {
  const doc = docs.find((d) => d.id === activeId);
  const name = (doc?.name || "document").replace(/[^a-z0-9-]/gi, "_") + ".md";
  const blob = new Blob([editor.value], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
  toast("📥 Đã tải xuống " + name);
}

// ─── Events ───────────────────────────────────────────────────────────────
function onEditorInput() {
  renderPreview();
  updateStats();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentDoc, 800);
}

editor.addEventListener("input", onEditorInput);

// Tab key → indent
editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart;
    editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(editor.selectionEnd);
    editor.setSelectionRange(start + 2, start + 2);
    onEditorInput();
  }
});

// Toolbar
document.querySelectorAll(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => insertSnippet(btn.dataset.action));
});

// View toggle
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => setViewMode(btn.dataset.view));
});

// TOC
document.getElementById("toc-btn").addEventListener("click", () => {
  tocOpen = !tocOpen;
  document.getElementById("toc-panel").classList.toggle("hidden", !tocOpen);
  document.getElementById("toc-btn").classList.toggle("active", tocOpen);
});

// Nav actions
document.getElementById("save-btn").addEventListener("click", () => {
  saveCurrentDoc();
  toast("💾 Đã lưu!");
});

document.getElementById("copy-md-btn").addEventListener("click", () => {
  navigator.clipboard.writeText(editor.value).then(() => toast("✓ Đã sao chép Markdown"));
});

document.getElementById("download-btn").addEventListener("click", downloadMd);

// Docs sidebar
document.getElementById("save-btn").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  openSidebar();
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "s") {
    e.preventDefault();
    saveCurrentDoc();
    toast("💾 Đã lưu!");
  }
  if (ctrl && e.key === "b") {
    e.preventDefault();
    insertSnippet("bold");
  }
  if (ctrl && e.key === "i") {
    e.preventDefault();
    insertSnippet("italic");
  }
  if (ctrl && e.key === "d") {
    e.preventDefault();
    downloadMd();
  }
  if (ctrl && e.key === "p") {
    e.preventDefault();
    openSidebar();
  }
  if (ctrl && e.key === "n") {
    e.preventDefault();
    newDoc();
  }
  if (e.key === "Escape") closeSidebar();
});

// Docs sidebar close
document.getElementById("docs-close").addEventListener("click", closeSidebar);
document.getElementById("docs-backdrop").addEventListener("click", closeSidebar);
document.getElementById("docs-new-btn").addEventListener("click", () => {
  newDoc();
  closeSidebar();
});

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ─── Init ─────────────────────────────────────────────────────────────────
if (docs.length === 0) {
  const doc = { id: uid(), name: "Bắt đầu", content: DEFAULT_MD, updatedAt: Date.now() };
  docs.push(doc);
  saveDocs();
  activeId = doc.id;
}

if (!activeId || !docs.find((d) => d.id === activeId)) {
  activeId = docs[0].id;
}

setActive(activeId);
setViewMode("split");
renderDocsSidebar();
updateStats();
