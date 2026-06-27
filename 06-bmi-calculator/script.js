"use strict";

const HISTORY_KEY = "bmi_history_v1";

// ─── State ────────────────────────────────────────────────────────────────
let unit = "metric"; // 'metric' | 'imperial'
let gender = "male";

// ─── Helpers ──────────────────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

function toKgCm(weightVal, heightVal) {
  if (unit === "imperial") {
    return { kg: weightVal * 0.453592, cm: heightVal * 2.54 };
  }
  return { kg: weightVal, cm: heightVal };
}

// BMI → SVG rotate() angle for needle
// Arc: BMI16=180°, BMI40=0° in math coords (x=cos, y=-sin in SVG)
// Needle line points straight UP when unrotated (from 100,96 to 100,24)
// SVG rotate() is clockwise. Needle at 0° = up.
// To point at arcAngle A: needle must rotate (90 - A) degrees clockwise
function bmiToNeedleRotate(bmi) {
  const clamped = Math.max(16, Math.min(40, bmi));
  const arcAngle = 180 - ((clamped - 16) / 24) * 180;
  return 90 - arcAngle; // e.g. BMI25 → arcAngle=112.5 → rotate=-22.5° (slight left of up)
}

function bmiCategory(bmi) {
  if (bmi < 16) return { label: "Thiếu cân nặng", color: "#3B82F6", bg: "#EFF6FF", rowId: "row-under" };
  if (bmi < 18.5) return { label: "Thiếu cân", color: "#60A5FA", bg: "#EFF6FF", rowId: "row-under" };
  if (bmi < 25) return { label: "Bình thường", color: "#22C55E", bg: "#F0FDF4", rowId: "row-normal" };
  if (bmi < 30) return { label: "Thừa cân", color: "#EAB308", bg: "#FEFCE8", rowId: "row-over" };
  if (bmi < 35) return { label: "Béo phì độ I", color: "#F87171", bg: "#FEF2F2", rowId: "row-obese" };
  return { label: "Béo phì độ II+", color: "#DC2626", bg: "#FEF2F2", rowId: "row-obese" };
}

// Ideal weight formulas (in kg, for given height in cm)
function idealWeights(cm) {
  const inch = cm / 2.54;
  const over5ft = inch - 60;
  return {
    devine: gender === "male" ? 50 + 2.3 * over5ft : 45.5 + 2.3 * over5ft,
    robinson: gender === "male" ? 52 + 1.9 * over5ft : 49 + 1.7 * over5ft,
    miller: gender === "male" ? 56.2 + 1.41 * over5ft : 53.1 + 1.36 * over5ft,
  };
}

// BMR (Mifflin-St Jeor)
function calcBMR(kg, cm, age) {
  return gender === "male" ? 10 * kg + 6.25 * cm - 5 * age + 5 : 10 * kg + 6.25 * cm - 5 * age - 161;
}

// Scale pointer position (0–100%) from BMI
function bmiToScalePct(bmi) {
  // scale: 16 → 40
  const min = 16,
    max = 40;
  return Math.max(0, Math.min(100, ((bmi - min) / (max - min)) * 100));
}

function fmt1(n) {
  return n.toFixed(1);
}
function fmtRange(a, b) {
  return `${fmt1(a)} – ${fmt1(b)} kg`;
}

// ─── Slider ↔ input sync ──────────────────────────────────────────────────
function syncSlider(sliderId, inputId) {
  const slider = document.getElementById(sliderId);
  const input = document.getElementById(inputId);
  slider.addEventListener("input", () => {
    input.value = slider.value;
  });
  input.addEventListener("input", () => {
    let v = parseFloat(input.value);
    v = Math.max(+slider.min, Math.min(+slider.max, v || 0));
    slider.value = v;
  });
}

syncSlider("age-slider", "age-input");
syncSlider("height-slider", "height-input");
syncSlider("weight-slider", "weight-input");

