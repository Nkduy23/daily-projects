"use strict";

// ─── Constants ────────────────────────────────────────────────────────────
const RING_CIRC = 2 * Math.PI * 96; // ≈ 603.19

const MODE_META = {
  pomodoro: { label: "Tập trung", color: "#C0392B", defaultMin: 25 },
  short: { label: "Nghỉ ngắn", color: "#2980B9", defaultMin: 5 },
  long: { label: "Nghỉ dài", color: "#8E44AD", defaultMin: 15 },
};

// ─── Storage ──────────────────────────────────────────────────────────────
const SETTINGS_KEY = "pomo_settings_v1";
const STATS_KEY = "pomo_stats_v1";

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(statsStore));
}

// ─── State ────────────────────────────────────────────────────────────────
const saved = loadSettings();

const settings = {
  pomodoro: saved.pomodoro || 25,
  short: saved.short || 5,
  long: saved.long || 15,
  longInterval: saved.longInterval || 4,
  autoBreak: saved.autoBreak || false,
  autoPomo: saved.autoPomo || false,
};

let statsStore = loadStats(); // { 'YYYY-MM-DD': { pomodoros, focusMin, breaks } }

let mode = "pomodoro";
let totalSec = settings.pomodoro * 60;
let remainSec = totalSec;
let running = false;
let intervalId = null;
let sessionCount = 0; // pomodoros done this "set"
let soundOn = true;
let sessionLog = []; // today's log entries
let sessionStart = null; // Date when current session started

// ─── Helpers ──────────────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function todayStats() {
  const k = todayKey();
  if (!statsStore[k]) statsStore[k] = { pomodoros: 0, focusMin: 0, breaks: 0 };
  return statsStore[k];
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function fmtTime(sec) {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

function fmtTimeShort(ts) {
  return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Audio ────────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBeep(freq = 880, dur = 0.15, vol = 0.4) {
  if (!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playDone() {
  // three ascending beeps
  [0, 0.18, 0.36].forEach((delay, i) => {
    setTimeout(() => playBeep(660 + i * 110, 0.2, 0.35), delay * 1000);
  });
}

function playTick() {
  playBeep(1200, 0.04, 0.08);
}

// ─── Ring ─────────────────────────────────────────────────────────────────
function updateRing() {
  const pct = totalSec > 0 ? remainSec / totalSec : 0;
  const offset = RING_CIRC * (1 - pct);
  document.getElementById("ring-progress").style.strokeDashoffset = offset;
}

// ─── Mode ─────────────────────────────────────────────────────────────────
function setMode(m, auto = false) {
  if (running && !auto) return; // don't switch mid-run unless auto
  if (running) pause();

  mode = m;
  totalSec = settings[m] * 60;
  remainSec = totalSec;

  const meta = MODE_META[m];
  const clr = meta.color;

  // Update CSS variable
  document.documentElement.style.setProperty("--clr-current", clr);

  // Tabs
  document.querySelectorAll(".mode-tab").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));

  // Label + display
  document.getElementById("timer-label").textContent = meta.label;
  document.getElementById("timer-display").textContent = fmtTime(remainSec);

  // Nav mark colour
  document.querySelector(".nav-logo-mark").style.background = clr;

  updateRing();
  updateDocTitle();

  if (auto && (m === "pomodoro" ? settings.autoPomo : settings.autoBreak)) {
    start();
  }
}

// ─── Timer ────────────────────────────────────────────────────────────────
function start() {
  if (running) return;
  running = true;
  sessionStart = sessionStart || Date.now();

  document.getElementById("play-icon").style.display = "none";
  document.getElementById("pause-icon").style.display = "";

  intervalId = setInterval(tick, 1000);
  playBeep(440, 0.1);
}

function pause() {
  if (!running) return;
  running = false;
  clearInterval(intervalId);
  document.getElementById("play-icon").style.display = "";
  document.getElementById("pause-icon").style.display = "none";
}

function tick() {
  if (remainSec <= 0) {
    onComplete();
    return;
  }
  remainSec--;
  document.getElementById("timer-display").textContent = fmtTime(remainSec);
  updateRing();
  updateDocTitle();
  if (remainSec <= 3 && remainSec > 0) playTick();
}

function reset() {
  pause();
  remainSec = totalSec;
  sessionStart = null;
  document.getElementById("timer-display").textContent = fmtTime(remainSec);
  updateRing();
  updateDocTitle();
}

function skip() {
  pause();
  onComplete(true);
}

function onComplete(skipped = false) {
  pause();

  const isPomodoro = mode === "pomodoro";
  const task = document.getElementById("current-task").value.trim();
  const elapsed = sessionStart ? Math.round((Date.now() - sessionStart) / 1000) : totalSec;
  sessionStart = null;

  if (isPomodoro && !skipped) {
    // record pomodoro
    sessionCount++;
    const ts = todayStats();
    ts.pomodoros++;
    ts.focusMin += Math.round(elapsed / 60);
    saveStats();

    sessionLog.unshift({
      type: "pomodoro",
      task: task || "Focus session",
      duration: elapsed,
      time: Date.now(),
    });

    renderLog();
    updateStats();
    renderDots();
    playDone();
    toast("🍅 Pomodoro hoàn thành! Nghỉ một chút nào.");

    // notify
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Pomo", { body: "Pomodoro xong! Nghỉ ngơi đi bạn 🎉", icon: "" });
    }

    // decide next break
    const nextMode = sessionCount % settings.longInterval === 0 ? "long" : "short";
    setMode(nextMode, true);
  } else if (!isPomodoro && !skipped) {
    // break done
    const ts = todayStats();
    ts.breaks++;
    saveStats();

    sessionLog.unshift({
      type: "break",
      task: "",
      duration: elapsed,
      time: Date.now(),
    });

    renderLog();
    updateStats();
    playDone();
    toast("☕ Nghỉ xong! Sẵn sàng tập trung chưa?");
    setMode("pomodoro", true);
  } else if (skipped) {
    // skipped — just move on
    if (isPomodoro) {
      const nextMode = sessionCount % settings.longInterval === 0 ? "long" : "short";
      setMode(nextMode, false);
    } else {
      setMode("pomodoro", false);
    }
  }

  updateDocTitle();
}

// ─── Document title ───────────────────────────────────────────────────────
function updateDocTitle() {
  document.title = running ? `${fmtTime(remainSec)} · Pomo` : "Pomo — Pomodoro Timer";
}

// ─── Session dots ─────────────────────────────────────────────────────────
function renderDots() {
  const wrap = document.getElementById("session-dots");
  const n = settings.longInterval;
  wrap.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    const completed = i < (sessionCount % n || (sessionCount > 0 && sessionCount % n === 0 ? n : 0));
    d.className = "dot" + (i < sessionCount % n ? " done" : mode === "pomodoro" && running && i === sessionCount % n ? " current" : "");
    wrap.appendChild(d);
  }
}

