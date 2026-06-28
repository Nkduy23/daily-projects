"use strict";

// ─── Character pools ──────────────────────────────────────────────────────
const POOL = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const SIMILAR_CHARS = /[0Ol1I]/g;

// Wordlist for memorable/passphrase modes
const WORDS = [
  "apple",
  "brave",
  "cloud",
  "dance",
  "eagle",
  "flame",
  "grace",
  "heart",
  "ivory",
  "joker",
  "knife",
  "lemon",
  "magic",
  "noble",
  "ocean",
  "pearl",
  "queen",
  "river",
  "storm",
  "tiger",
  "ultra",
  "vivid",
  "water",
  "xenon",
  "yacht",
  "zebra",
  "alpha",
  "bloom",
  "crisp",
  "delta",
  "ember",
  "frost",
  "globe",
  "honey",
  "indie",
  "jewel",
  "karma",
  "lunar",
  "maple",
  "nexus",
  "olive",
  "piano",
  "quest",
  "radar",
  "solar",
  "trend",
  "unity",
  "vault",
  "windy",
  "xenon",
  "youth",
  "zesty",
  "amber",
  "birch",
  "cedar",
  "dunes",
  "fairy",
  "grove",
  "hazel",
  "inlet",
  "jazzy",
  "kelp",
  "lilac",
  "marsh",
  "neon",
  "oasis",
  "patch",
  "quill",
  "rebel",
  "sandy",
  "talon",
  "urban",
  "vibes",
  "woven",
  "pixel",
  "quirk",
  "blaze",
  "cipher",
  "drift",
  "echo",
];

const HISTORY_KEY = "passgen_history_v1";

// ─── State ────────────────────────────────────────────────────────────────
const opts = {
  upper: true,
  lower: true,
  numbers: true,
  symbols: false,
  similar: false,
};

let length = 16;
let qty = 1;
let mode = null; // null = standard
let history = loadHistory();
let generated = [];

// ─── Storage ──────────────────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}
function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

// ─── Crypto random ────────────────────────────────────────────────────────
function cryptoRandInt(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function cryptoChoice(str) {
  return str[cryptoRandInt(str.length)];
}

// ─── Build pool ───────────────────────────────────────────────────────────
function buildPool() {
  let pool = "";
  if (opts.upper) pool += POOL.upper;
  if (opts.lower) pool += POOL.lower;
  if (opts.numbers) pool += POOL.numbers;
  if (opts.symbols) pool += POOL.symbols;
  if (opts.similar) pool = pool.replace(SIMILAR_CHARS, "");
  // remove excluded chars
  const excluded = document.getElementById("exclude-input").value;
  if (excluded) {
    pool = pool
      .split("")
      .filter((c) => !excluded.includes(c))
      .join("");
  }
  return pool;
}

// ─── Generate ─────────────────────────────────────────────────────────────
function generateOne() {
  if (mode === "pin") return generatePIN();
  if (mode === "memorable") return generateMemorable();
  if (mode === "passphrase") return generatePassphrase();
  if (mode === "hex") return generateHex();
  return generateStandard();
}

function generateStandard() {
  const pool = buildPool();
  if (!pool) return "";

  // Guarantee at least one char from each selected set
  let pw = [];
  if (opts.upper) pw.push(cryptoChoice(opts.similar ? POOL.upper.replace(SIMILAR_CHARS, "") : POOL.upper));
  if (opts.lower) pw.push(cryptoChoice(opts.similar ? POOL.lower.replace(SIMILAR_CHARS, "") : POOL.lower));
  if (opts.numbers) pw.push(cryptoChoice(opts.similar ? POOL.numbers.replace(SIMILAR_CHARS, "") : POOL.numbers));
  if (opts.symbols) pw.push(cryptoChoice(POOL.symbols));

  while (pw.length < length) pw.push(cryptoChoice(pool));

  // Shuffle using Fisher-Yates with crypto
  for (let i = pw.length - 1; i > 0; i--) {
    const j = cryptoRandInt(i + 1);
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join("");
}

function generatePIN() {
  let pw = "";
  for (let i = 0; i < length; i++) pw += cryptoChoice(POOL.numbers);
  return pw;
}

function generateMemorable() {
  // alternating consonant-vowel pattern — easy to pronounce
  const vowels = "aeiou";
  const consonants = "bcdfghjklmnpqrstvwxyz";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += i % 2 === 0 ? cryptoChoice(consonants) : cryptoChoice(vowels);
  }
  // capitalise first
  return pw[0].toUpperCase() + pw.slice(1);
}

function generatePassphrase() {
  // 4–6 random words separated by dashes or underscores
  const wordCount = Math.max(3, Math.min(8, Math.floor(length / 5)));
  const sep = opts.symbols ? cryptoChoice("-_.*") : "-";
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    let w = WORDS[cryptoRandInt(WORDS.length)];
    if (opts.numbers && cryptoRandInt(3) === 0) w += cryptoRandInt(99) + 1;
    words.push(w);
  }
  return words.join(sep);
}

