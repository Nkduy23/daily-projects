"use strict";

// ─── Slider Class ─────────────────────────────────────────────────────────
class Slider {
  constructor(opts = {}) {
    const {
      track, // .slider-track element
      prevBtn,
      nextBtn,
      dotsContainer,
      total, // number of slides
      autoplay = false,
      autoplayMs = 4000,
      loop = true,
      onChange = null,
      progressBar = null,
      autoplayBtn = null,
    } = opts;

    this.track = track;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.dotsEl = dotsContainer;
    this.total = total;
    this.loop = loop;
    this.onChange = onChange;
    this.progressBar = progressBar;
    this.autoplayBtn = autoplayBtn;
    this.autoplayMs = autoplayMs;

    this.current = 0;
    this.autoplayTimer = null;
    this.isPlaying = false;

    // Touch state
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isDragging = false;
    this.dragOffset = 0;

    this._buildDots();
    this._bindEvents();

    if (autoplay) this.play();
    this._update();
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  go(idx) {
    if (this.loop) {
      this.current = ((idx % this.total) + this.total) % this.total;
    } else {
      this.current = Math.max(0, Math.min(this.total - 1, idx));
    }
    this._update();
    if (this.onChange) this.onChange(this.current);
  }

  next() {
    this.go(this.current + 1);
  }
  prev() {
    this.go(this.current - 1);
  }

  // ── Autoplay ────────────────────────────────────────────────────────────
  play() {
    this.isPlaying = true;
    this._startAutoplay();
    this._updateAutoplayBtn();
  }

  pause() {
    this.isPlaying = false;
    clearInterval(this.autoplayTimer);
    if (this.progressBar) {
      this.progressBar.style.transition = "none";
      this.progressBar.style.width = "0%";
    }
    this._updateAutoplayBtn();
  }

  toggle() {
    this.isPlaying ? this.pause() : this.play();
  }

  _startAutoplay() {
    clearInterval(this.autoplayTimer);

    if (this.progressBar) {
      this.progressBar.style.transition = "none";
      this.progressBar.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.progressBar.style.transition = `width ${this.autoplayMs}ms linear`;
          this.progressBar.style.width = "100%";
        });
      });
    }

    this.autoplayTimer = setInterval(() => {
      this.next();
      if (this.progressBar && this.isPlaying) {
        this.progressBar.style.transition = "none";
        this.progressBar.style.width = "0%";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.progressBar.style.transition = `width ${this.autoplayMs}ms linear`;
            this.progressBar.style.width = "100%";
          });
        });
      }
    }, this.autoplayMs);
  }

  _updateAutoplayBtn() {
    if (!this.autoplayBtn) return;
    this.autoplayBtn.querySelector(".play-icon").style.display = this.isPlaying ? "none" : "";
    this.autoplayBtn.querySelector(".pause-icon").style.display = this.isPlaying ? "" : "none";
  }

  // ── Update DOM ──────────────────────────────────────────────────────────
  _update() {
    if (this.track) {
      this.track.style.transform = `translateX(-${this.current * 100}%)`;
    }
    this._updateDots();

    if (this.prevBtn) this.prevBtn.style.opacity = !this.loop && this.current === 0 ? "0.3" : "";
    if (this.nextBtn) this.nextBtn.style.opacity = !this.loop && this.current === this.total - 1 ? "0.3" : "";
  }

  // ── Dots ────────────────────────────────────────────────────────────────
  _buildDots() {
    if (!this.dotsEl) return;
    this.dotsEl.innerHTML = "";
    for (let i = 0; i < this.total; i++) {
      const btn = document.createElement("button");
      btn.className = "dot" + (i === 0 ? " active" : "");
      btn.addEventListener("click", () => this.go(i));
      this.dotsEl.appendChild(btn);
    }
  }

  _updateDots() {
    if (!this.dotsEl) return;
    this.dotsEl.querySelectorAll(".dot").forEach((d, i) => {
      d.classList.toggle("active", i === this.current);
    });
  }

  // ── Events ──────────────────────────────────────────────────────────────
  _bindEvents() {
    if (this.prevBtn)
      this.prevBtn.addEventListener("click", () => {
        this.prev();
        if (this.isPlaying) this._startAutoplay();
      });
    if (this.nextBtn)
      this.nextBtn.addEventListener("click", () => {
        this.next();
        if (this.isPlaying) this._startAutoplay();
      });
    if (this.autoplayBtn) this.autoplayBtn.addEventListener("click", () => this.toggle());

    // Touch / mouse drag
    const el = this.track?.parentElement || this.track;
    if (!el) return;

    el.addEventListener("touchstart", (e) => this._dragStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener("touchmove", (e) => this._dragMove(e.touches[0].clientX), { passive: true });
    el.addEventListener("touchend", (e) => this._dragEnd(), { passive: true });
    el.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.touchStartX = e.clientX;
      el.style.cursor = "grabbing";
    });
    el.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      this._dragMove(e.clientX);
    });
    el.addEventListener("mouseup", (e) => {
      this._dragEnd();
      el.style.cursor = "";
    });
    el.addEventListener("mouseleave", (e) => {
      if (this.isDragging) {
        this._dragEnd();
        el.style.cursor = "";
      }
    });

    // Pause on hover
    el.addEventListener("mouseenter", () => {
      if (this.isPlaying) {
        clearInterval(this.autoplayTimer);
        if (this.progressBar) this.progressBar.style.animationPlayState = "paused";
      }
    });
    el.addEventListener("mouseleave", () => {
      if (this.isPlaying) this._startAutoplay();
    });

    // Keyboard
    el.setAttribute("tabindex", "0");
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.prev();
      if (e.key === "ArrowRight") this.next();
    });
  }

  _dragStart(x, y) {
    this.isDragging = true;
    this.touchStartX = x;
    this.touchStartY = y;
  }

  _dragMove(x) {
    if (!this.isDragging) return;
    this.dragOffset = x - this.touchStartX;
  }

  _dragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    const threshold = 50;
    if (this.dragOffset < -threshold) {
      this.next();
      if (this.isPlaying) this._startAutoplay();
    } else if (this.dragOffset > threshold) {
      this.prev();
      if (this.isPlaying) this._startAutoplay();
    }
    this.dragOffset = 0;
  }
}