// ─── Stats display ────────────────────────────────────────────────────────
function updateStats() {
  const ts = todayStats();
  document.getElementById("s-pomodoros").textContent = ts.pomodoros;
  document.getElementById("s-focus-time").textContent = ts.focusMin >= 60 ? `${Math.floor(ts.focusMin / 60)}h${ts.focusMin % 60}m` : `${ts.focusMin}m`;
  document.getElementById("s-breaks").textContent = ts.breaks;

  // streak: consecutive days with at least 1 pomodoro
  let streak = 0;
  const cur = new Date();
  while (true) {
    const k = cur.toISOString().slice(0, 10);
    const day = statsStore[k];
    if (day && day.pomodoros > 0) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  document.getElementById("s-streak").textContent = streak;
  document.getElementById("streak-count").textContent = streak;
}

// ─── Weekly chart ─────────────────────────────────────────────────────────
function renderWeeklyChart() {
  const chart = document.getElementById("weekly-chart");
  const labels = document.getElementById("weekly-labels");
  chart.innerHTML = "";
  labels.innerHTML = "";

  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const today = new Date();
  const todayK = today.toISOString().slice(0, 10);

  const vals = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    vals.push({ key: k, day: days[d.getDay()], isToday: k === todayK });
  }

  const max = Math.max(1, ...vals.map((v) => (statsStore[v.key] || {}).pomodoros || 0));

  vals.forEach((v) => {
    const count = (statsStore[v.key] || {}).pomodoros || 0;
    const pct = count / max;

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar" + (v.isToday ? " today" : count > 0 ? " has-data" : "");
    bar.style.height = Math.max(3, Math.round(pct * 56)) + "px";
    bar.title = `${count} pomodoro`;
    wrap.appendChild(bar);
    chart.appendChild(wrap);

    const lbl = document.createElement("div");
    lbl.className = "week-lbl" + (v.isToday ? " today" : "");
    lbl.textContent = v.isToday ? "Hôm nay" : v.day;
    labels.appendChild(lbl);
  });
}