function generateHex() {
  const bytes = Math.ceil(length / 2);
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length)
    .toUpperCase();
}

// ─── Strength ─────────────────────────────────────────────────────────────
function calcStrength(pw) {
  if (!pw) return { score: 0, label: "—", color: "var(--border)" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 20) score++;

  const clamped = Math.min(score, 5);
  const map = [
    { label: "Rất yếu", color: "#DC2626" },
    { label: "Yếu", color: "#EA580C" },
    { label: "Trung bình", color: "#D97706" },
    { label: "Tốt", color: "#65A30D" },
    { label: "Mạnh", color: "#16A34A" },
    { label: "Rất mạnh", color: "#0D9488" },
  ];
  return { score: clamped, label: map[clamped].label, color: map[clamped].color };
}

function updateStrengthUI(pw) {
  const { score, label, color } = calcStrength(pw);
  const bars = document.querySelectorAll(".sbar");
  bars.forEach((b, i) => {
    b.style.background = i < score ? color : "var(--border)";
  });
  const lbl = document.getElementById("strength-label");
  lbl.textContent = label;
  lbl.style.color = color;
}

// ─── Entropy ──────────────────────────────────────────────────────────────
function calcEntropy(pw) {
  if (!pw) return { bits: 0, pool: 0, crack: "—", combos: "—" };
  let pool = 0;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 32;
  if (!pool) pool = 10;

  const bits = Math.floor(Math.log2(Math.pow(pool, pw.length)));

  // Crack time assuming 1 billion guesses/sec
  const combos = Math.pow(pool, pw.length);
  const seconds = combos / 2 / 1e9;
  const crack = fmtCrack(seconds);
  const combosStr = fmtCombos(combos);

  return { bits, pool, crack, combos: combosStr };
}

