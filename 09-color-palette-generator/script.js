"use strict";

// ─── State ────────────────────────────────────────────────────────────────
const SAVE_KEY = "paletto_saved_v1";

let baseHex = "#3B82F6";
let harmony = "analogous";
let count = 5;
let viewMode = "swatches";
let palette = [];
let saved = loadSaved();
let exportFmt = "hex";

// ─── Colour math ──────────────────────────────────────────────────────────
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  const s1 = s / 100,
    l1 = l / 100;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l1 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hslToRgb(h, s, l) {
  const hex = hslToHex(h, s, l);
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(hex) {
  const L = luminance(hex);
  return L > 0.179 ? "#1A1916" : "#FFFFFF";
}

function colorName(hex) {
  const { h, s, l } = hexToHsl(hex);
  if (l < 10) return "Đen";
  if (l > 92) return "Trắng";
  if (s < 8) return l < 40 ? "Xám tối" : l < 70 ? "Xám" : "Xám sáng";
  const hue = Math.round(h);
  if (hue < 15 || hue >= 345) return s > 60 ? "Đỏ tươi" : "Đỏ";
  if (hue < 35) return s > 70 ? "Cam tươi" : "Cam";
  if (hue < 65) return s > 70 ? "Vàng tươi" : "Vàng";
  if (hue < 150) return s > 60 ? "Xanh lá tươi" : "Xanh lá";
  if (hue < 185) return "Ngọc lam";
  if (hue < 255) return s > 60 ? "Xanh dương tươi" : "Xanh dương";
  if (hue < 285) return "Tím";
  if (hue < 320) return "Hồng tím";
  return "Hồng";
}

// ─── Harmony generators ───────────────────────────────────────────────────
function generatePalette(hex, mode, n) {
  const { h, s, l } = hexToHsl(hex);

  switch (mode) {
    case "analogous": {
      const step = 30 / (n - 1 || 1);
      return Array.from({ length: n }, (_, i) => hslToHex(h - 15 + step * i, s, l));
    }
    case "complementary": {
      const colors = [hex, hslToHex(h + 180, s, l)];
      // fill with tints of each
      const all = [];
      for (let i = 0; i < n; i++) {
        const base = colors[i % 2];
        const { h: bh, s: bs, l: bl } = hexToHsl(base);
        const offset = Math.floor(i / 2);
        all.push(hslToHex(bh, bs, Math.max(20, Math.min(85, bl + offset * 8 - (Math.floor(n / 2) - 1) * 4))));
      }
      return all;
    }
    case "triadic": {
      const bases = [h, h + 120, h + 240];
      return Array.from({ length: n }, (_, i) => {
        const bh = bases[i % 3];
        const off = Math.floor(i / 3);
        return hslToHex(bh, s, Math.max(20, Math.min(85, l + off * 12 - 6)));
      });
    }
    case "split": {
      const bases = [h, h + 150, h + 210];
      return Array.from({ length: n }, (_, i) => {
        const bh = bases[i % 3];
        const off = Math.floor(i / 3);
        return hslToHex(bh, s, Math.max(20, Math.min(85, l + off * 12 - 6)));
      });
    }
    case "tetradic": {
      const bases = [h, h + 90, h + 180, h + 270];
      return Array.from({ length: n }, (_, i) => hslToHex(bases[i % 4], s, Math.max(25, Math.min(80, l + Math.floor(i / 4) * 10 - 5))));
    }
    case "monochromatic": {
      const step = 60 / (n - 1 || 1);
      return Array.from({ length: n }, (_, i) => hslToHex(h, Math.max(15, s - 10 + i * 3), Math.max(15, Math.min(88, l - 30 + step * i))));
    }
    case "shades": {
      const step = 75 / (n - 1 || 1);
      return Array.from({ length: n }, (_, i) => hslToHex(h, s, Math.max(10, Math.min(92, 10 + step * i))));
    }
    default:
      return [hex];
  }
}

// ─── Render helpers ───────────────────────────────────────────────────────
function renderSwatches(colors) {
  return `<div class="palette-swatches">${colors
    .map(
      (c) => `
    <div class="swatch" style="background:${c}" data-hex="${c}" title="${c}">
      <span class="swatch-label" style="color:${contrast(c)}">${c}</span>
    </div>
  `,
    )
    .join("")}</div>`;
}

function renderStrips(colors) {
  return `<div class="palette-strips">${colors
    .map(
      (c) => `
    <div class="strip" style="background:${c}" data-hex="${c}">
      <span class="strip-name" style="color:${contrast(c)}">${colorName(c)}</span>
      <span class="strip-hex" style="color:${contrast(c)};opacity:0.7">${c.toUpperCase()}</span>
    </div>
  `,
    )
    .join("")}</div>`;
}

function renderUIPreview(colors) {
  const [primary, secondary, accent, bg, text] = [colors[0], colors[1] || colors[0], colors[2] || colors[0], colors[colors.length - 1], colors[Math.floor(colors.length / 2)]];
  return `<div class="palette-ui">
    <div class="ui-preview-inner">
      <div class="ui-nav-bar" style="background:${primary}">
        <div class="ui-nav-dot"></div>
        <div class="ui-nav-dot"></div>
        <div class="ui-nav-title" style="color:${contrast(primary)}">My App</div>
      </div>
      <div class="ui-body" style="background:${bg};color:${contrast(bg)}">
        <div class="ui-heading" style="color:${contrast(bg)}">Xin chào! 👋</div>
        <div class="ui-text" style="color:${contrast(bg)}">Đây là bản xem trước giao diện với palette màu của bạn.</div>
        <div class="ui-btn" style="background:${secondary};color:${contrast(secondary)}">Bắt đầu ngay</div>
        <div class="ui-accent-block" style="background:${accent}"></div>
      </div>
    </div>
  </div>`;
}

function renderInfoBar(colors) {
  return colors
    .map((c) => {
      const { h, s, l } = hexToHsl(c);
      const { r, g, b } = hexToRgb(c);
      return `<div class="color-chip" data-hex="${c}">
      <div class="chip-dot" style="background:${c}"></div>
      <div class="chip-info">
        <div class="chip-hex">${c.toUpperCase()}</div>
        <div class="chip-vals">rgb(${r},${g},${b}) · hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)</div>
      </div>
      <button class="chip-copy" data-hex="${c}">copy</button>
    </div>`;
    })
    .join("");
}

// ─── Main render ──────────────────────────────────────────────────────────
function render() {
  palette = generatePalette(baseHex, harmony, count);

  // Nav logo mark accent
  document.getElementById("nav-logo-mark").style.background = palette[Math.floor(palette.length / 2)] || baseHex;

  // Swatch preview
  document.getElementById("swatch-preview").style.background = baseHex;

  // Palette display
  const display = document.getElementById("palette-display");
  if (viewMode === "swatches") display.innerHTML = renderSwatches(palette);
  else if (viewMode === "strips") display.innerHTML = renderStrips(palette);
  else display.innerHTML = renderUIPreview(palette);

  // Swatch click → copy
  display.querySelectorAll("[data-hex]").forEach((el) => {
    el.addEventListener("click", () => copyHex(el.dataset.hex));
  });

  // Info bar
  document.getElementById("color-info-bar").innerHTML = renderInfoBar(palette);
  document.querySelectorAll(".chip-copy").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyHex(btn.dataset.hex);
    });
  });

  // Export preview
  updateExportCode();
}

