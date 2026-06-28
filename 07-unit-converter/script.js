"use strict";

// ─── Conversion data ──────────────────────────────────────────────────────
// Each unit has a `factor` relative to the base unit of that category.
// Convert A→B: value * units[A].factor / units[B].factor
// Special units (°C, °F, °K) use toBase/fromBase functions.

const CATEGORIES = [
  {
    id: "length",
    name: "Độ dài",
    icon: "📏",
    base: "m",
    units: [
      { id: "km", name: "Kilômét (km)", factor: 1000 },
      { id: "m", name: "Mét (m)", factor: 1 },
      { id: "cm", name: "Centimét (cm)", factor: 0.01 },
      { id: "mm", name: "Milimét (mm)", factor: 0.001 },
      { id: "mi", name: "Dặm (mi)", factor: 1609.344 },
      { id: "yd", name: "Yard (yd)", factor: 0.9144 },
      { id: "ft", name: "Feet (ft)", factor: 0.3048 },
      { id: "in", name: "Inch (in)", factor: 0.0254 },
      { id: "nmi", name: "Hải lý (nmi)", factor: 1852 },
      { id: "ly", name: "Năm ánh sáng (ly)", factor: 9.461e15 },
    ],
  },
  {
    id: "weight",
    name: "Khối lượng",
    icon: "⚖️",
    base: "kg",
    units: [
      { id: "tonne", name: "Tấn (t)", factor: 1000 },
      { id: "kg", name: "Kilôgam (kg)", factor: 1 },
      { id: "g", name: "Gam (g)", factor: 0.001 },
      { id: "mg", name: "Miligam (mg)", factor: 1e-6 },
      { id: "lb", name: "Pound (lb)", factor: 0.453592 },
      { id: "oz", name: "Ounce (oz)", factor: 0.0283495 },
      { id: "stone", name: "Stone (st)", factor: 6.35029 },
      { id: "mcg", name: "Micrôgam (μg)", factor: 1e-9 },
    ],
  },
  {
    id: "temperature",
    name: "Nhiệt độ",
    icon: "🌡️",
    base: "c",
    units: [
      { id: "c", name: "Celsius (°C)", toBase: (v) => v, fromBase: (v) => v },
      { id: "f", name: "Fahrenheit (°F)", toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: "k", name: "Kelvin (K)", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
      { id: "re", name: "Réaumur (°Ré)", toBase: (v) => (v * 5) / 4, fromBase: (v) => (v * 4) / 5 },
    ],
  },
  {
    id: "area",
    name: "Diện tích",
    icon: "⬛",
    base: "m2",
    units: [
      { id: "km2", name: "Km² (km²)", factor: 1e6 },
      { id: "m2", name: "Mét vuông (m²)", factor: 1 },
      { id: "cm2", name: "Cm² (cm²)", factor: 1e-4 },
      { id: "mm2", name: "Mm² (mm²)", factor: 1e-6 },
      { id: "ha", name: "Hecta (ha)", factor: 10000 },
      { id: "acre", name: "Acre", factor: 4046.86 },
      { id: "ft2", name: "Feet vuông (ft²)", factor: 0.092903 },
      { id: "in2", name: "Inch vuông (in²)", factor: 6.4516e-4 },
      { id: "mi2", name: "Dặm vuông (mi²)", factor: 2.59e6 },
    ],
  },
  {
    id: "volume",
    name: "Thể tích",
    icon: "🧊",
    base: "l",
    units: [
      { id: "l", name: "Lít (L)", factor: 1 },
      { id: "ml", name: "Mililít (mL)", factor: 0.001 },
      { id: "m3", name: "Mét khối (m³)", factor: 1000 },
      { id: "cm3", name: "Cm³ (cm³)", factor: 0.001 },
      { id: "gal", name: "Gallon (US)", factor: 3.78541 },
      { id: "qt", name: "Quart (US)", factor: 0.946353 },
      { id: "pt", name: "Pint (US)", factor: 0.473176 },
      { id: "cup", name: "Cup (US)", factor: 0.236588 },
      { id: "floz", name: "Fl oz (US)", factor: 0.0295735 },
      { id: "tbsp", name: "Muỗng canh (tbsp)", factor: 0.0147868 },
      { id: "tsp", name: "Muỗng cà phê (tsp)", factor: 0.00492892 },
    ],
  },
  {
    id: "speed",
    name: "Tốc độ",
    icon: "🚀",
    base: "mps",
    units: [
      { id: "mps", name: "m/s", factor: 1 },
      { id: "kmh", name: "km/h", factor: 1 / 3.6 },
      { id: "mph", name: "dặm/h (mph)", factor: 0.44704 },
      { id: "kn", name: "Hải lý/h (knot)", factor: 0.514444 },
      { id: "mach", name: "Mach", factor: 343 },
      { id: "c", name: "Tốc độ ánh sáng", factor: 299792458 },
    ],
  },
  {
    id: "time",
    name: "Thời gian",
    icon: "⏰",
    base: "s",
    units: [
      { id: "ms", name: "Mili giây (ms)", factor: 0.001 },
      { id: "s", name: "Giây (s)", factor: 1 },
      { id: "min", name: "Phút (min)", factor: 60 },
      { id: "h", name: "Giờ (h)", factor: 3600 },
      { id: "d", name: "Ngày (d)", factor: 86400 },
      { id: "wk", name: "Tuần (wk)", factor: 604800 },
      { id: "mo", name: "Tháng (~30.44d)", factor: 2629743 },
      { id: "yr", name: "Năm (yr)", factor: 31557600 },
    ],
  },
  {
    id: "data",
    name: "Dữ liệu",
    icon: "💾",
    base: "byte",
    units: [
      { id: "bit", name: "Bit (b)", factor: 0.125 },
      { id: "byte", name: "Byte (B)", factor: 1 },
      { id: "kb", name: "Kilobyte (KB)", factor: 1024 },
      { id: "mb", name: "Megabyte (MB)", factor: 1048576 },
      { id: "gb", name: "Gigabyte (GB)", factor: 1073741824 },
      { id: "tb", name: "Terabyte (TB)", factor: 1.0995e12 },
      { id: "pb", name: "Petabyte (PB)", factor: 1.1259e15 },
      { id: "kbit", name: "Kilobit (Kb)", factor: 125 },
      { id: "mbit", name: "Megabit (Mb)", factor: 125000 },
      { id: "gbit", name: "Gigabit (Gb)", factor: 1.25e8 },
    ],
  },
  {
    id: "pressure",
    name: "Áp suất",
    icon: "🔵",
    base: "pa",
    units: [
      { id: "pa", name: "Pascal (Pa)", factor: 1 },
      { id: "kpa", name: "Kilopascal (kPa)", factor: 1000 },
      { id: "mpa", name: "Megapascal (MPa)", factor: 1e6 },
      { id: "bar", name: "Bar", factor: 100000 },
      { id: "mbar", name: "Millibar (mbar)", factor: 100 },
      { id: "atm", name: "Átmốtphe (atm)", factor: 101325 },
      { id: "mmhg", name: "mmHg / Torr", factor: 133.322 },
      { id: "psi", name: "PSI (psi)", factor: 6894.76 },
    ],
  },
  {
    id: "energy",
    name: "Năng lượng",
    icon: "⚡",
    base: "j",
    units: [
      { id: "j", name: "Joule (J)", factor: 1 },
      { id: "kj", name: "Kilojoule (kJ)", factor: 1000 },
      { id: "mj", name: "Megajoule (MJ)", factor: 1e6 },
      { id: "cal", name: "Calorie (cal)", factor: 4.184 },
      { id: "kcal", name: "Kilocalorie (kcal)", factor: 4184 },
      { id: "wh", name: "Watt·giờ (Wh)", factor: 3600 },
      { id: "kwh", name: "Kilowatt·giờ (kWh)", factor: 3600000 },
      { id: "btu", name: "BTU", factor: 1055.06 },
      { id: "ev", name: "Electronvolt (eV)", factor: 1.602e-19 },
    ],
  },
];

// ─── State ────────────────────────────────────────────────────────────────
const HISTORY_KEY = "converto_history_v1";
let activeCatId = "length";
let fromUnitId = "km";
let toUnitId = "m";
let history = loadHistory();
let lastFromVal = "";

// ─── Helpers ──────────────────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
}