// ─── Fade Slider ──────────────────────────────────────────────────────────
class FadeSlider {
  constructor({ slides, prevBtn, nextBtn, dotsContainer }) {
    this.slides = Array.from(slides);
    this.total = this.slides.length;
    this.current = 0;

    this._buildDots(dotsContainer);
    if (prevBtn) prevBtn.addEventListener("click", () => this.prev());
    if (nextBtn) nextBtn.addEventListener("click", () => this.next());

    // Touch
    const wrap = this.slides[0]?.parentElement?.parentElement;
    if (wrap) {
      let sx = 0;
      wrap.addEventListener(
        "touchstart",
        (e) => {
          sx = e.touches[0].clientX;
        },
        { passive: true },
      );
      wrap.addEventListener(
        "touchend",
        (e) => {
          const dx = e.changedTouches[0].clientX - sx;
          if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
        },
        { passive: true },
      );
    }
  }

  go(idx) {
    this.slides[this.current].classList.remove("active");
    this.current = ((idx % this.total) + this.total) % this.total;
    this.slides[this.current].classList.add("active");
    this._updateDots();
  }

  next() {
    this.go(this.current + 1);
  }
  prev() {
    this.go(this.current - 1);
  }

  _buildDots(el) {
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < this.total; i++) {
      const btn = document.createElement("button");
      btn.className = "dot" + (i === 0 ? " active" : "");
      btn.addEventListener("click", () => this.go(i));
      el.appendChild(btn);
    }
  }

  _updateDots() {
    document.querySelectorAll("#fade-dots .dot").forEach((d, i) => d.classList.toggle("active", i === this.current));
  }
}