// ─── Export formats ───────────────────────────────────────────────────────
function buildExportCode(fmt) {
  const name = document.getElementById("palette-name").value.trim() || "palette";
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  switch (fmt) {
    case "hex":
      return palette.map((c, i) => `${slug}-${i + 1}: ${c.toUpperCase()}`).join("\n");
    case "rgb": {
      return palette
        .map((c, i) => {
          const { r, g, b } = hexToRgb(c);
          return `${slug}-${i + 1}: rgb(${r}, ${g}, ${b})`;
        })
        .join("\n");
    }
    case "hsl": {
      return palette
        .map((c, i) => {
          const { h, s, l } = hexToHsl(c);
          return `${slug}-${i + 1}: hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
        })
        .join("\n");
    }
    case "css": {
      return `:root {\n${palette.map((c, i) => `  --${slug}-${i + 1}: ${c.toUpperCase()};`).join("\n")}\n}`;
    }
    case "tailwind": {
      return `// tailwind.config.js\ncolors: {\n  '${slug}': {\n${palette.map((c, i) => `    '${(i + 1) * 100}': '${c.toUpperCase()}',`).join("\n")}\n  },\n}`;
    }
    case "scss": {
      return palette.map((c, i) => `$${slug}-${i + 1}: ${c.toUpperCase()};`).join("\n");
    }
    default:
      return "";
  }
}

function updateExportCode() {
  document.getElementById("export-code").textContent = buildExportCode(exportFmt);
}

// ─── Saved palettes ───────────────────────────────────────────────────────
function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || [];
  } catch {
    return [];
  }
}

function savePalettes() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
}

function saveCurrent() {
  const name = document.getElementById("palette-name").value.trim() || `Palette ${saved.length + 1}`;
  saved.unshift({ id: Date.now(), name, harmony, colors: [...palette], base: baseHex });
  savePalettes();
  renderSaved();
  toast(`💾 Đã lưu "${name}"`);
}

function deleteSaved(id) {
  saved = saved.filter((p) => p.id !== id);
  savePalettes();
  renderSaved();
}

function loadSavedPalette(p) {
  baseHex = p.base;
  harmony = p.harmony;
  palette = [...p.colors];
  count = palette.length;

  document.getElementById("hex-text-input").value = baseHex;
  document.getElementById("color-picker-input").value = baseHex;
  document.getElementById("count-val").textContent = count;
  document.getElementById("palette-name").value = p.name;

  document.querySelectorAll(".harmony-tab").forEach((t) => t.classList.toggle("active", t.dataset.harmony === harmony));
  render();
}