// ─── Session log ──────────────────────────────────────────────────────────
function renderLog() {
  const el = document.getElementById("log-list");
  if (sessionLog.length === 0) {
    el.innerHTML = '<div class="log-empty">Chưa có session nào hôm nay</div>';
    return;
  }
  el.innerHTML = sessionLog
    .map((entry) => {
      const icon = entry.type === "pomodoro" ? "🍅" : "☕";
      const dur = entry.duration >= 60 ? `${Math.floor(entry.duration / 60)}m ${entry.duration % 60}s` : `${entry.duration}s`;
      return `<div class="log-item">
      <span class="log-icon">${icon}</span>
      <div class="log-body">
        <div class="log-task">${entry.task || (entry.type === "break" ? "Nghỉ ngơi" : "Focus session")}</div>
        <div class="log-meta">${fmtTimeShort(entry.time)}</div>
      </div>
      <span class="log-duration">${dur}</span>
    </div>`;
    })
    .join("");
}

// ─── Settings panel ───────────────────────────────────────────────────────
function openSettings() {
  document.getElementById("set-pomodoro").value = settings.pomodoro;
  document.getElementById("set-short").value = settings.short;
  document.getElementById("set-long").value = settings.long;
  document.getElementById("set-long-interval").value = settings.longInterval;
  document.getElementById("set-auto-break").checked = settings.autoBreak;
  document.getElementById("set-auto-pomo").checked = settings.autoPomo;
  document.getElementById("settings-backdrop").classList.add("open");
}

function closeSettings() {
  document.getElementById("settings-backdrop").classList.remove("open");
}

function applySettings() {
  settings.pomodoro = Math.max(1, Math.min(99, +document.getElementById("set-pomodoro").value || 25));
  settings.short = Math.max(1, Math.min(60, +document.getElementById("set-short").value || 5));
  settings.long = Math.max(1, Math.min(60, +document.getElementById("set-long").value || 15));
  settings.longInterval = Math.max(2, Math.min(10, +document.getElementById("set-long-interval").value || 4));
  settings.autoBreak = document.getElementById("set-auto-break").checked;
  settings.autoPomo = document.getElementById("set-auto-pomo").checked;

  saveSettings();
  closeSettings();

  // apply to current mode if not running
  if (!running) {
    totalSec = settings[mode] * 60;
    remainSec = totalSec;
    document.getElementById("timer-display").textContent = fmtTime(remainSec);
    updateRing();
  }

  renderDots();
  toast("Đã lưu cài đặt ✓");
}

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ─── Event wiring ─────────────────────────────────────────────────────────
// Start/pause
document.getElementById("start-btn").addEventListener("click", () => {
  // unlock audio on first interaction
  try {
    getAudioCtx().resume();
  } catch {}
  running ? pause() : start();
});

document.getElementById("reset-btn").addEventListener("click", reset);
document.getElementById("skip-btn").addEventListener("click", skip);

// Mode tabs
document.querySelectorAll(".mode-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!running) setMode(btn.dataset.mode);
  });
});

// Sound
document.getElementById("sound-btn").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("sound-icon-on").style.display = soundOn ? "" : "none";
  document.getElementById("sound-icon-off").style.display = soundOn ? "none" : "";
  document.getElementById("sound-btn").classList.toggle("active", !soundOn);
  toast(soundOn ? "🔊 Âm thanh bật" : "🔇 Âm thanh tắt");
});

// Settings
document.getElementById("settings-btn").addEventListener("click", openSettings);
document.getElementById("settings-close").addEventListener("click", closeSettings);
document.getElementById("save-settings-btn").addEventListener("click", applySettings);

document.getElementById("settings-backdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("settings-backdrop")) closeSettings();
});

// Num +/− buttons in settings
document.querySelectorAll(".num-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const delta = +btn.dataset.delta;
    const val = Math.max(+input.min, Math.min(+input.max, +input.value + delta));
    input.value = val;
  });
});

// Clear log
document.getElementById("clear-log-btn").addEventListener("click", () => {
  sessionLog = [];
  renderLog();
  toast("Đã xóa lịch sử");
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    running ? pause() : start();
  }
  if (e.key === "r" || e.key === "R") reset();
  if (e.key === "s" || e.key === "S") openSettings();
});

// Notification permission
if ("Notification" in window && Notification.permission === "default") {
  document.getElementById("start-btn").addEventListener(
    "click",
    () => {
      Notification.requestPermission();
    },
    { once: true },
  );
}

// ─── Init ─────────────────────────────────────────────────────────────────
setMode("pomodoro");
renderDots();
updateStats();
renderWeeklyChart();
renderLog();

// refresh weekly chart every minute
setInterval(renderWeeklyChart, 60000);