function getCat() {
  return CATEGORIES.find((c) => c.id === activeCatId);
}

function getUnit(cat, id) {
  return cat.units.find((u) => u.id === id);
}

function convert(cat, fromId, toId, value) {
  if (isNaN(value) || value === "") return "";
  const from = getUnit(cat, fromId);
  const to = getUnit(cat, toId);
  if (!from || !to) return "";

  let baseVal;
  if (cat.id === "temperature") {
    baseVal = from.toBase(value);
    return to.fromBase(baseVal);
  }
  baseVal = value * from.factor;
  return baseVal / to.factor;
}

function fmtNum(n) {
  if (n === "" || n === null || isNaN(n)) return "";
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1e15 || (abs < 1e-6 && abs > 0)) return n.toExponential(6);
  if (abs >= 1000) return +n.toPrecision(8) + "";
  return +(+n.toPrecision(10)) + "";
}

function unitShort(id) {
  const all = CATEGORIES.flatMap((c) => c.units);
  const u = all.find((x) => x.id === id);
  if (!u) return id;
  const m = u.name.match(/\(([^)]+)\)/);
  return m ? m[1] : u.name.split(" ")[0];
}

function relativeTime(ts) {
  const d = Math.floor((Date.now() - ts) / 60000);
  if (d < 1) return "vừa xong";
  if (d < 60) return `${d}p trước`;
  return `${Math.floor(d / 60)}h trước`;
}