// Update slider fill colour
function updateSliderFill(sliderId) {
  const slider = document.getElementById(sliderId);
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--text-1) ${pct}%, var(--border) ${pct}%)`;
}

["age-slider", "height-slider", "weight-slider"].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("input", () => updateSliderFill(id));
  updateSliderFill(id);
});

// ─── Unit switch ──────────────────────────────────────────────────────────
function applyUnit() {
  const hSlider = document.getElementById("height-slider");
  const wSlider = document.getElementById("weight-slider");
  const hInput = document.getElementById("height-input");
  const wInput = document.getElementById("weight-input");

  if (unit === "metric") {
    hSlider.min = 100;
    hSlider.max = 220;
    hSlider.value = 170;
    hInput.value = 170;
    wSlider.min = 30;
    wSlider.max = 200;
    wSlider.value = 65;
    wInput.value = 65;
    document.getElementById("height-unit").textContent = "cm";
    document.getElementById("weight-unit").textContent = "kg";
  } else {
    hSlider.min = 48;
    hSlider.max = 90;
    hSlider.value = 67;
    hInput.value = 67;
    wSlider.min = 66;
    wSlider.max = 440;
    wSlider.value = 143;
    wInput.value = 143;
    document.getElementById("height-unit").textContent = "in";
    document.getElementById("weight-unit").textContent = "lb";
  }

  ["height-slider", "weight-slider"].forEach(updateSliderFill);
}

document.querySelectorAll(".unit-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    unit = btn.dataset.unit;
    document.querySelectorAll(".unit-btn").forEach((b) => b.classList.toggle("active", b.dataset.unit === unit));
    applyUnit();
    document.getElementById("result-card").classList.add("hidden");
  });
});

// ─── Gender ───────────────────────────────────────────────────────────────
document.querySelectorAll(".gender-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    gender = btn.dataset.gender;
    document.querySelectorAll(".gender-btn").forEach((b) => b.classList.toggle("active", b.dataset.gender === gender));
  });
});

// ─── Calculate ────────────────────────────────────────────────────────────
document.getElementById("calc-btn").addEventListener("click", calculate);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") calculate();
});

function calculate() {
  const age = parseInt(document.getElementById("age-input").value, 10);
  const heightVal = parseFloat(document.getElementById("height-input").value);
  const weightVal = parseFloat(document.getElementById("weight-input").value);

  if (!age || !heightVal || !weightVal) {
    toast("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  const { kg, cm } = toKgCm(weightVal, heightVal);
  const bmi = kg / (cm / 100) ** 2;
  const cat = bmiCategory(bmi);

  // Show result card
  const card = document.getElementById("result-card");
  card.classList.remove("hidden");
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });

  // BMI value
  document.getElementById("bmi-value").textContent = fmt1(bmi);
  document.getElementById("bmi-category").textContent = cat.label;
  document.getElementById("bmi-category").style.background = cat.bg;
  document.getElementById("bmi-category").style.color = cat.color;

  // Gauge needle — SVG rotate around pivot (100,100)
  const needleDeg = bmiToNeedleRotate(bmi);
  document.getElementById("gauge-needle").setAttribute("transform", `rotate(${needleDeg}, 100, 100)`);

  // Scale pointer
  document.getElementById("scale-pointer").style.left = bmiToScalePct(bmi) + "%";

  // Highlight table row
  ["row-under", "row-normal", "row-over", "row-obese"].forEach((id) => {
    document.getElementById(id).classList.toggle("active-row", id === cat.rowId);
  });

  // Stats grid
  const bmr = calcBMR(kg, cm, age);
  const bodyFat = gender === "male" ? 1.2 * bmi + 0.23 * age - 16.2 : 1.2 * bmi + 0.23 * age - 5.4;

  document.getElementById("stats-grid").innerHTML = `
    <div class="stat-box">
      <div class="stat-val">${fmt1(bmi)}</div>
      <div class="stat-lbl">Chỉ số BMI</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${fmt1(Math.max(0, bodyFat))}%</div>
      <div class="stat-lbl">Mỡ cơ thể (ước tính)</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${Math.round(bmr)}</div>
      <div class="stat-lbl">BMR (kcal/ngày)</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${Math.round(bmr * 1.375)}</div>
      <div class="stat-lbl">TDEE (ít vận động)</div>
    </div>
  `;

  // Advice
  const advices = {
    "row-under": {
      color: "#3B82F6",
      bg: "#EFF6FF",
      border: "#BFDBFE",
      text: "⚠️ Bạn đang thiếu cân. Hãy tăng cường dinh dưỡng với thực phẩm giàu protein và calo lành mạnh. Cân nhắc gặp bác sĩ dinh dưỡng để có kế hoạch tăng cân phù hợp.",
    },
    "row-normal": {
      color: "#16A34A",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      text: "✅ Tuyệt vời! Cân nặng của bạn đang trong ngưỡng lý tưởng. Hãy duy trì thói quen ăn uống lành mạnh và tập thể dục đều đặn để giữ nguyên trạng thái này.",
    },
    "row-over": {
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
      text: "⚠️ Bạn đang thừa cân nhẹ. Một số điều chỉnh về chế độ ăn và tăng hoạt động thể chất sẽ giúp bạn đạt cân nặng lý tưởng. Mục tiêu 30 phút vận động mỗi ngày.",
    },
    "row-obese": {
      color: "#DC2626",
      bg: "#FEF2F2",
      border: "#FECACA",
      text: "🔴 Chỉ số BMI cho thấy bạn đang trong tình trạng béo phì. Đây là yếu tố nguy cơ cho nhiều bệnh mãn tính. Hãy tham khảo ý kiến bác sĩ để có kế hoạch giảm cân an toàn.",
    },
  };

  const adv = advices[cat.rowId];
  const advEl = document.getElementById("advice-box");
  advEl.textContent = adv.text;
  advEl.style.background = adv.bg;
  advEl.style.color = adv.color;
  advEl.style.borderColor = adv.border;

  // Ideal weight
  const iw = idealWeights(cm);
  const bmiLow = 18.5 * (cm / 100) ** 2;
  const bmiHigh = 24.9 * (cm / 100) ** 2;
  document.getElementById("ideal-content").innerHTML = `
    <div class="ideal-row">
      <div>
        <div style="font-size:13px;font-weight:600">Theo BMI (18.5–24.9)</div>
        <div class="ideal-formula">Khuyến nghị WHO</div>
      </div>
      <div class="ideal-range">${fmtRange(bmiLow, bmiHigh)}</div>
    </div>
    <div class="ideal-row">
      <div>
        <div style="font-size:13px;font-weight:600">Devine</div>
        <div class="ideal-formula">Công thức Devine</div>
      </div>
      <div class="ideal-range">${fmt1(iw.devine)} kg</div>
    </div>
    <div class="ideal-row">
      <div>
        <div style="font-size:13px;font-weight:600">Robinson</div>
        <div class="ideal-formula">Công thức Robinson</div>
      </div>
      <div class="ideal-range">${fmt1(iw.robinson)} kg</div>
    </div>
    <div class="ideal-row">
      <div>
        <div style="font-size:13px;font-weight:600">Miller</div>
        <div class="ideal-formula">Công thức Miller</div>
      </div>
      <div class="ideal-range">${fmt1(iw.miller)} kg</div>
    </div>
  `;

  // Tips
  const allTips = {
    "row-under": [
      { icon: "🥩", text: "Ăn thêm protein: thịt, cá, trứng, đậu phụ mỗi bữa" },
      { icon: "🥑", text: "Thêm chất béo lành mạnh: bơ, dầu ô-liu, các loại hạt" },
      { icon: "🍚", text: "Ăn nhiều bữa nhỏ thay vì 3 bữa lớn trong ngày" },
      { icon: "🏋️", text: "Tập tạ để tăng cơ thay vì chỉ tăng mỡ" },
    ],
    "row-normal": [
      { icon: "🥗", text: "Duy trì chế độ ăn đa dạng, đủ rau xanh và trái cây" },
      { icon: "🏃", text: "30 phút vận động cường độ vừa ít nhất 5 ngày/tuần" },
      { icon: "💧", text: "Uống đủ 2–2.5L nước mỗi ngày" },
      { icon: "😴", text: "Ngủ đủ 7–9 giờ mỗi đêm để duy trì trao đổi chất" },
    ],
    "row-over": [
      { icon: "🥦", text: "Tăng rau xanh, giảm tinh bột và đường đơn" },
      { icon: "🚶", text: "Đi bộ nhanh 45 phút mỗi ngày là đủ để bắt đầu" },
      { icon: "🍽️", text: "Ăn chậm, nhai kỹ — no hơn với ít calo hơn" },
      { icon: "📉", text: "Mục tiêu giảm 0.5–1 kg/tuần là tốc độ an toàn" },
    ],
    "row-obese": [
      { icon: "👨‍⚕️", text: "Tham khảo bác sĩ trước khi bắt đầu chương trình giảm cân" },
      { icon: "🥗", text: "Ưu tiên thực phẩm ít calo, nhiều chất xơ và protein nạc" },
      { icon: "🏊", text: "Bơi lội hoặc đi bộ ít tác động lên khớp — phù hợp để bắt đầu" },
      { icon: "📱", text: "Theo dõi calo hằng ngày với app để có ý thức hơn về khẩu phần" },
    ],
  };

  document.getElementById("tips-list").innerHTML = allTips[cat.rowId].map((t) => `<div class="tip-item"><span class="tip-icon">${t.icon}</span><span>${t.text}</span></div>`).join("");

  // Save to history
  const history = loadHistory();
  history.unshift({
    bmi: parseFloat(fmt1(bmi)),
    cat: cat.label,
    color: cat.color,
    date: new Date().toLocaleDateString("vi-VN", { day: "numeric", month: "short", year: "numeric" }),
    ts: Date.now(),
  });
  saveHistory(history.slice(0, 10));
  renderHistory();
}

// ─── History ──────────────────────────────────────────────────────────────
function renderHistory() {
  const history = loadHistory();
  const el = document.getElementById("history-list");
  if (history.length === 0) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-3)">Chưa có lịch sử tính toán</div>';
    return;
  }
  el.innerHTML = history
    .map(
      (h) => `
    <div class="history-item">
      <div class="history-dot" style="background:${h.color}"></div>
      <span class="history-bmi">${h.bmi}</span>
      <span style="color:var(--text-2);font-size:11px">${h.cat}</span>
      <span class="history-date">${h.date}</span>
    </div>
  `,
    )
    .join("");
}

document.getElementById("clear-history").addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
  toast("Đã xóa lịch sử");
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
renderHistory();
["age-slider", "height-slider", "weight-slider"].forEach(updateSliderFill);