function fmtCrack(sec) {
  if (sec < 1) return "< 1 giây";
  if (sec < 60) return `${Math.floor(sec)} giây`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ`;
  if (sec < 31536000) return `${Math.floor(sec / 86400)} ngày`;
  const yr = sec / 31536000;
  if (yr < 1e6) return `${Math.floor(yr).toLocaleString()} năm`;
  if (yr < 1e9) return `${(yr / 1e6).toFixed(1)}M năm`;
  if (yr < 1e12) return `${(yr / 1e9).toFixed(1)}B năm`;
  return "∞ năm";
}

function fmtCombos(n) {
  if (n < 1e6) return n.toLocaleString();
  if (n < 1e12) return `${(n / 1e6).toFixed(1)}M`;
  if (n < 1e15) return `${(n / 1e12).toFixed(1)}T`;
  return `10^${Math.floor(Math.log10(n))}`;
}

function updateEntropyUI(pw) {
  const { bits, pool, crack, combos } = calcEntropy(pw);
  document.getElementById("e-entropy").textContent = pw ? bits : "—";
  document.getElementById("e-pool").textContent = pw ? pool : "—";
  document.getElementById("e-crack").textContent = pw ? crack : "—";
  document.getElementById("e-combos").textContent = pw ? combos : "—";

  // Colour entropy value
  const el = document.getElementById("e-entropy");
  el.style.color = bits > 80 ? "var(--green)" : bits > 60 ? "var(--yellow)" : bits > 0 ? "var(--red)" : "var(--text-1)";

  // Tips
  const tips = [];
  if (pw.length < 12) tips.push({ icon: "⚠️", text: "Tăng độ dài lên ít nhất 12 ký tự", bg: "var(--yellow-bg)", color: "var(--yellow)" });
  if (!/[A-Z]/.test(pw) && mode !== "pin" && mode !== "hex") tips.push({ icon: "💡", text: "Thêm chữ hoa để tăng độ bảo mật", bg: "var(--accent-bg)", color: "var(--accent)" });
  if (!/[^A-Za-z0-9]/.test(pw) && mode !== "pin" && mode !== "hex") tips.push({ icon: "🔐", text: "Thêm ký tự đặc biệt để tăng entropy", bg: "var(--purple-bg)", color: "var(--purple)" });
  if (bits > 80) tips.push({ icon: "✅", text: "Mật khẩu có độ bảo mật rất cao!", bg: "var(--green-bg)", color: "var(--green)" });

  document.getElementById("tips-list").innerHTML = tips
    .map(
      (t) => `
    <div class="tip-row" style="background:${t.bg}">
      <span class="tip-icon">${t.icon}</span>
      <span style="color:${t.color};font-weight:500">${t.text}</span>
    </div>
  `,
    )
    .join("");
}

// ─── Render password with syntax colouring ────────────────────────────────
function renderPassword(pw) {
  if (!pw) return `<span class="pw-placeholder">Nhấn tạo để bắt đầu...</span>`;
  return pw
    .split("")
    .map((c) => {
      if (/[A-Z]/.test(c)) return `<span class="ch-upper">${c}</span>`;
      if (/[0-9]/.test(c)) return `<span class="ch-number">${c}</span>`;
      if (/[^a-zA-Z0-9]/.test(c)) return `<span class="ch-symbol">${c}</span>`;
      return `<span class="ch-lower">${c}</span>`;
    })
    .join("");
}

// ─── Main generate ────────────────────────────────────────────────────────
function generate() {
  generated = [];
  for (let i = 0; i < qty; i++) {
    const pw = generateOne();
    if (pw) generated.push(pw);
  }

  const first = generated[0] || "";
  document.getElementById("password-display").innerHTML = generated.length > 1 ? generated.map((p) => renderPassword(p)).join("<br/>") : renderPassword(first);

  updateStrengthUI(first);
  updateEntropyUI(first);

  if (first) {
    history.unshift({ pw: first, ts: Date.now(), len: first.length });
    saveHistory();
    renderHistory();
  }
}

// ─── History ──────────────────────────────────────────────────────────────
function renderHistory() {
  const el = document.getElementById("pw-history");
  if (history.length === 0) {
    el.innerHTML = '<div class="history-empty">Chưa có mật khẩu nào được tạo</div>';
    return;
  }
  el.innerHTML = history
    .slice(0, 20)
    .map(
      (h, i) => `
    <div class="pw-hist-item" data-idx="${i}">
      <div class="pw-hist-pw">${h.pw}</div>
      <div class="pw-hist-meta">${h.len}c</div>
      <button class="pw-hist-copy" data-pw="${encodeURIComponent(h.pw)}">copy</button>
    </div>
  `,
    )
    .join("");

  el.querySelectorAll(".pw-hist-copy").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyText(decodeURIComponent(btn.dataset.pw));
    });
  });
}

// ─── Copy ─────────────────────────────────────────────────────────────────
function copyText(text) {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast("✓ Đã sao chép!");
      const btn = document.getElementById("copy-btn");
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1500);
    })
    .catch(() => {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast("✓ Đã sao chép!");
    });
}

// ─── Slider sync ──────────────────────────────────────────────────────────
function updateSliderFill(id) {
  const sl = document.getElementById(id);
  const pct = ((sl.value - sl.min) / (sl.max - sl.min)) * 100;
  sl.style.background = `linear-gradient(to right, var(--text-1) ${pct}%, var(--border) ${pct}%)`;
}

document.getElementById("length-slider").addEventListener("input", function () {
  length = +this.value;
  document.getElementById("length-val").textContent = length;
  updateSliderFill("length-slider");
});

document.getElementById("qty-slider").addEventListener("input", function () {
  qty = +this.value;
  document.getElementById("qty-val").textContent = qty;
  updateSliderFill("qty-slider");
});

// ─── Checkboxes ───────────────────────────────────────────────────────────
document.querySelectorAll(".custom-checkbox").forEach((chk) => {
  chk.addEventListener("click", () => {
    const key = chk.dataset.key;
    opts[key] = !opts[key];
    chk.classList.toggle("active", opts[key]);
  });
});

// ─── Mode buttons ─────────────────────────────────────────────────────────
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const m = btn.dataset.mode;
    if (mode === m) {
      mode = null;
      btn.classList.remove("active");
    } else {
      mode = m;
      document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    }
  });
});

// ─── Buttons ──────────────────────────────────────────────────────────────
document.getElementById("generate-btn").addEventListener("click", generate);
document.getElementById("refresh-btn").addEventListener("click", generate);

document.getElementById("copy-btn").addEventListener("click", () => {
  const text = generated.join("\n");
  copyText(text);
});

document.getElementById("clear-history").addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
  toast("Đã xóa lịch sử");
});

// ─── Keyboard ─────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    generate();
  }
  if (e.key === "c" || e.key === "C") copyText(generated[0] || "");
});

// Also Ctrl+C when not in input
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "c" && document.activeElement.tagName !== "INPUT") {
    if (generated[0]) copyText(generated.join("\n"));
  }
});

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ─── Init ─────────────────────────────────────────────────────────────────
updateSliderFill("length-slider");
updateSliderFill("qty-slider");
renderHistory();
generate(); // auto-generate on load