// ─── Build UI ─────────────────────────────────────────────────────────────
function buildCatTabs() {
  const el = document.getElementById("cat-tabs");
  el.innerHTML = CATEGORIES.map(
    (c) => `
    <button class="cat-tab${c.id === activeCatId ? " active" : ""}" data-cat="${c.id}">
      <span class="cat-tab-icon">${c.icon}</span>${c.name}
    </button>
  `,
  ).join("");
  el.querySelectorAll(".cat-tab").forEach((btn) => {
    btn.addEventListener("click", () => selectCat(btn.dataset.cat));
  });
}

function buildAllCatsGrid() {
  const el = document.getElementById("all-cats-grid");
  el.innerHTML = CATEGORIES.map(
    (c) => `
    <div class="cat-card${c.id === activeCatId ? " active" : ""}" data-cat="${c.id}">
      <div class="cat-card-icon">${c.icon}</div>
      <div class="cat-card-name">${c.name}</div>
      <div class="cat-card-count">${c.units.length} đơn vị</div>
    </div>
  `,
  ).join("");
  el.querySelectorAll(".cat-card").forEach((card) => {
    card.addEventListener("click", () => selectCat(card.dataset.cat));
  });
}

function populateSelects() {
  const cat = getCat();
  const fromSel = document.getElementById("from-unit");
  const toSel = document.getElementById("to-unit");

  const opts = cat.units.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");

  fromSel.innerHTML = opts;
  toSel.innerHTML = opts;

  fromSel.value = fromUnitId;
  toSel.value = toUnitId;

  document.getElementById("conv-category-label").textContent = cat.name;
}

function selectCat(catId) {
  activeCatId = catId;
  const cat = getCat();
  fromUnitId = cat.units[0].id;
  toUnitId = cat.units[1] ? cat.units[1].id : cat.units[0].id;

  document.getElementById("from-input").value = "";
  document.getElementById("to-input").value = "";

  buildCatTabs();
  buildAllCatsGrid();
  populateSelects();
  updateFormulaHint();
  updateRefTable("");
}

// ─── Core conversion ──────────────────────────────────────────────────────
function doConvert(fromVal, direction = "from") {
  const cat = getCat();
  fromUnitId = document.getElementById("from-unit").value;
  toUnitId = document.getElementById("to-unit").value;

  if (direction === "from") {
    const result = convert(cat, fromUnitId, toUnitId, parseFloat(fromVal));
    document.getElementById("to-input").value = fromVal === "" ? "" : fmtNum(result);
    updateRefTable(fromVal);
    if (fromVal !== "" && fromVal !== lastFromVal) {
      addHistory(parseFloat(fromVal), result);
      lastFromVal = fromVal;
    }
  } else {
    const result = convert(cat, toUnitId, fromUnitId, parseFloat(fromVal));
    document.getElementById("from-input").value = fromVal === "" ? "" : fmtNum(result);
    updateRefTable(fmtNum(result));
  }

  updateFormulaHint();
}