function renderSaved() {
  const el = document.getElementById("saved-grid");
  const count = document.getElementById("saved-count");
  count.textContent = saved.length;

  if (saved.length === 0) {
    el.innerHTML = '<div class="saved-empty">Chưa có palette nào được lưu</div>';
    return;
  }

  el.innerHTML = saved
    .map(
      (p) => `
    <div class="saved-card" data-id="${p.id}">
      <div class="saved-strip">${p.colors.map((c) => `<div class="saved-color" style="background:${c}"></div>`).join("")}</div>
      <div class="saved-meta">
        <div class="saved-name">${escHtml(p.name)}</div>
        <div class="saved-info">${p.harmony} · ${p.colors.length} màu</div>
      </div>
      <div class="saved-actions">
        <button class="saved-act-btn load-btn" data-id="${p.id}">Tải</button>
        <button class="saved-act-btn del" data-id="${p.id}">Xóa</button>
      </div>
    </div>
  `,
    )
    .join("");

  el.querySelectorAll(".load-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadSavedPalette(saved.find((p) => p.id === +btn.dataset.id));
    });
  });
  el.querySelectorAll(".del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSaved(+btn.dataset.id);
    });
  });
}

// ─── Copy ─────────────────────────────────────────────────────────────────
function copyHex(hex) {
  navigator.clipboard
    .writeText(hex)
    .then(() => toast(`✓ Đã sao chép ${hex}`))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = hex;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast(`✓ ${hex}`);
    });
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Random colour ────────────────────────────────────────────────────────
function randomColor() {
  const h = Math.random() * 360;
  const s = 55 + Math.random() * 30;
  const l = 40 + Math.random() * 20;
  return hslToHex(h, s, l);
}

// ─── Event wiring ─────────────────────────────────────────────────────────

// Colour picker
document.getElementById("color-swatch-btn").addEventListener("click", () => {
  document.getElementById("color-picker-input").click();
});

document.getElementById("color-picker-input").addEventListener("input", function () {
  baseHex = this.value;
  document.getElementById("hex-text-input").value = baseHex;
  render();
});

document.getElementById("hex-text-input").addEventListener("input", function () {
  const v = this.value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
    baseHex = v;
    document.getElementById("color-picker-input").value = v;
    render();
  }
});

document.getElementById("hex-text-input").addEventListener("blur", function () {
  if (!/^#[0-9A-Fa-f]{6}$/.test(this.value)) this.value = baseHex;
});

// Harmony tabs
document.querySelectorAll(".harmony-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    harmony = btn.dataset.harmony;
    document.querySelectorAll(".harmony-tab").forEach((b) => b.classList.toggle("active", b.dataset.harmony === harmony));
    render();
  });
});

// Count
document.getElementById("count-minus").addEventListener("click", () => {
  if (count > 2) {
    count--;
    document.getElementById("count-val").textContent = count;
    render();
  }
});
document.getElementById("count-plus").addEventListener("click", () => {
  if (count < 12) {
    count++;
    document.getElementById("count-val").textContent = count;
    render();
  }
});

// View mode
document.querySelectorAll(".preview-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    viewMode = btn.dataset.view;
    document.querySelectorAll(".preview-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewMode));
    render();
  });
});

// Random
document.getElementById("random-btn").addEventListener("click", () => {
  baseHex = randomColor();
  document.getElementById("color-picker-input").value = baseHex;
  document.getElementById("hex-text-input").value = baseHex;
  render();
});

// Export modal
document.getElementById("export-btn").addEventListener("click", () => {
  updateExportCode();
  document.getElementById("export-modal").classList.add("open");
});

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("export-modal").classList.remove("open");
});

document.getElementById("export-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("export-modal")) document.getElementById("export-modal").classList.remove("open");
});

document.querySelectorAll(".export-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    exportFmt = btn.dataset.fmt;
    document.querySelectorAll(".export-tab").forEach((b) => b.classList.toggle("active", b.dataset.fmt === exportFmt));
    updateExportCode();
  });
});

document.getElementById("copy-export-btn").addEventListener("click", () => {
  const code = document.getElementById("export-code").textContent;
  navigator.clipboard.writeText(code).then(() => toast("✓ Đã sao chép code!"));
});

// Save button (Ctrl+S)
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveCurrent();
  }
  if (e.code === "Space" && document.activeElement.tagName !== "INPUT") {
    e.preventDefault();
    baseHex = randomColor();
    document.getElementById("color-picker-input").value = baseHex;
    document.getElementById("hex-text-input").value = baseHex;
    render();
  }
  if (e.key === "Escape") document.getElementById("export-modal").classList.remove("open");
});

// Add save button to export modal footer
document.getElementById("copy-export-btn").insertAdjacentHTML("afterend", `<button class="btn-primary" id="save-btn" style="margin-left:8px">💾 Lưu palette</button>`);
document.getElementById("save-btn").addEventListener("click", () => {
  saveCurrent();
  document.getElementById("export-modal").classList.remove("open");
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
document.getElementById("hex-text-input").value = baseHex;
document.getElementById("color-picker-input").value = baseHex;
render();
renderSaved();