// ─── Card Multi-item Slider ───────────────────────────────────────────────
class CardSlider {
  constructor({ track, prevBtn, nextBtn, dotsContainer, itemsVisible = 3 }) {
    this.track = track;
    this.items = Array.from(track.children);
    this.total = this.items.length;
    this.itemsVisible = itemsVisible;
    this.current = 0;
    this.maxIdx = Math.max(0, this.total - this.itemsVisible);
    this.dotsEl = dotsContainer;

    this._buildDots();
    if (prevBtn) prevBtn.addEventListener("click", () => this.go(this.current - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => this.go(this.current + 1));

    // Touch
    let sx = 0;
    track.parentElement.addEventListener(
      "touchstart",
      (e) => {
        sx = e.touches[0].clientX;
      },
      { passive: true },
    );
    track.parentElement.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 50) dx < 0 ? this.go(this.current + 1) : this.go(this.current - 1);
      },
      { passive: true },
    );
    let msx = 0,
      dragging = false;
    track.parentElement.addEventListener("mousedown", (e) => {
      dragging = true;
      msx = e.clientX;
    });
    track.parentElement.addEventListener("mouseup", (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - msx;
      if (Math.abs(dx) > 50) dx < 0 ? this.go(this.current + 1) : this.go(this.current - 1);
    });

    this._update();
  }

  go(idx) {
    this.current = Math.max(0, Math.min(this.maxIdx, idx));
    this._update();
  }

  _update() {
    // Each item takes (100/itemsVisible)% width minus gap compensation
    const itemW = this.track.parentElement.offsetWidth / this.itemsVisible;
    const gapW = 16; // matches CSS gap
    const offset = this.current * (itemW + gapW / this.itemsVisible - gapW / this.total);
    this.track.style.transform = `translateX(-${this.current * (100 / this.itemsVisible)}%)`;

    // Use percentage-based offset with gap
    const pct = this.current * (100 / this.itemsVisible);
    const gapPx = this.current * 16;
    this.track.style.transform = `translateX(calc(-${pct}% - ${gapPx}px))`;

    this._updateDots();
  }

  _buildDots() {
    if (!this.dotsEl) return;
    this.dotsEl.innerHTML = "";
    for (let i = 0; i <= this.maxIdx; i++) {
      const btn = document.createElement("button");
      btn.className = "dot" + (i === 0 ? " active" : "");
      btn.addEventListener("click", () => this.go(i));
      this.dotsEl.appendChild(btn);
    }
  }

  _updateDots() {
    if (!this.dotsEl) return;
    this.dotsEl.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === this.current));
  }
}

// ─── Thumbnail Slider ─────────────────────────────────────────────────────
class ThumbSlider extends Slider {
  constructor(opts) {
    super({ ...opts, autoplay: false });
    this.thumbList = opts.thumbList;
    this.thumbData = opts.thumbData;
    this._buildThumbs();
  }

  _buildThumbs() {
    if (!this.thumbList) return;
    this.thumbList.innerHTML = "";
    this.thumbData.forEach((d, i) => {
      const el = document.createElement("div");
      el.className = "thumb" + (i === 0 ? " active" : "");
      el.innerHTML = `<div class="thumb-inner" style="background:${d.bg}"></div>`;
      el.addEventListener("click", () => this.go(i));
      this.thumbList.appendChild(el);
    });
  }

  _update() {
    super._update();
    if (!this.thumbList) return;
    this.thumbList.querySelectorAll(".thumb").forEach((t, i) => {
      t.classList.toggle("active", i === this.current);
    });
    // Scroll active thumb into view
    const active = this.thumbList.querySelectorAll(".thumb")[this.current];
    if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

// ─── Init sliders ─────────────────────────────────────────────────────────

// Hero slider
const heroSlider = new Slider({
  track: document.getElementById("hero-track"),
  prevBtn: document.getElementById("hero-prev"),
  nextBtn: document.getElementById("hero-next"),
  dotsContainer: document.getElementById("hero-dots"),
  total: 4,
  autoplay: true,
  autoplayMs: 4500,
  progressBar: document.getElementById("hero-progress"),
  autoplayBtn: document.getElementById("hero-autoplay"),
});

// Thumbnail slider
const thumbData = [
  { bg: "linear-gradient(135deg,#0F172A,#1E40AF)" },
  { bg: "linear-gradient(135deg,#14532D,#16A34A)" },
  { bg: "linear-gradient(135deg,#7C2D12,#DC2626)" },
  { bg: "linear-gradient(135deg,#0C4A6E,#0EA5E9)" },
  { bg: "linear-gradient(135deg,#4A1D96,#A855F7)" },
];

const thumbSlider = new ThumbSlider({
  track: document.getElementById("thumb-track"),
  prevBtn: document.getElementById("thumb-prev"),
  nextBtn: document.getElementById("thumb-next"),
  dotsContainer: null,
  total: 5,
  thumbList: document.getElementById("thumb-list"),
  thumbData,
});

// Card slider (3 visible)
const cardSlider = new CardSlider({
  track: document.getElementById("cards-track"),
  prevBtn: document.getElementById("cards-prev"),
  nextBtn: document.getElementById("cards-next"),
  dotsContainer: document.getElementById("cards-dots"),
  itemsVisible: window.innerWidth < 640 ? 1 : 3,
});

// Fade slider
const fadeSlider = new FadeSlider({
  slides: document.querySelectorAll("#fade-track .fade-slide"),
  prevBtn: document.getElementById("fade-prev"),
  nextBtn: document.getElementById("fade-next"),
  dotsContainer: document.getElementById("fade-dots"),
});

// Keyboard navigation (global for demo — production: scope to focused slider)
document.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.key === "ArrowLeft") heroSlider.prev();
  if (e.key === "ArrowRight") heroSlider.next();
});

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