function updateFormulaHint() {
  const cat = getCat();
  const fromVal = document.getElementById("from-input").value;
  const toVal = document.getElementById("to-input").value;
  const el = document.getElementById("formula-hint");

  if (!fromVal || !toVal) {
    el.textContent = `Nhập giá trị để xem công thức chuyển đổi`;
    return;
  }

  const fShort = unitShort(fromUnitId);
  const tShort = unitShort(toUnitId);

  if (cat.id === "temperature") {
    const formulae = {
      "c-f": "°F = °C × 9/5 + 32",
      "f-c": "°C = (°F − 32) × 5/9",
      "c-k": "K = °C + 273.15",
      "k-c": "°C = K − 273.15",
      "f-k": "K = (°F − 32) × 5/9 + 273.15",
      "k-f": "°F = (K − 273.15) × 9/5 + 32",
    };
    el.textContent = formulae[`${fromUnitId}-${toUnitId}`] || `${fromVal} ${fShort} = ${toVal} ${tShort}`;
  } else {
    el.textContent = `${fromVal} ${fShort} = ${toVal} ${tShort}`;
  }
}

// ─── Reference table ──────────────────────────────────────────────────────
function updateRefTable(fromVal) {
  const cat = getCat();
  const val = parseFloat(fromVal);
  const el = document.getElementById("ref-table");
  document.getElementById("ref-title").textContent = val && !isNaN(val) ? `${fromVal} ${unitShort(fromUnitId)} bằng...` : "Bảng quy đổi nhanh";

  el.innerHTML = cat.units
    .map((u) => {
      let result = "";
      if (val && !isNaN(val)) {
        const r = convert(cat, fromUnitId, u.id, val);
        result = fmtNum(r);
      }
      return `<div class="ref-row${u.id === toUnitId ? " active-row" : ""}" data-uid="${u.id}">
      <span class="ref-unit">${unitShort(u.id)}</span>
      <span class="ref-val">${result || "—"}</span>
    </div>`;
    })
    .join("");

  // Click row → set as "to" unit
  el.querySelectorAll(".ref-row").forEach((row) => {
    row.addEventListener("click", () => {
      toUnitId = row.dataset.uid;
      document.getElementById("to-unit").value = toUnitId;
      doConvert(document.getElementById("from-input").value, "from");
    });
  });
}

// ─── History ──────────────────────────────────────────────────────────────
function addHistory(from, to) {
  const cat = getCat();
  history.unshift({
    cat: cat.name,
    icon: cat.icon,
    from: `${fmtNum(from)} ${unitShort(fromUnitId)}`,
    to: `${fmtNum(to)} ${unitShort(toUnitId)}`,
    ts: Date.now(),
  });
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById("history-list");
  if (history.length === 0) {
    el.innerHTML = '<div class="history-empty">Chưa có lịch sử chuyển đổi</div>';
    return;
  }
  el.innerHTML = history
    .slice(0, 12)
    .map(
      (h) => `
    <div class="history-item">
      <span class="history-icon">${h.icon}</span>
      <span class="history-expr">${h.from} = ${h.to}</span>
      <span class="history-time">${relativeTime(h.ts)}</span>
    </div>
  `,
    )
    .join("");
}

// ─── Events ───────────────────────────────────────────────────────────────
document.getElementById("from-input").addEventListener("input", function () {
  doConvert(this.value, "from");
});

document.getElementById("to-input").addEventListener("input", function () {
  doConvert(this.value, "to");
});

document.getElementById("from-unit").addEventListener("change", function () {
  fromUnitId = this.value;
  doConvert(document.getElementById("from-input").value, "from");
});

document.getElementById("to-unit").addEventListener("change", function () {
  toUnitId = this.value;
  doConvert(document.getElementById("from-input").value, "from");
});

document.getElementById("swap-btn").addEventListener("click", () => {
  const fromVal = document.getElementById("from-input").value;
  const toVal = document.getElementById("to-input").value;
  [fromUnitId, toUnitId] = [toUnitId, fromUnitId];
  document.getElementById("from-unit").value = fromUnitId;
  document.getElementById("to-unit").value = toUnitId;
  document.getElementById("from-input").value = toVal;
  document.getElementById("to-input").value = fromVal;
  doConvert(toVal, "from");
  toast("Đã hoán đổi đơn vị");
});

document.getElementById("clear-history").addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
  toast("Đã xóa lịch sử");
});

// Keyboard: Enter to focus to-input
document.getElementById("from-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("to-input").focus();
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
buildCatTabs();
buildAllCatsGrid();
populateSelects();
updateFormulaHint();
updateRefTable("");
renderHistory();
